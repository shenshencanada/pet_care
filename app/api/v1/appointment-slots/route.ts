import { NextRequest, NextResponse } from "next/server";

import { APPOINTMENT_TIME_SLOTS } from "../../../../lib/appointments";
import { apiError, isValidDate, requireApiClient } from "../../../../lib/public-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireApiClient(request);

  if ("error" in auth) {
    return auth.error;
  }

  const date = request.nextUrl.searchParams.get("date");

  if (!isValidDate(date)) {
    return apiError("VALIDATION_ERROR", "请提供格式为 YYYY-MM-DD 的预约日期。", 400);
  }

  return NextResponse.json({
    date,
    slots: APPOINTMENT_TIME_SLOTS.map((time) => ({
      time,
      available: true,
    })),
  });
}
