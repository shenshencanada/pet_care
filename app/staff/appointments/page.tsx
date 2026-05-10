import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, PawPrint, Search } from "lucide-react";
import { getPool } from "../../../lib/db";
import { getCurrentStaffUserResult } from "../../../lib/staff-auth";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  AppointmentStatus,
  AppointmentView,
  isAppointmentStatus,
} from "../../../lib/appointments";
import { STAFF_SESSION_COOKIE } from "../../../lib/staff-session";
import {
  AppointmentCalendarBoard,
  CreateAppointmentButton,
  SearchAppointmentsView,
  TodayAppointmentsView,
} from "./AppointmentCalendarBoard";

type AppointmentRow = {
  id: string;
  source: "quick" | "full" | "staff";
  customer_id: string | null;
  pet_id: string | null;
  contact_name: string | null;
  phone: string | null;
  pet_name: string | null;
  pet_type: string | null;
  package_name: string | null;
  appointment_date: Date | string | null;
  appointment_time: string | null;
  customer_note: string | null;
  staff_note: string | null;
  status: AppointmentStatus;
  status_changed_at: Date | string;
  handled_by_staff_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type StaffAppointmentsPageProps = {
  searchParams?: Promise<{
    view?: string;
    week?: string;
    status?: string;
    q?: string;
  }>;
};

const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateValue(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function cleanSearchQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, 80);
}

function isValidSearchQuery(value: string) {
  if (!value) {
    return true;
  }

  if (/^\d+$/.test(value)) {
    return value.length >= 4;
  }

  return value.length >= 2;
}

function startOfWeek(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + offset);
  return start;
}

