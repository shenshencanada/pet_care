import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, PawPrint } from "lucide-react";
import {
  APPOINTMENT_STATUS_LABELS,
  AppointmentStatus,
  FollowUpStatus,
  isAppointmentStatus,
} from "../../../../lib/appointments";
import { getPool } from "../../../../lib/db";
import { getCurrentStaffUserResult } from "../../../../lib/staff-auth";
import { STAFF_SESSION_COOKIE } from "../../../../lib/staff-session";
import { CustomerFollowUpsPanel, CustomerProfilePanel } from "./CustomerProfilePanel";

type CustomerRow = {
  id: string;
  display_name: string | null;
  phone: string;
  wechat_id: string | null;
  note: string | null;
  created_at: Date | string;
};

type PetRow = {
  id: string;
  name: string | null;
  pet_type: string | null;
  breed: string | null;
  gender: string | null;
  age_text: string | null;
  weight_text: string | null;
  care_notes: string | null;
};

type AppointmentRow = {
  id: string;
  source: "quick" | "full" | "staff" | "api";
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
  handled_by_staff_name: string | null;
};

type FollowUpRow = {
  id: string;
  pet_id: string;
  pet_name: string | null;
  pet_type: string | null;
  due_date: Date | string;
  status: FollowUpStatus;
  contact_note: string | null;
  next_follow_up_date: Date | string | null;
};

type StaffCustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateValue(value: Date | string | null) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function getStatusLabel(value: string) {
  return isAppointmentStatus(value) ? APPOINTMENT_STATUS_LABELS[value] : value;
}

export default async function StaffCustomerDetailPage({ params }: StaffCustomerDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const currentUserResult = await getCurrentStaffUserResult(
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    if (currentUserResult.status === "inactive") {
      redirect(`/api/staff/session/clear?from=/staff/customers/${id}`);
    }

    redirect(`/staff/login?from=/staff/customers/${id}`);
  }

  const [customerResult, petsResult, appointmentsResult, followUpsResult] = await Promise.all([
    getPool().query<CustomerRow>(
      `select id, display_name, phone, wechat_id, note, created_at
       from public.customers
       where id = $1
       limit 1`,
      [id],
    ),
    getPool().query<PetRow>(
      `select id, name, pet_type, breed, gender, age_text, weight_text, care_notes
       from public.pets
       where customer_id = $1
       order by created_at asc`,
      [id],
    ),
    getPool().query<AppointmentRow>(
      `select
         a.id,
         a.source,
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
         s.display_name as handled_by_staff_name
       from public.appointments a
       left join public.pets p on p.id = a.pet_id
       left join public.staff_users s on s.id = a.handled_by_staff_id
       where a.customer_id = $1
       order by a.appointment_date desc, a.appointment_time desc, a.created_at desc`,
      [id],
    ),
    getPool().query<FollowUpRow>(
      `select
         f.id,
         f.pet_id,
         p.name as pet_name,
         p.pet_type,
         f.due_date,
         f.status,
         f.contact_note,
         f.next_follow_up_date
       from public.follow_ups f
       join public.pets p on p.id = f.pet_id
       where f.customer_id = $1
       order by
         case when f.status = 'pending' then 0 else 1 end,
         f.due_date asc,
         f.updated_at desc`,
      [id],
    ),
  ]);
  const customer = customerResult.rows[0];

  if (!customer) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="bg-ink px-5 py-8 text-white">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-teal">
              <PawPrint aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-sm font-bold text-white/70">客户档案</p>
              <h1 className="m-0 text-[30px] font-extrabold leading-tight">
                {customer.display_name || "未留称呼"}
              </h1>
            </div>
          </div>

          <Link className="secondary-btn border-white/40" href="/staff/customers">
            <ArrowLeft aria-hidden="true" />
            返回客户列表
          </Link>
        </div>
      </section>

      <section className="px-5 py-8">
        <div className="mx-auto grid w-full max-w-[1180px] gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-5">
            <CustomerProfilePanel
              customer={{
                id: customer.id,
                displayName: customer.display_name ?? "",
                phone: customer.phone,
                wechatId: customer.wechat_id ?? "",
                note: customer.note ?? "",
              }}
              pets={petsResult.rows.map((pet) => ({
                id: pet.id,
                name: pet.name ?? "",
                petType: pet.pet_type ?? "",
                breed: pet.breed ?? "",
                gender: pet.gender ?? "",
                ageText: pet.age_text ?? "",
                weightText: pet.weight_text ?? "",
                careNotes: pet.care_notes ?? "",
              }))}
            />

            <CustomerFollowUpsPanel
              customerId={customer.id}
              pets={petsResult.rows.map((pet) => ({
                id: pet.id,
                name: pet.name ?? "",
                petType: pet.pet_type ?? "",
                breed: pet.breed ?? "",
                gender: pet.gender ?? "",
                ageText: pet.age_text ?? "",
                weightText: pet.weight_text ?? "",
                careNotes: pet.care_notes ?? "",
              }))}
              followUps={followUpsResult.rows.map((followUp) => ({
                id: followUp.id,
                petId: followUp.pet_id,
                petName: followUp.pet_name ?? "",
                petType: followUp.pet_type ?? "",
                dueDate: formatDateValue(followUp.due_date),
                status: followUp.status,
                contactNote: followUp.contact_note ?? "",
                nextFollowUpDate: formatDateValue(followUp.next_follow_up_date),
              }))}
            />
          </div>

          <section className="rounded-card border border-line bg-white p-4 shadow-soft">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-sm font-bold text-coral">预约历史</p>
                <h2 className="mb-1 mt-1 text-2xl font-extrabold">{appointmentsResult.rows.length} 条记录</h2>
              </div>
              <CalendarDays className="text-teal" aria-hidden="true" />
            </div>

            <div className="grid gap-3">
              {appointmentsResult.rows.length ? (
                appointmentsResult.rows.map((appointment) => (
                  <article className="rounded-card border border-line bg-paper p-4" key={appointment.id}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-black text-teal">
                        {formatDateValue(appointment.appointment_date)} {appointment.appointment_time?.slice(0, 5)}
                      </span>
                      <span className="rounded-card bg-mist px-2 py-1 text-xs font-black text-teal">
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>
                    <h3 className="m-0 text-base font-extrabold">
                      {[appointment.pet_name, appointment.pet_type, appointment.package_name].filter(Boolean).join(" / ") ||
                        "未填写宠物信息"}
                    </h3>
                    <p className="mb-0 mt-2 text-sm font-bold text-muted">
                      {appointment.contact_name || "未留称呼"} · {appointment.phone || customer.phone}
                    </p>
                    {appointment.customer_note ? (
                      <p className="mb-0 mt-2 text-sm leading-[1.65] text-muted">客户备注：{appointment.customer_note}</p>
                    ) : null}
                    {appointment.staff_note ? (
                      <p className="mb-0 mt-2 text-sm leading-[1.65] text-muted">员工备注：{appointment.staff_note}</p>
                    ) : null}
                    {appointment.handled_by_staff_name ? (
                      <p className="mb-0 mt-2 text-xs font-bold text-muted">
                        上次处理：{appointment.handled_by_staff_name}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="m-0 rounded-card bg-paper px-4 py-8 text-center text-sm font-bold text-muted">
                  暂无预约历史
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
