import { getPool } from "./db";
import { verifyStaffSession } from "./staff-session";

export type StaffRole = "admin" | "staff";

export type CurrentStaffUser = {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
};

export type CurrentStaffUserResult =
  | {
      status: "ok";
      user: CurrentStaffUser;
    }
  | {
      status: "no-session";
      user: null;
    }
  | {
      status: "inactive";
      user: null;
    };

type StaffUserRow = {
  id: string;
  username: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
};

export async function getCurrentStaffUser(
  cookieValue: string | undefined,
  sessionSecret: string | undefined,
) {
  const result = await getCurrentStaffUserResult(cookieValue, sessionSecret);

  return result.status === "ok" ? result.user : null;
}

export async function getCurrentStaffUserResult(
  cookieValue: string | undefined,
  sessionSecret: string | undefined,
): Promise<CurrentStaffUserResult> {
  const session = await verifyStaffSession(cookieValue, sessionSecret);

  if (!session) {
    return { status: "no-session", user: null };
  }

  const result = session.staffId
    ? await getPool().query<StaffUserRow>(
        `select id, username, display_name, role, is_active
         from public.staff_users
         where id = $1
         limit 1`,
        [session.staffId],
      )
    : await getPool().query<StaffUserRow>(
        `select id, username, display_name, role, is_active
         from public.staff_users
         where lower(username) = lower($1)
         limit 1`,
        [session.username],
      );
  const user = result.rows[0];

  if (!user?.is_active) {
    return { status: "inactive", user: null };
  }

  return {
    status: "ok",
    user: {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    isActive: user.is_active,
    } satisfies CurrentStaffUser,
  };
}

export function isAdminStaff(user: CurrentStaffUser | null) {
  return user?.role === "admin";
}
