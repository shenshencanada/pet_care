import { NextRequest, NextResponse } from "next/server";

import { isAppointmentStatus } from "../../../../lib/appointments";
import { upsertCustomerAndPet } from "../../../../lib/customers";
import { getPool } from "../../../../lib/db";
import {
  apiError,
  isValidDate,
  parsePublicAppointmentInput,
  PUBLIC_APPOINTMENT_SELECT,
  PublicAppointmentInput,
  PublicAppointmentRow,
  requireApiClient,
  toPublicAppointment,
} from "../../../../lib/public-api";

export const runtime = "nodejs";

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 100);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiClient(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = request.nextUrl;
  const today = new Date();
  const from = searchParams.get("from") ?? toDateValue(addDays(today, -30));
  const to = searchParams.get("to") ?? toDateValue(addDays(today, 90));
  const status = searchParams.get("status");
  const phone = searchParams.get("phone")?.trim() ?? "";
  const externalSource = searchParams.get("externalSource")?.trim() ?? "";
  const externalId = searchParams.get("externalId")?.trim() ?? "";
  const limit = parseLimit(searchParams.get("limit"));

  if (!isValidDate(from) || !isValidDate(to)) {
    return apiError("VALIDATION_ERROR", "查询日期范围格式应为 YYYY-MM-DD。", 400);
  }

  if (status && !isAppointmentStatus(status)) {
    return apiError("VALIDATION_ERROR", "请选择有效的预约状态。", 400);
  }

  const conditions = ["a.api_client_id = $1", "a.appointment_date between $2::date and $3::date"];
  const params: Array<string | number> = [auth.apiClient.id, from, to];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

  if (phone) {
    params.push(phone);
    conditions.push(`a.phone = $${params.length}`);
  }

  if (externalSource) {
    params.push(externalSource);
    conditions.push(`a.external_source = $${params.length}`);
  }

  if (externalId) {
    params.push(externalId);
    conditions.push(`a.external_id = $${params.length}`);
  }

  params.push(limit);

  try {
    const result = await getPool().query<PublicAppointmentRow>(
      `select ${PUBLIC_APPOINTMENT_SELECT}
       from public.appointments a
       left join public.pets p on p.id = a.pet_id
       where ${conditions.join(" and ")}
       order by a.appointment_date desc, a.appointment_time asc, a.created_at desc
       limit $${params.length}`,
      params,
    );

    return NextResponse.json({ items: result.rows.map(toPublicAppointment) });
  } catch (error) {
    console.error("Failed to list public appointments", error);
    return apiError("INTERNAL_ERROR", "预约列表暂时不可用，请稍后再试。", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiClient(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: PublicAppointmentInput;

  try {
    input = (await request.json()) as PublicAppointmentInput;
  } catch {
    return apiError("VALIDATION_ERROR", "请求内容不是有效的 JSON。", 400);
  }

  const parsed = parsePublicAppointmentInput(input);

  if (Object.keys(parsed.details).length > 0) {
    return apiError("VALIDATION_ERROR", "预约信息不完整或格式不正确。", 400, parsed.details);
  }

  const {
    customerName,
    phone,
    petType,
    petName,
    packageName,
    appointmentDate,
    appointmentTime,
    customerNote,
    externalSource,
    externalId,
  } = parsed.value;

  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("begin");
      const { customerId, petId } = await upsertCustomerAndPet(client, {
        contactName: customerName,
        phone: phone!,
        petName,
        petType: petType!,
      });
      const result = await client.query<PublicAppointmentRow>(
        `insert into public.appointments
          (source, api_client_id, external_source, external_id, customer_id, pet_id, contact_name, phone, pet_type, package_name, appointment_date, appointment_time, customer_note, status)
         values
          ('api', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
         returning id, source, api_client_id, external_source, external_id, contact_name, phone, $13::text as pet_name, pet_type, package_name, appointment_date, appointment_time::text as appointment_time, customer_note, status, created_at, updated_at`,
        [
          auth.apiClient.id,
          externalSource,
          externalId,
          customerId,
          petId,
          customerName,
          phone,
          petType,
          packageName,
          appointmentDate,
          appointmentTime,
          customerNote,
          petName,
        ],
      );

      await client.query("commit");

      return NextResponse.json(toPublicAppointment(result.rows[0]), { status: 201 });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505" &&
      externalSource &&
      externalId
    ) {
      return apiError("DUPLICATE_EXTERNAL_ID", "这条外部预约已提交，请勿重复创建。", 409);
    }

    console.error("Failed to create public appointment", error);
    return apiError("INTERNAL_ERROR", "预约暂时无法提交，请稍后再试。", 500);
  }
}
