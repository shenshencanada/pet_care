import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaffUserResult, isAdminStaff } from "../../../../../../lib/staff-auth";
import { getPool } from "../../../../../../lib/db";
import { hashStaffPassword } from "../../../../../../lib/staff-password";
import { STAFF_SESSION_COOKIE } from "../../../../../../lib/staff-session";

export const runtime = "nodejs";

type ResetPasswordInput = {
  password?: string;
  confirmPassword?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StaffUserRow = {
  id: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

async function requireAdmin(request: NextRequest) {
  const currentUserResult = await getCurrentStaffUserResult(
    request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    const response = NextResponse.json({ message: "请先登录员工后台。" }, { status: 401 });

    return {
      error:
        currentUserResult.status === "inactive" ? clearStaffSession(response) : response,
    };
  }

  const currentUser = currentUserResult.user;

  if (!isAdminStaff(currentUser)) {
    return { error: NextResponse.json({ message: "只有管理员可以管理员工账号。" }, { status: 403 }) };
  }

  return { currentUser };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ message: "员工账号不存在。" }, { status: 404 });
  }

  if (id === auth.currentUser.id) {
    return NextResponse.json({ message: "请在修改密码页面更新自己的密码。" }, { status: 400 });
  }

  let input: ResetPasswordInput;

  try {
    input = (await request.json()) as ResetPasswordInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (!password || !confirmPassword) {
    return NextResponse.json({ message: "请填写新密码。" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ message: "两次输入的新密码不一致。" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "密码至少需要 8 位。" }, { status: 400 });
  }

  try {
    const existingResult = await getPool().query<StaffUserRow>(
      `select id
       from public.staff_users
       where id = $1
       limit 1`,
      [id],
    );

    if (!existingResult.rows[0]) {
      return NextResponse.json({ message: "员工账号不存在。" }, { status: 404 });
    }

    await getPool().query(
      `update public.staff_users
       set password_hash = $1, updated_at = now()
       where id = $2`,
      [hashStaffPassword(password), id],
    );

    return NextResponse.json({ ok: true, message: "员工密码已重置。" });
  } catch (error) {
    console.error("Failed to reset staff user password", error);
    return NextResponse.json({ message: "员工密码重置失败，请稍后再试。" }, { status: 500 });
  }
}
