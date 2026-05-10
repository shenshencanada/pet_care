import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentStaffUserResult,
  isAdminStaff,
  StaffRole,
} from "../../../../../lib/staff-auth";
import { getPool } from "../../../../../lib/db";
import { STAFF_SESSION_COOKIE } from "../../../../../lib/staff-session";

export const runtime = "nodejs";

type UpdateStaffUserInput = {
  role?: StaffRole;
  isActive?: boolean;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StaffUserRow = {
  id: string;
  role: StaffRole;
  is_active: boolean;
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ message: "员工账号不存在。" }, { status: 404 });
  }

  let input: UpdateStaffUserInput;

  try {
    input = (await request.json()) as UpdateStaffUserInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const hasRole = input.role !== undefined;
  const hasStatus = input.isActive !== undefined;

  if (!hasRole && !hasStatus) {
    return NextResponse.json({ message: "没有需要更新的员工信息。" }, { status: 400 });
  }

  if (hasRole && !["admin", "staff"].includes(input.role as string)) {
    return NextResponse.json({ message: "请选择有效的员工角色。" }, { status: 400 });
  }

  if (hasStatus && typeof input.isActive !== "boolean") {
    return NextResponse.json({ message: "请选择有效的员工状态。" }, { status: 400 });
  }

  if (id === auth.currentUser.id) {
    if (input.isActive === false) {
      return NextResponse.json({ message: "不能停用自己的管理员账号。" }, { status: 400 });
    }

    if (input.role === "staff") {
      return NextResponse.json({ message: "不能把自己的管理员账号改成员工。" }, { status: 400 });
    }
  }

  try {
    const existingResult = await getPool().query<StaffUserRow>(
      `select id, role, is_active
       from public.staff_users
       where id = $1
       limit 1`,
      [id],
    );
    const existingUser = existingResult.rows[0];

    if (!existingUser) {
      return NextResponse.json({ message: "员工账号不存在。" }, { status: 404 });
    }

    const nextRole = hasRole ? input.role : existingUser.role;
    const nextStatus = hasStatus ? input.isActive : existingUser.is_active;

    await getPool().query(
      `update public.staff_users
       set role = $1, is_active = $2, updated_at = now()
       where id = $3`,
      [nextRole, nextStatus, id],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update staff user", error);
    return NextResponse.json({ message: "员工账号更新失败，请稍后再试。" }, { status: 500 });
  }
}
