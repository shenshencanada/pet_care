import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Bell,
  ClipboardList,
  ShieldCheck,
  KeyRound,
  LogOut,
  PawPrint,
  UsersRound,
} from "lucide-react";
import { getPool } from "../../lib/db";
import { getCurrentStaffUserResult } from "../../lib/staff-auth";
import { STAFF_SESSION_COOKIE } from "../../lib/staff-session";

const dashboardItems = [
  {
    title: "预约管理",
    description: "查看到店预约、确认时间和记录服务需求。",
    icon: CalendarDays,
    href: "/staff/appointments?view=today",
  },
  {
    title: "客户档案",
    description: "沉淀宠物信息、护理偏好和历史到店记录。",
    icon: UsersRound,
    href: "/staff/customers",
  },
  {
    title: "回访提醒",
    description: "跟进完成服务后的复购沟通和客户反馈。",
    icon: Bell,
    href: "/staff/follow-ups",
  },
  {
    title: "服务记录",
    description: "记录洗护流程、造型备注和交付反馈。",
    icon: ClipboardList,
  },
];

type AppointmentSummaryRow = {
  pending_count: string;
  confirmed_count: string;
};

type FollowUpSummaryRow = {
  due_today_count: string;
  overdue_count: string;
};

export default async function StaffDashboardPage() {
  const cookieStore = await cookies();
  const currentUserResult = await getCurrentStaffUserResult(
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    if (currentUserResult.status === "inactive") {
      redirect("/api/staff/session/clear?from=/staff");
    }

    redirect("/staff/login");
  }

  const currentUser = currentUserResult.user;
  const appointmentSummaryResult = await getPool().query<AppointmentSummaryRow>(
    `select
       count(*) filter (where status = 'pending')::text as pending_count,
       count(*) filter (where status = 'confirmed')::text as confirmed_count
     from public.appointments
     where appointment_date = current_date`,
  );
  const appointmentSummary = appointmentSummaryResult.rows[0] ?? {
    pending_count: "0",
    confirmed_count: "0",
  };
  const followUpSummaryResult = await getPool().query<FollowUpSummaryRow>(
    `select
       count(*) filter (where status = 'pending' and due_date = current_date)::text as due_today_count,
       count(*) filter (where status = 'pending' and due_date < current_date)::text as overdue_count
     from public.follow_ups`,
  );
  const followUpSummary = followUpSummaryResult.rows[0] ?? {
    due_today_count: "0",
    overdue_count: "0",
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="bg-ink px-5 py-8 text-white">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-teal">
              <PawPrint aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-sm font-bold text-white/70">泡泡爪宠物洗护</p>
              <h1 className="m-0 text-[30px] font-extrabold leading-tight">员工后台</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {currentUser.role === "admin" ? (
              <Link className="secondary-btn border-white/40" href="/staff/admin/users">
                <ShieldCheck aria-hidden="true" />
                员工管理
              </Link>
            ) : null}
            <Link className="secondary-btn border-white/40" href="/staff/password">
              <KeyRound aria-hidden="true" />
              修改密码
            </Link>
            <form action="/api/staff/logout" method="post">
              <button className="secondary-btn border-white/40" type="submit">
                <LogOut aria-hidden="true" />
                退出登录
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto w-full max-w-[1080px]">
          <div className="mb-6 rounded-card border border-line bg-white p-6 shadow-soft">
            <p className="m-0 text-sm font-bold text-coral">今日值班</p>
            <h2 className="mb-3 mt-2 text-[28px] font-extrabold leading-tight">
              欢迎回来，{currentUser.displayName}
            </h2>
            <p className="m-0 max-w-[640px] leading-[1.75] text-muted">
              员工登录闭环已经启用。后续可以在这里继续接入预约列表、客户资料和门店服务记录。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <span className="mb-4 grid h-11 w-11 place-items-center rounded-card bg-mist text-teal">
                    <Icon aria-hidden="true" />
                  </span>
                  <h3 className="m-0 text-xl font-extrabold">{item.title}</h3>
                  <p className="mb-0 mt-2 leading-[1.7] text-muted">{item.description}</p>
                  {item.title === "预约管理" ? (
                    <p className="mb-0 mt-4 text-sm font-bold text-coral">
                      今日待确认 {appointmentSummary.pending_count} 条 · 已确认{" "}
                      {appointmentSummary.confirmed_count} 条
                    </p>
                  ) : null}
                  {item.title === "回访提醒" ? (
                    <p className="mb-0 mt-4 text-sm font-bold text-coral">
                      今日待回访 {followUpSummary.due_today_count} 条 · 已逾期{" "}
                      {followUpSummary.overdue_count} 条
                    </p>
                  ) : null}
                </>
              );

              return item.href ? (
                <Link
                  className="rounded-card border border-line bg-white p-5 shadow-[0_12px_30px_rgba(23,33,31,0.08)] transition hover:-translate-y-px hover:border-teal"
                  href={item.href}
                  key={item.title}
                >
                  {content}
                </Link>
              ) : (
                <article
                  className="rounded-card border border-line bg-white p-5 shadow-[0_12px_30px_rgba(23,33,31,0.08)]"
                  key={item.title}
                >
                  {content}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
