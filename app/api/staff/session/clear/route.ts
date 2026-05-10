import { NextRequest, NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "../../../../../lib/staff-session";

function getSafeFrom(value: string | null) {
  if (!value || value === "/staff" || value.startsWith("/staff/")) {
    return value ?? "/staff";
  }

  return "/staff";
}

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/staff/login", request.url);
  const from = getSafeFrom(request.nextUrl.searchParams.get("from"));

  loginUrl.searchParams.set("from", from);

  const response = NextResponse.redirect(loginUrl, { status: 303 });

  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
