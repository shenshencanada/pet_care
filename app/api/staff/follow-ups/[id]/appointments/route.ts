import { NextRequest, NextResponse } from "next/server";
import {
  APPOINTMENT_TIME_SLOTS,
  AppointmentStatus,
  isAppointmentPackage,
  isAppointmentStatus,
} from "../../../../../../lib/appointments";
import { cleanOptionalText, cleanRequiredText } from "../../../../../../lib/customers";
import { getPool } from "../../../../../../lib/db";
import { createFollowUpForCompletedAppointment } from "../../../../../../lib/follow-ups";
import { requireStaffApi } from "../../../../../../lib/staff-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateAppointmentInput = {
  contactName?: string;
  packageName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  customerNote?: string;
  staffNote?: string;
  status?: AppointmentStatus;
};

type FollowUpBaseRow = {
  customer_id: string;
  pet_id: string;
  customer_name: string | null;
  phone: string;
  pet_type: string;
};

function isValidDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string | null) {
  return value !== null && APPOINTMENT_TIME_SLOTS.includes(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: CreateAppointmentInput;

  try {
    input = (await request.json()) as CreateAppointmentInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const { id } = await context.params;
  const contactName = cleanOptionalText(input.contactName, 40);
  const packageName = cleanOptionalText(input.packageName, 40);
  const appointmentDate = cleanRequiredText(input.appointmentDate, 10);
  const appointmentTime = cleanRequiredText(input.appointmentTime, 5);
  const customerNote = cleanOptionalText(input.customerNote, 500);
  const staffNote = cleanOptionalText(input.staffNote, 800);
  const status = input.status ?? "confirmed";

  if (!isValidDate(appointmentDate) || !isValidTime(appointmentTime)) {
    return NextResponse.json({ message: "预约日期或时段格式不正确。" }, { status: 400 });
  }

  if (!isAppointmentStatus(status)) {
    return NextResponse.json({ message: "请选择有效的预约状态。" }, { status: 400 });
  }

  if (!isAppointmentPackage(packageName)) {
    return NextResponse.json({ message: "请选择有效的预约套餐。" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("begin");
      const followUpResult = await client.query<FollowUpBaseRow>(
        `select
           f.customer_id,
           f.pet_id,
           c.display_name as customer_name,
           c.phone,
           p.pet_type
         from public.follow_ups f
         join public.customers c on c.id = f.customer_id
         join public.pets p on p.id = f.pet_id
         where f.id = $1
         for update`,
        [id],
      );
      const followUp = followUpResult.rows[0];

      if (!followUp) {
        await client.query("rollback");
        return NextResponse.json({ message: "没有找到这条回访提醒。" }, { status: 404 });
      }

      const appointmentResult = await client.query<{ id: string }>(
        `insert into public.appointments
          (source, customer_id, pet_id, contact_name, phone, pet_type, package_name, appointment_date, appointment_time, customer_note, staff_note, status, handled_by_staff_id)
         values
          ('staff', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning id`,
        [
          followUp.customer_id,
          followUp.pet_id,
          contactName ?? followUp.customer_name,
          followUp.phone,
          followUp.pet_type,
          packageName,
          appointmentDate,
          appointmentTime,
          customerNote,
          staffNote,
          status,
          auth.currentUser.id,
        ],
      );
      const appointmentId = appointmentResult.rows[0].id;

      await client.query(
        `update public.follow_ups
         set status = 'booked',
             booked_appointment_id = $1,
             contact_note = coalesce($2, contact_note),
             handled_by_staff_id = $3,
             handled_at = now()
         where id = $4`,
        [appointmentId, staffNote, auth.currentUser.id, id],
      );

      if (status === "completed") {
        await createFollowUpForCompletedAppointment(client, appointmentId);
      }

      await client.query("commit");

      return NextResponse.json({ id: appointmentId, message: "预约已创建，回访已标记为已预约。" }, { status: 201 });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to create appointment from follow up", error);
    return NextResponse.json({ message: "预约创建失败，请稍后再试。" }, { status: 500 });
  }
}
