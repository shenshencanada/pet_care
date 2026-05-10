import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, PawPrint } from "lucide-react";
import { FollowUpView } from "../../../lib/appointments";
import { getPool } from "../../../lib/db";
import { FOLLOW_UP_SELECT, toFollowUpView } from "../../../lib/follow-ups";
import { getCurrentStaffUserResult } from "../../../lib/staff-auth";
import { STAFF_SESSION_COOKIE } from "../../../lib/staff-session";
import { FollowUpsBoard } from "./FollowUpsBoard";

type FollowUpRow = Parameters<typeof toFollowUpView>[0];

function splitFollowUps(followUps: FollowUpView[]) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const sevenDaysLaterValue = sevenDaysLater.toISOString().slice(0, 10);

  return [
    {
      title: "已逾期",
      description: "需要优先处理",
      followUps: followUps.filter((item) => item.status === "pending" && item.dueDate < today),
    },
    {
      title: "今日待回访",
      description: "今天要联系",
      followUps: followUps.filter((item) => item.status === "pending" && item.dueDate === today),
    },
    {
      title: "未来 7 天",
      description: "提前准备",
      followUps: followUps.filter(
        (item) => item.status === "pending" && item.dueDate > today && item.dueDate <= sevenDaysLaterValue,
      ),
    },
    {
      title: "已处理",
      description: "最近处理记录",
      followUps: followUps.filter((item) => item.status !== "pending"),
    },
  ];
}

export default async function StaffFollowUpsPage() {
  const cookieStore = await cookies();
  const currentUserResult = await getCurrentStaffUserResult(
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    if (currentUserResult.status === "inactive") {
      redirect("/api/staff/session/clear?from=/staff/follow-ups");
    }

    redirect("/staff/login?from=/staff/follow-ups");
  }

  const result = await getPool().query<FollowUpRow>(
    `select ${FOLLOW_UP_SELECT}
     from public.follow_ups f
     join public.customers c on c.id = f.customer_id
     join public.pets p on p.id = f.pet_id
     left join public.appointments a on a.id = f.appointment_id
     left join public.staff_users s on s.id = f.handled_by_staff_id
     where (f.status = 'pending' and f.due_date <= current_date + interval '7 days')
        or f.status <> 'pending'
     order by
       case when f.status = 'pending' then 0 else 1 end,
       f.due_date asc,
       f.updated_at desc
     limit 160`,
  );
  const followUps = result.rows.map(toFollowUpView);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="bg-ink px-5 py-8 text-white">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-teal">
              <PawPrint aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-sm font-bold text-white/70">泡泡爪宠物洗护</p>
              <h1 className="m-0 text-[30px] font-extrabold leading-tight">回访提醒</h1>
            </div>
          </div>

          <Link className="secondary-btn border-white/40" href="/staff">
            <ArrowLeft aria-hidden="true" />
            返回后台
          </Link>
        </div>
      </section>

      <section className="px-5 py-8">
        <div className="mx-auto grid w-full max-w-[1180px] gap-5">
          <section className="rounded-card border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="m-0 text-sm font-bold text-coral">复购跟进</p>
                <h2 className="mb-1 mt-1 text-2xl font-extrabold">从完成服务自动生成 30 天回访</h2>
                <p className="m-0 text-sm font-bold text-muted">处理未接通、已联系、已预约和暂不需要的客户反馈。</p>
              </div>
              <Bell className="text-teal" aria-hidden="true" />
            </div>
          </section>

          <FollowUpsBoard sections={splitFollowUps(followUps)} />
        </div>
      </section>
    </main>
  );
}
