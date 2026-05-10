import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, PawPrint, Search, UsersRound } from "lucide-react";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus, isAppointmentStatus } from "../../../lib/appointments";
import { getPool } from "../../../lib/db";
import { getCurrentStaffUserResult } from "../../../lib/staff-auth";
import { STAFF_SESSION_COOKIE } from "../../../lib/staff-session";

type CustomerRow = {
  id: string;
  display_name: string | null;
  phone: string;
  wechat_id: string | null;
  pet_count: string;
  appointment_count: string;
  last_appointment_date: Date | string | null;
  last_status: string | null;
};

type StaffCustomersPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

function cleanSearchQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, 80);
}

function formatDateValue(value: Date | string | null) {
  if (!value) {
    return "暂无到店记录";
  }

  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function getStatusLabel(value: string | null) {
  return value && isAppointmentStatus(value) ? APPOINTMENT_STATUS_LABELS[value as AppointmentStatus] : "暂无状态";
}

export default async function StaffCustomersPage({ searchParams }: StaffCustomersPageProps) {
  const cookieStore = await cookies();
  const currentUserResult = await getCurrentStaffUserResult(
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    if (currentUserResult.status === "inactive") {
      redirect("/api/staff/session/clear?from=/staff/customers");
    }

    redirect("/staff/login?from=/staff/customers");
  }

  const params = (await searchParams) ?? {};
  const query = cleanSearchQuery(params.q);
  const queryParams: string[] = [];
  const searchCondition = query
    ? `where coalesce(c.display_name, '') ilike $1
        or coalesce(c.phone, '') ilike $1
        or coalesce(c.wechat_id, '') ilike $1
        or exists (
          select 1
          from public.pets p
          where p.customer_id = c.id
            and (coalesce(p.name, '') ilike $1 or coalesce(p.pet_type, '') ilike $1)
        )`
    : "";

  if (query) {
    queryParams.push(`%${query}%`);
  }

  const result = await getPool().query<CustomerRow>(
    `select
       c.id,
       c.display_name,
       c.phone,
       c.wechat_id,
       count(distinct p.id)::text as pet_count,
       count(distinct a.id)::text as appointment_count,
       max(a.appointment_date) as last_appointment_date,
       (array_agg(a.status order by a.appointment_date desc, a.appointment_time desc, a.created_at desc)
         filter (where a.id is not null))[1] as last_status
     from public.customers c
     left join public.pets p on p.customer_id = c.id
     left join public.appointments a on a.customer_id = c.id
     ${searchCondition}
     group by c.id
     order by max(a.appointment_date) desc nulls last, c.updated_at desc
     limit 80`,
    queryParams,
  );

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
              <h1 className="m-0 text-[30px] font-extrabold leading-tight">客户档案</h1>
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
          <form className="rounded-card border border-line bg-white p-4 shadow-soft" action="/staff/customers">
            <label className="grid gap-2 text-sm font-bold text-muted">
              搜索客户
              <div className="flex flex-wrap gap-3">
                <input
                  className="min-w-[240px] flex-1"
                  name="q"
                  defaultValue={query}
                  placeholder="姓名、手机号、微信号、宠物名"
                />
                <button className="primary-btn" type="submit">
                  <Search aria-hidden="true" />
                  搜索
                </button>
              </div>
            </label>
          </form>

          <section className="rounded-card border border-line bg-white p-4 shadow-soft">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="m-0 text-sm font-bold text-coral">客户列表</p>
                <h2 className="mb-1 mt-1 text-2xl font-extrabold">{query ? `“${query}”` : "全部客户"}</h2>
                <p className="m-0 text-sm font-bold text-muted">共显示 {result.rows.length} 位客户</p>
              </div>
              <UsersRound className="text-teal" aria-hidden="true" />
            </div>

            {result.rows.length ? (
              <>
                <div className="hidden overflow-x-auto rounded-card border border-line md:block">
                  <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                    <thead className="bg-mist text-xs font-black text-muted">
                      <tr>
                        <th className="px-4 py-3">客户</th>
                        <th className="px-4 py-3">联系方式</th>
                        <th className="px-4 py-3">宠物</th>
                        <th className="px-4 py-3">预约</th>
                        <th className="px-4 py-3">最近预约</th>
                        <th className="px-4 py-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((customer) => (
                        <tr className="border-t border-line transition hover:bg-paper" key={customer.id}>
                          <td className="px-4 py-3">
                            <Link className="font-extrabold text-ink hover:text-teal" href={`/staff/customers/${customer.id}`}>
                              {customer.display_name || "未留称呼"}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <p className="m-0 font-bold text-ink">{customer.phone}</p>
                            <p className="m-0 mt-1 text-xs font-bold text-muted">
                              {customer.wechat_id ? `微信：${customer.wechat_id}` : "未填写微信"}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-bold text-muted">{Number(customer.pet_count)} 只</td>
                          <td className="px-4 py-3 font-bold text-muted">{Number(customer.appointment_count)} 条</td>
                          <td className="px-4 py-3">
                            <p className="m-0 font-bold text-teal">{formatDateValue(customer.last_appointment_date)}</p>
                            <p className="m-0 mt-1 text-xs font-black text-coral">{getStatusLabel(customer.last_status)}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link className="text-sm font-black text-coral hover:text-teal" href={`/staff/customers/${customer.id}`}>
                              查看档案
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-2 md:hidden">
                  {result.rows.map((customer) => (
                    <Link
                      className="rounded-card border border-line bg-paper p-3 transition hover:border-teal"
                      href={`/staff/customers/${customer.id}`}
                      key={customer.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="m-0 text-base font-extrabold">{customer.display_name || "未留称呼"}</h3>
                          <p className="mb-0 mt-1 text-sm font-bold text-muted">{customer.phone}</p>
                        </div>
                        <span className="shrink-0 rounded-card bg-mist px-2 py-1 text-xs font-black text-teal">
                          {Number(customer.pet_count)} 只宠物
                        </span>
                      </div>
                      <p className="mb-0 mt-3 text-xs font-bold text-muted">
                        {Number(customer.appointment_count)} 条预约 · 最近 {formatDateValue(customer.last_appointment_date)} ·{" "}
                        {getStatusLabel(customer.last_status)}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <p className="m-0 rounded-card bg-paper px-4 py-8 text-center text-sm font-bold text-muted">
                暂无匹配客户
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
