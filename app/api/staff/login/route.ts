import { NextRequest, NextResponse } from "next/server";
import {
  createStaffSession,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
  STAFF_SESSION_REMEMBER_MAX_AGE_SECONDS,
} from "../../../../lib/staff-session";
import { getPool } from "../../../../lib/db";
import { verifyStaffPassword } from "../../../../lib/staff-password";

export const runtime = "nodejs";

type LoginInput = {
  username?: string;
  password?: string;
  rememberMe?: boolean;
};

type StaffUserRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: "admin" | "staff";
  is_active: boolean;
};

type LoginAttemptRow = {
  locked_until: Date | string | null;
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

function cleanCredential(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
}

function isLocked(lockedUntil: Date | string | null | undefined) {
  return lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false;
}

export async function POST(request: NextRequest) {
  let input: LoginInput;

  try {
    input = (await request.json()) as LoginInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const sessionSecret = process.env.STAFF_SESSION_SECRET;

  if (!sessionSecret) {
    return NextResponse.json({ message: "员工登录尚未配置。" }, { status: 500 });
  }

  const username = cleanCredential(input.username);
  const password = cleanCredential(input.password);
  const usernameLower = username.toLowerCase();
  const ipAddress = getClientIp(request);
  const maxAgeSeconds = input.rememberMe
    ? STAFF_SESSION_REMEMBER_MAX_AGE_SECONDS
    : STAFF_SESSION_MAX_AGE_SECONDS;

  if (!username || !password) {
    return NextResponse.json({ message: "请填写账号和密码。" }, { status: 400 });
  }

  let staffUser: StaffUserRow | undefined;

  try {
    const attemptResult = await getPool().query<LoginAttemptRow>(
      `select locked_until
       from public.staff_login_attempts
       where username_lower = $1 and ip_address = $2
       limit 1`,
      [usernameLower, ipAddress],
    );

    if (isLocked(attemptResult.rows[0]?.locked_until)) {
      return NextResponse.json({ message: "尝试次数过多，请 10 分钟后再试。" }, { status: 429 });
    }

    const result = await getPool().query<StaffUserRow>(
      `select id, username, display_name, password_hash, role, is_active
       from public.staff_users
       where lower(username) = lower($1)
       limit 1`,
      [username],
    );

    staffUser = result.rows[0];
  } catch (error) {
    console.error("Failed to load staff user", error);
    return NextResponse.json({ message: "员工登录暂时不可用，请稍后再试。" }, { status: 500 });
  }

  if (
    !staffUser ||
    !staffUser.is_active ||
    !verifyStaffPassword(password, staffUser.password_hash)
  ) {
    try {
      await getPool().query(
        `insert into public.staff_login_attempts
          (username_lower, ip_address, failed_count, locked_until, last_failed_at)
         values
          ($1, $2, 1, null, now())
         on conflict (username_lower, ip_address)
         do update set
           failed_count = case
             when staff_login_attempts.locked_until is not null
              and staff_login_attempts.locked_until <= now()
             then 1
             else staff_login_attempts.failed_count + 1
           end,
           locked_until = case
             when (
               case
                 when staff_login_attempts.locked_until is not null
                  and staff_login_attempts.locked_until <= now()
                 then 1
                 else staff_login_attempts.failed_count + 1
               end
             ) >= $3
             then now() + ($4 || ' minutes')::interval
             else null
           end,
           last_failed_at = now()`,
        [usernameLower, ipAddress, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES],
      );
    } catch (error) {
      console.error("Failed to record staff login attempt", error);
      return NextResponse.json({ message: "员工登录暂时不可用，请稍后再试。" }, { status: 500 });
    }

    return NextResponse.json({ message: "账号或密码不正确。" }, { status: 401 });
  }

  try {
    await getPool().query(
      `delete from public.staff_login_attempts
       where username_lower = $1 and ip_address = $2`,
      [usernameLower, ipAddress],
    );
  } catch (error) {
    console.error("Failed to clear staff login attempts", error);
    return NextResponse.json({ message: "员工登录暂时不可用，请稍后再试。" }, { status: 500 });
  }

  const session = await createStaffSession(
    {
      staffId: staffUser.id,
      username: staffUser.username,
      name: staffUser.display_name,
      role: staffUser.role,
    },
    sessionSecret,
    maxAgeSeconds,
  );
  const response = NextResponse.json({ ok: true });

  response.cookies.set(STAFF_SESSION_COOKIE, session, {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
