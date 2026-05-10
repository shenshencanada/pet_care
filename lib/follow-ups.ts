import type { Pool, PoolClient } from "pg";
import type { FollowUpStatus, FollowUpView } from "./appointments";

type Queryable = Pick<Pool | PoolClient, "query">;

type FollowUpRow = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  phone: string;
  pet_id: string;
  pet_name: string | null;
  pet_type: string | null;
  appointment_id: string | null;
  appointment_date: Date | string | null;
  package_name: string | null;
  due_date: Date | string;
  status: FollowUpStatus;
  contact_note: string | null;
  next_follow_up_date: Date | string | null;
  booked_appointment_id: string | null;
  handled_by_staff_name: string | null;
  handled_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function formatDateValue(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function formatDateTimeValue(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export function toFollowUpView(row: FollowUpRow): FollowUpView {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    phone: row.phone,
    petId: row.pet_id,
    petName: row.pet_name,
    petType: row.pet_type ?? "未填写宠物类型",
    appointmentId: row.appointment_id,
    appointmentDate: formatDateValue(row.appointment_date),
    packageName: row.package_name,
    dueDate: formatDateValue(row.due_date) ?? "",
    status: row.status,
    contactNote: row.contact_note,
    nextFollowUpDate: formatDateValue(row.next_follow_up_date),
    bookedAppointmentId: row.booked_appointment_id,
    handledByStaffName: row.handled_by_staff_name,
    handledAt: formatDateTimeValue(row.handled_at),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export const FOLLOW_UP_SELECT = `
  f.id,
  f.customer_id,
  c.display_name as customer_name,
  c.phone,
  f.pet_id,
  p.name as pet_name,
  p.pet_type,
  f.appointment_id,
  a.appointment_date,
  a.package_name,
  f.due_date,
  f.status,
  f.contact_note,
  f.next_follow_up_date,
  f.booked_appointment_id,
  s.display_name as handled_by_staff_name,
  f.handled_at,
  f.created_at,
  f.updated_at
`;

export async function createFollowUpForCompletedAppointment(db: Queryable, appointmentId: string) {
  await db.query(
    `insert into public.follow_ups (customer_id, pet_id, appointment_id, due_date, status)
     select customer_id, pet_id, id, appointment_date + interval '30 days', 'pending'
     from public.appointments
     where id = $1
       and status = 'completed'
       and customer_id is not null
       and pet_id is not null
     on conflict (appointment_id) where appointment_id is not null do nothing`,
    [appointmentId],
  );
}
