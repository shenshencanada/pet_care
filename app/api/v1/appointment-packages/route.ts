import { NextRequest, NextResponse } from "next/server";

import { APPOINTMENT_PACKAGES } from "../../../../lib/appointments";
import { requireApiClient } from "../../../../lib/public-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireApiClient(request);

  if ("error" in auth) {
    return auth.error;
  }

  return NextResponse.json({
    items: APPOINTMENT_PACKAGES.map((name) => ({ name })),
  });
}
