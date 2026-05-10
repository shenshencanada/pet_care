import { NextRequest, NextResponse } from "next/server";
import { APPOINTMENT_TIME_SLOTS } from "../../../lib/appointments";
import { cleanOptionalText, cleanRequiredText, isLikelyPhone, upsertCustomerAndPet } from "../../../lib/customers";
import { getPool } from "../../../lib/db";

export const runtime = "nodejs";

type AppointmentInput = {
  source?: string;
  name?: string;
  phone?: string;
  pet?: string;
  petName?: string;
  package?: string;
  date?: string;
  time?: string;
  note?: string;
};

function isValidDate(value: string | null) {
  return value === null || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string | null) {
  return value !== null && APPOINTMENT_TIME_SLOTS.includes(value);
}

export async function POST(request: NextRequest) {
  let input: AppointmentInput;

  try {
    input = (await request.json()) as AppointmentInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const source = input.source === "quick" ? "quick" : "full";
  const contactName = cleanOptionalText(input.name, 40);
  const phone = cleanRequiredText(input.phone, 30);
  const petType = cleanRequiredText(input.pet, 40);
  const petName = cleanOptionalText(input.petName, 60);
  const packageName = cleanOptionalText(input.package, 40);
  const appointmentDate = cleanRequiredText(input.date, 10);
  const appointmentTime = cleanRequiredText(input.time, 5);
  const note = cleanOptionalText(input.note, 500);

  if (!phone || !isLikelyPhone(phone)) {
    return NextResponse.json({ message: "请填写可联系的手机号码。" }, { status: 400 });
  }

  if (!petType) {
    return NextResponse.json({ message: "请选择宠物类型。" }, { status: 400 });
  }

  if (source === "full" && !contactName) {
    return NextResponse.json({ message: "请填写联系人和手机。" }, { status: 400 });
  }

  if (!appointmentDate || !appointmentTime) {
    return NextResponse.json({ message: "请选择预约日期和时段。" }, { status: 400 });
  }

  if (!isValidDate(appointmentDate) || !isValidTime(appointmentTime)) {
    return NextResponse.json({ message: "预约日期或时段格式不正确。" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("begin");
      const { customerId, petId } = await upsertCustomerAndPet(client, {
        contactName,
        phone,
        petName,
        petType,
      });
      const result = await client.query<{ id: string }>(
        `insert into public.appointments
          (source, customer_id, pet_id, contact_name, phone, pet_type, package_name, appointment_date, appointment_time, customer_note, status)
         values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
         returning id`,
        [source, customerId, petId, contactName, phone, petType, packageName, appointmentDate, appointmentTime, note],
      );

      await client.query("commit");

      return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to create appointment", error);
    return NextResponse.json({ message: "预约暂时无法提交，请稍后再试。" }, { status: 500 });
  }
}
