import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../lib/db";
import { getCurrentStaffUserResult } from "../../../../lib/staff-auth";
import { hashStaffPassword, verifyStaffPassword } from "../../../../lib/staff-password";
import { STAFF_SESSION_COOKIE } from "../../../../lib/staff-session";

export const runtime = "nodejs";

type ChangePasswordInput = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

type StaffUserRow = {
  id: string;
  username: string;
  password_hash: string;
  is_active: boolean;
};

function readPassword(value: unknown) {
  return typeof value === "string" ? value : "";
}

function clearStaffSession(response: NextResponse) {
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function POST(request: NextRequest) {
  let input: ChangePasswordInput;

  try {
    input = (await request.json()) as ChangePasswordInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const currentUserResult = await getCurrentStaffUserResult(
    request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    const response = NextResponse.json({ message: "请先登录员工后台。" }, { status: 401 });

    if (currentUserResult.status === "inactive") {
      return clearStaffSession(response);
    }

    return response;
  }

  const currentUser = currentUserResult.user;

  const currentPassword = readPassword(input.currentPassword);
  const newPassword = readPassword(input.newPassword);
  const confirmPassword = readPassword(input.confirmPassword);

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ message: "请填写当前密码和新密码。" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ message: "两次输入的新密码不一致。" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ message: "新密码至少需要 8 位。" }, { status: 400 });
  }

  if (newPassword === currentPassword) {
    return NextResponse.json({ message: "新密码不能和当前密码相同。" }, { status: 400 });
  }

  try {
    const result = await getPool().query<StaffUserRow>(
      `select id, username, password_hash, is_active
       from public.staff_users
       where id = $1
       limit 1`,
      [currentUser.id],
    );
    const staffUser = result.rows[0];

    if (
      !staffUser ||
      !staffUser.is_active ||
      !verifyStaffPassword(currentPassword, staffUser.password_hash)
    ) {
      return NextResponse.json({ message: "当前密码不正确。" }, { status: 401 });
    }

    const passwordHash = hashStaffPassword(newPassword);

    await getPool().query(
      `update public.staff_users
       set password_hash = $1, updated_at = now()
       where id = $2`,
      [passwordHash, staffUser.id],
    );

    const response = NextResponse.json({ ok: true, message: "密码已更新，请重新登录。" });

    return clearStaffSession(response);
  } catch (error) {
    console.error("Failed to change staff password", error);
    return NextResponse.json({ message: "密码修改暂时不可用，请稍后再试。" }, { status: 500 });
  }
}
