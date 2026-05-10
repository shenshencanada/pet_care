import { NextRequest, NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "../../../../lib/staff-session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/staff/login", request.url), { status: 303 });

  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
