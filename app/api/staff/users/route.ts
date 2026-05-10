import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentStaffUserResult,
  isAdminStaff,
  StaffRole,
} from "../../../../lib/staff-auth";
import { getPool } from "../../../../lib/db";
import { hashStaffPassword } from "../../../../lib/staff-password";
import { STAFF_SESSION_COOKIE } from "../../../../lib/staff-session";

export const runtime = "nodejs";

type CreateStaffUserInput = {
  username?: string;
  displayName?: string;
  role?: StaffRole;
  password?: string;
};

type StaffUserListRow = {
  id: string;
  username: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type DatabaseError = Error & {
  code?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStaffUser(row: StaffUserListRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const result = await getPool().query<StaffUserListRow>(
      `select id, username, display_name, role, is_active, created_at, updated_at
       from public.staff_users
       order by created_at desc`,
    );

    return NextResponse.json({ users: result.rows.map(toStaffUser) });
  } catch (error) {
    console.error("Failed to list staff users", error);
    return NextResponse.json({ message: "员工列表暂时不可用，请稍后再试。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: CreateStaffUserInput;

  try {
    input = (await request.json()) as CreateStaffUserInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const username = cleanText(input.username);
  const displayName = cleanText(input.displayName);
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role ?? "staff";

  if (!username || !displayName || !password) {
    return NextResponse.json({ message: "请填写账号、姓名和密码。" }, { status: 400 });
  }

  if (!["admin", "staff"].includes(role)) {
    return NextResponse.json({ message: "请选择有效的员工角色。" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "密码至少需要 8 位。" }, { status: 400 });
  }

  try {
    const result = await getPool().query<StaffUserListRow>(
      `insert into public.staff_users (username, display_name, password_hash, role)
       values ($1, $2, $3, $4)
       returning id, username, display_name, role, is_active, created_at, updated_at`,
      [username, displayName, hashStaffPassword(password), role],
    );

    return NextResponse.json({ user: toStaffUser(result.rows[0]) }, { status: 201 });
  } catch (error) {
    const databaseError = error as DatabaseError;

    if (databaseError.code === "23505") {
      return NextResponse.json({ message: "这个员工账号已经存在。" }, { status: 409 });
    }

    console.error("Failed to create staff user", error);
    return NextResponse.json({ message: "员工账号创建失败，请稍后再试。" }, { status: 500 });
  }
}
