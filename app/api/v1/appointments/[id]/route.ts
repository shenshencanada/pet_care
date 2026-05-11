import { NextRequest, NextResponse } from "next/server";

import { upsertCustomerAndPet } from "../../../../../lib/customers";
import { getPool } from "../../../../../lib/db";
import {
  apiError,
  isTerminalPublicStatus,
  isValidUuid,
  parsePublicAppointmentInput,
  PUBLIC_APPOINTMENT_SELECT,
  PublicAppointmentInput,
  PublicAppointmentRow,
  requireApiClient,
  toPublicAppointment,
} from "../../../../../lib/public-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function findPublicAppointment(id: string, apiClientId: string) {
  const result = await getPool().query<PublicAppointmentRow>(
    `select ${PUBLIC_APPOINTMENT_SELECT}
     from public.appointments a
     left join public.pets p on p.id = a.pet_id
     where a.id = $1
       and a.api_client_id = $2
     limit 1`,
    [id, apiClientId],
  );

  return result.rows[0] ?? null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireApiClient(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return apiError("APPOINTMENT_NOT_FOUND", "没有找到这条预约记录。", 404);
  }

  try {
    const appointment = await findPublicAppointment(id, auth.apiClient.id);

    if (!appointment) {
      return apiError("APPOINTMENT_NOT_FOUND", "没有找到这条预约记录。", 404);
    }

    return NextResponse.json(toPublicAppointment(appointment));
  } catch (error) {
    console.error("Failed to get public appointment", error);
    return apiError("INTERNAL_ERROR", "预约详情暂时不可用，请稍后再试。", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiClient(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return apiError("APPOINTMENT_NOT_FOUND", "没有找到这条预约记录。", 404);
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
      const existingResult = await client.query<{ status: string }>(
        `select status
         from public.appointments
         where id = $1
           and api_client_id = $2
         for update`,
        [id, auth.apiClient.id],
      );
      const existing = existingResult.rows[0];

      if (!existing) {
        await client.query("rollback");
        return apiError("APPOINTMENT_NOT_FOUND", "没有找到这条预约记录。", 404);
      }

      if (isTerminalPublicStatus(existing.status)) {
        await client.query("rollback");
        return apiError("INVALID_STATUS_TRANSITION", "已取消或已完成的预约不能继续修改。", 422);
      }

      const { customerId, petId } = await upsertCustomerAndPet(client, {
        contactName: customerName,
        phone: phone!,
        petName,
        petType: petType!,
      });
      const result = await client.query<PublicAppointmentRow>(
        `update public.appointments
         set external_source = $1,
             external_id = $2,
             customer_id = $3,
             pet_id = $4,
             contact_name = $5,
             phone = $6,
             pet_type = $7,
             package_name = $8,
             appointment_date = $9,
             appointment_time = $10,
             customer_note = $11
         where id = $12
           and api_client_id = $13
         returning id, source, api_client_id, external_source, external_id, contact_name, phone, $14::text as pet_name, pet_type, package_name, appointment_date, appointment_time::text as appointment_time, customer_note, status, created_at, updated_at`,
        [
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
          id,
          auth.apiClient.id,
          petName,
        ],
      );

      await client.query("commit");

      return NextResponse.json(toPublicAppointment(result.rows[0]));
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
      return apiError("DUPLICATE_EXTERNAL_ID", "这条外部预约编号已存在。", 409);
    }

    console.error("Failed to update public appointment", error);
    return apiError("INTERNAL_ERROR", "预约更新失败，请稍后再试。", 500);
  }
}
