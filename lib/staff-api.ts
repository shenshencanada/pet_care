import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaffUserResult } from "./staff-auth";
import { STAFF_SESSION_COOKIE } from "./staff-session";

export function clearStaffSession(response: NextResponse) {
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function requireStaffApi(request: NextRequest) {
  const currentUserResult = await getCurrentStaffUserResult(
    request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    const response = NextResponse.json({ message: "请先登录员工后台。" }, { status: 401 });

    return {
      error: currentUserResult.status === "inactive" ? clearStaffSession(response) : response,
    };
  }

  return { currentUser: currentUserResult.user };
}
