import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TIME_SLOTS,
  AppointmentStatus,
  isAppointmentPackage,
  isAppointmentStatus,
} from "./appointments";
import { cleanOptionalText, cleanRequiredText, isLikelyPhone } from "./customers";
import { getPool } from "./db";

export type ApiClient = {
  id: string;
  name: string;
};

export type PublicAppointmentRow = {
  id: string;
  source: "quick" | "full" | "staff" | "api";
  api_client_id: string | null;
  external_source: string | null;
  external_id: string | null;
  contact_name: string | null;
  phone: string | null;
  pet_name: string | null;
  pet_type: string | null;
  package_name: string | null;
  appointment_date: Date | string | null;
  appointment_time: string | null;
  customer_note: string | null;
  status: AppointmentStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

export type PublicAppointmentInput = {
  customerName?: string;
  phone?: string;
  petType?: string;
  petName?: string;
  packageName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  customerNote?: string;
  externalSource?: string;
  externalId?: string;
};

export type PublicApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "APPOINTMENT_NOT_FOUND"
  | "DUPLICATE_EXTERNAL_ID"
  | "INVALID_STATUS_TRANSITION"
  | "INTERNAL_ERROR";

type ApiClientRow = {
  id: string;
  name: string;
};

export function apiError(
  code: PublicApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, string>,
) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export async function requireApiClient(request: NextRequest) {
  const apiKey = readBearerToken(request);

  if (!apiKey) {
    return {
      error: apiError("UNAUTHORIZED", "请提供有效的 Bearer API Key。", 401),
    };
  }

  const result = await getPool().query<ApiClientRow>(
    `select id, name
     from public.api_clients
     where api_key_hash = $1
       and is_active = true
     limit 1`,
    [hashApiKey(apiKey)],
  );

  const row = result.rows[0];

  if (!row) {
    return {
      error: apiError("UNAUTHORIZED", "API Key 无效或已停用。", 401),
    };
  }

  return {
    apiClient: {
      id: row.id,
      name: row.name,
    },
  };
}

export function formatDateValue(value: Date | string | null) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function toPublicAppointment(row: PublicAppointmentRow) {
  return {
    id: row.id,
    customerName: row.contact_name,
    phone: row.phone ?? "",
    petType: row.pet_type ?? "",
    petName: row.pet_name,
    packageName: row.package_name,
    appointmentDate: formatDateValue(row.appointment_date),
    appointmentTime: row.appointment_time?.slice(0, 5) ?? "",
    customerNote: row.customer_note,
    status: row.status,
    statusText: APPOINTMENT_STATUS_LABELS[row.status],
    source: row.source,
    externalSource: row.external_source,
    externalId: row.external_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export function isValidDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parsePublicAppointmentInput(input: PublicAppointmentInput) {
  const customerName = cleanOptionalText(input.customerName, 40);
  const phone = cleanRequiredText(input.phone, 30);
  const petType = cleanRequiredText(input.petType, 40);
  const petName = cleanOptionalText(input.petName, 60);
  const packageName = cleanOptionalText(input.packageName, 40);
  const appointmentDate = cleanRequiredText(input.appointmentDate, 10);
  const appointmentTime = cleanRequiredText(input.appointmentTime, 5);
  const customerNote = cleanOptionalText(input.customerNote, 500);
  const externalSource = cleanOptionalText(input.externalSource, 60);
  const externalId = cleanOptionalText(input.externalId, 120);
  const details: Record<string, string> = {};

  if (!isLikelyPhone(phone)) {
    details.phone = "请填写可联系的手机号码。";
  }

  if (!petType) {
    details.petType = "请选择宠物类型。";
  }

  if (!appointmentDate || !isValidDate(appointmentDate)) {
    details.appointmentDate = "预约日期格式应为 YYYY-MM-DD。";
  }

  if (!appointmentTime || !APPOINTMENT_TIME_SLOTS.includes(appointmentTime)) {
    details.appointmentTime = "请选择有效的预约时段。";
  }

  if (!isAppointmentPackage(packageName)) {
    details.packageName = "请选择有效的预约套餐。";
  }

  return {
    value: {
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
    },
    details,
  };
}

export function isTerminalPublicStatus(status: unknown) {
  return isAppointmentStatus(status) && (status === "completed" || status === "canceled");
}

export const PUBLIC_APPOINTMENT_SELECT = `
  a.id,
  a.source,
  a.api_client_id,
  a.external_source,
  a.external_id,
  a.contact_name,
  a.phone,
  p.name as pet_name,
  a.pet_type,
  a.package_name,
  a.appointment_date,
  a.appointment_time::text as appointment_time,
  a.customer_note,
  a.status,
  a.created_at,
  a.updated_at
`;
