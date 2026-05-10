import { NextRequest, NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE, verifyStaffSession } from "./lib/staff-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifyStaffSession(
    request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (pathname === "/staff/login") {
    if (session) {
      return NextResponse.redirect(new URL("/staff", request.url));
    }

    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/staff/login", request.url);
    loginUrl.searchParams.set("from", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff", "/staff/:path*"],
};