function formatDateLabel(date: Date) {
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function formatDateValue(value: Date | string | null) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function toAppointmentView(row: AppointmentRow): AppointmentView {
  return {
    id: row.id,
    source: row.source,
    customerId: row.customer_id,
    petId: row.pet_id,
    contactName: row.contact_name,
    phone: row.phone ?? "",
    petName: row.pet_name,
    petType: row.pet_type ?? "未填写宠物类型",
    packageName: row.package_name,
    appointmentDate: formatDateValue(row.appointment_date),
    appointmentTime: row.appointment_time?.slice(0, 5) ?? "",
    customerNote: row.customer_note,
    staffNote: row.staff_note,
    status: row.status,
    statusChangedAt: new Date(row.status_changed_at).toISOString(),
    handledByStaffName: row.handled_by_staff_name,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function buildWeekHref(week: string, status: string) {
  const params = new URLSearchParams();
  params.set("view", "week");
  params.set("week", week);

  if (status !== "all") {
    params.set("status", status);
  }

  return `/staff/appointments?${params.toString()}`;
}

function buildViewHref(view: "today" | "week", week: string, status: string) {
  return view === "today" ? "/staff/appointments?view=today" : buildWeekHref(week, status);
}

function buildClearSearchHref(view: "today" | "week", week: string, status: string) {
  return buildViewHref(view, week, status);
}

export default async function StaffAppointmentsPage({ searchParams }: StaffAppointmentsPageProps) {
  const cookieStore = await cookies();
  const currentUserResult = await getCurrentStaffUserResult(
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    if (currentUserResult.status === "inactive") {
      redirect("/api/staff/session/clear?from=/staff/appointments");
    }

    redirect("/staff/login?from=/staff/appointments");
  }

  const params = (await searchParams) ?? {};
  const selectedView = params.view === "week" ? "week" : "today";
  const selectedStatus = params.status && isAppointmentStatus(params.status) ? params.status : "all";
  const searchQuery = cleanSearchQuery(params.q);
  const isSearching = Boolean(searchQuery);
  const searchError = searchQuery && !isValidSearchQuery(searchQuery)
    ? "请输入至少 2 个字符，手机号请至少输入 4 位数字。"
    : "";
  const today = new Date();
  const todayValue = toDateValue(today);
  const requestedWeek = parseDateValue(params.week);
  const weekStart = startOfWeek(requestedWeek ?? today);
  const weekEnd = addDays(weekStart, 6);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);
  const todayWeek = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);

    return {
      value: toDateValue(date),
      label: formatDateLabel(date),
      weekday: weekdayLabels[date.getUTCDay()],
    };
  });

  const searchFrom = toDateValue(addDays(today, -30));
  const searchTo = toDateValue(addDays(today, 90));
  const queryFrom = isSearching ? searchFrom : selectedView === "today" ? todayValue : toDateValue(weekStart);
  const queryTo = isSearching ? searchTo : selectedView === "today" ? todayValue : toDateValue(weekEnd);
  const queryParams: string[] = [queryFrom, queryTo];
  const statusCondition = !isSearching && selectedView === "week" && selectedStatus !== "all" ? "and a.status = $3" : "";
  const searchCondition =
    isSearching && !searchError
      ? `and (
           coalesce(a.contact_name, '') ilike $3
           or coalesce(a.phone, '') ilike $3
           or coalesce(p.name, '') ilike $3
           or coalesce(a.pet_type, '') ilike $3
           or coalesce(a.package_name, '') ilike $3
           or coalesce(a.customer_note, '') ilike $3
           or coalesce(a.staff_note, '') ilike $3
           or ($4 <> '' and regexp_replace(coalesce(a.phone, ''), '\\D', '', 'g') like $5)
         )`
      : "";
  const orderClause = isSearching
    ? "order by a.appointment_date desc, a.appointment_time asc, a.created_at desc limit 50"
    : "order by a.appointment_date asc, a.appointment_time asc, a.created_at asc";

  if (isSearching && !searchError) {
    const digitsQuery = searchQuery.replace(/\D/g, "");
    queryParams.push(`%${searchQuery}%`, digitsQuery, `%${digitsQuery}%`);
  } else if (selectedView === "week" && selectedStatus !== "all") {
    queryParams.push(selectedStatus);
  }

  const result = searchError
    ? { rows: [] as AppointmentRow[] }
    : await getPool().query<AppointmentRow>(
        `select
           a.id,
           a.source,
           a.customer_id,
           a.pet_id,
           a.contact_name,
           a.phone,
           p.name as pet_name,
           a.pet_type,
           a.package_name,
           a.appointment_date,
           a.appointment_time::text as appointment_time,
           a.customer_note,
           a.staff_note,
           a.status,
           a.status_changed_at,
           s.display_name as handled_by_staff_name,
           a.created_at,
           a.updated_at
         from public.appointments a
         left join public.staff_users s on s.id = a.handled_by_staff_id
         left join public.pets p on p.id = a.pet_id
         where a.appointment_date between $1::date and $2::date
         ${statusCondition}
         ${searchCondition}
         ${orderClause}`,
        queryParams,
      );
  const appointments = result.rows.map(toAppointmentView);
  const pendingCount = appointments.filter((appointment) => appointment.status === "pending").length;
  const confirmedCount = appointments.filter((appointment) => appointment.status === "confirmed").length;
  const arrivedCount = appointments.filter((appointment) => appointment.status === "arrived").length;

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
              <h1 className="m-0 text-[30px] font-extrabold leading-tight">预约管理</h1>
            </div>
          </div>

          <Link className="secondary-btn border-white/40" href="/staff">
            <ArrowLeft aria-hidden="true" />
            返回后台
          </Link>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="mb-6 rounded-card border border-line bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-mist text-teal">
                  <CalendarDays aria-hidden="true" />
                </span>
                <div>
                  <p className="m-0 text-sm font-bold text-coral">
                    {selectedView === "today"
                      ? formatDateLabel(today)
                      : `${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)}`}
                  </p>
                  <h2 className="mb-2 mt-1 text-[26px] font-extrabold leading-tight">
                    {selectedView === "today" ? "今日待处理" : "本周预约看板"}
                  </h2>
                  <p className="m-0 leading-[1.7] text-muted">
                    {isSearching
                      ? `搜索“${searchQuery}”找到 ${appointments.length} 条近期预约。`
                      : selectedView === "today"
                      ? `今日共 ${appointments.length} 条预约，待确认 ${pendingCount} 条，已确认 ${confirmedCount} 条，已到店 ${arrivedCount} 条。`
                      : `当前筛选下共 ${appointments.length} 条预约，待确认 ${pendingCount} 条，已确认 ${confirmedCount} 条。`}
                  </p>
                </div>
              </div>

              {selectedView === "week" ? (
                <div className="flex flex-wrap gap-2">
                  <Link className="secondary-btn border-line bg-white text-ink" href={buildWeekHref(toDateValue(previousWeek), selectedStatus)}>
                    <ChevronLeft aria-hidden="true" />
                    上一周
                  </Link>
                  <Link className="secondary-btn border-line bg-white text-ink" href={buildWeekHref(toDateValue(todayWeek), selectedStatus)}>
                    本周
                  </Link>
                  <Link className="secondary-btn border-line bg-white text-ink" href={buildWeekHref(toDateValue(nextWeek), selectedStatus)}>
                    下一周
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <div className="flex flex-1 flex-wrap gap-2">
              <Link
                className={`secondary-btn border-line ${selectedView === "today" ? "bg-ink text-white" : "bg-white text-ink"}`}
                href={buildViewHref("today", toDateValue(weekStart), selectedStatus)}
              >
                今日视图
              </Link>
              <Link
                className={`secondary-btn border-line ${selectedView === "week" ? "bg-ink text-white" : "bg-white text-ink"}`}
                href={buildViewHref("week", toDateValue(weekStart), selectedStatus)}
              >
                本周看板
              </Link>
            </div>
            <CreateAppointmentButton defaultDate={todayValue} />
          </div>

          <form className="mb-5 rounded-card border border-line bg-white p-4 shadow-soft" action="/staff/appointments">
            <input name="view" type="hidden" value={selectedView} />
            {selectedView === "week" ? (
              <>
                <input name="week" type="hidden" value={toDateValue(weekStart)} />
                {selectedStatus !== "all" ? <input name="status" type="hidden" value={selectedStatus} /> : null}
              </>
            ) : null}
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-[240px] flex-1 gap-2 text-sm font-bold text-muted">
                搜索预约
                <input
                  defaultValue={searchQuery}
                  name="q"
                  placeholder="输入手机号、联系人、宠物、套餐或备注"
                />
              </label>
              <button className="primary-btn" type="submit">
                <Search aria-hidden="true" />
                搜索
              </button>
              {isSearching ? (
                <Link
                  className="secondary-btn border-line bg-white text-ink"
                  href={buildClearSearchHref(selectedView, toDateValue(weekStart), selectedStatus)}
                >
                  清空
                </Link>
              ) : null}
            </div>
            {isSearching ? (
              <p className="mb-0 mt-3 text-sm font-bold text-muted">
                搜索范围：过去 30 天到未来 90 天，最多显示 50 条。
              </p>
            ) : null}
          </form>

          {!isSearching && selectedView === "week" ? (
            <div className="mb-5 flex flex-wrap gap-2">
            <Link
              className={`secondary-btn border-line ${selectedStatus === "all" ? "bg-ink text-white" : "bg-white text-ink"}`}
              href={buildWeekHref(toDateValue(weekStart), "all")}
            >
              全部状态
            </Link>
            {APPOINTMENT_STATUSES.map((status) => (
              <Link
                className={`secondary-btn border-line ${selectedStatus === status ? "bg-ink text-white" : "bg-white text-ink"}`}
                href={buildWeekHref(toDateValue(weekStart), status)}
                key={status}
              >
                {APPOINTMENT_STATUS_LABELS[status]}
              </Link>
            ))}
            </div>
          ) : null}

          {isSearching ? (
            <SearchAppointmentsView appointments={appointments} error={searchError} query={searchQuery} />
          ) : selectedView === "today" ? (
            <TodayAppointmentsView appointments={appointments} />
          ) : (
            <AppointmentCalendarBoard appointments={appointments} days={days} />
          )}
        </div>
      </section>
    </main>
  );
}
