import { NextRequest, NextResponse } from "next/server";

import { getPool } from "../../../../../../lib/db";
import {
  apiError,
  isTerminalPublicStatus,
  isValidUuid,
  PublicAppointmentRow,
  requireApiClient,
  toPublicAppointment,
} from "../../../../../../lib/public-api";
import { cleanOptionalText } from "../../../../../../lib/customers";

export const runtime = "nodejs";

type CancelAppointmentInput = {
  reason?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireApiClient(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return apiError("APPOINTMENT_NOT_FOUND", "没有找到这条预约记录。", 404);
  }

  let input: CancelAppointmentInput = {};

  try {
    const text = await request.text();
    input = text ? (JSON.parse(text) as CancelAppointmentInput) : {};
  } catch {
    return apiError("VALIDATION_ERROR", "请求内容不是有效的 JSON。", 400);
  }

  const reason = cleanOptionalText(input.reason, 300);

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
        return apiError("INVALID_STATUS_TRANSITION", "已取消或已完成的预约不能重复取消。", 422);
      }

      const result = await client.query<PublicAppointmentRow>(
        `update public.appointments
         set status = 'canceled',
             canceled_reason = $1
         where id = $2
           and api_client_id = $3
         returning id, source, api_client_id, external_source, external_id, contact_name, phone, (select name from public.pets where id = public.appointments.pet_id) as pet_name, pet_type, package_name, appointment_date, appointment_time::text as appointment_time, customer_note, status, created_at, updated_at`,
        [reason, id, auth.apiClient.id],
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
    console.error("Failed to cancel public appointment", error);
    return apiError("INTERNAL_ERROR", "预约取消失败，请稍后再试。", 500);
  }
}
