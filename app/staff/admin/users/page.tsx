import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, PawPrint, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  getCurrentStaffUserResult,
  isAdminStaff,
  StaffRole,
} from "../../../../lib/staff-auth";
import { getPool } from "../../../../lib/db";
import { STAFF_SESSION_COOKIE } from "../../../../lib/staff-session";
import { AdminUsersPanel, StaffUserView } from "./AdminUsersPanel";

type StaffUserRow = {
  id: string;
  username: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

function toStaffUserView(row: StaffUserRow): StaffUserView {
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

export default async function StaffAdminUsersPage() {
  const cookieStore = await cookies();
  const currentUserResult = await getCurrentStaffUserResult(
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    if (currentUserResult.status === "inactive") {
      redirect("/api/staff/session/clear?from=/staff/admin/users");
    }

    redirect("/staff/login?from=/staff/admin/users");
  }

  const currentUser = currentUserResult.user;

  if (!isAdminStaff(currentUser)) {
    return (
      <main className="min-h-screen bg-mist px-5 py-10 text-ink">
        <section className="mx-auto w-full max-w-[720px] rounded-card border border-line bg-white p-7 text-center shadow-soft">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-card bg-coral/10 text-coral">
            <ShieldAlert aria-hidden="true" />
          </span>
          <p className="m-0 text-sm font-bold text-coral">无权限访问</p>
          <h1 className="mb-3 mt-2 text-[28px] font-extrabold leading-tight">只有管理员可以管理员工账号</h1>
          <p className="mx-auto mb-6 mt-0 max-w-[520px] leading-[1.7] text-muted">
            你仍然可以返回员工后台处理预约、客户资料和自己的登录密码。
          </p>
          <Link className="primary-btn" href="/staff">
            <ArrowLeft aria-hidden="true" />
            返回员工后台
          </Link>
        </section>
      </main>
    );
  }

  const result = await getPool().query<StaffUserRow>(
    `select id, username, display_name, role, is_active, created_at, updated_at
     from public.staff_users
     order by created_at desc`,
  );
  const users = result.rows.map(toStaffUserView);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="bg-ink px-5 py-8 text-white">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-teal">
              <PawPrint aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-sm font-bold text-white/70">泡泡爪宠物洗护</p>
              <h1 className="m-0 text-[30px] font-extrabold leading-tight">员工管理</h1>
            </div>
          </div>

          <Link className="secondary-btn border-white/40" href="/staff">
            <ArrowLeft aria-hidden="true" />
            返回后台
          </Link>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto w-full max-w-[1080px]">
          <div className="mb-6 rounded-card border border-line bg-white p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-mist text-teal">
                <ShieldCheck aria-hidden="true" />
              </span>
              <div>
                <p className="m-0 text-sm font-bold text-coral">
                  当前管理员：{currentUser.displayName}
                </p>
                <h2 className="mb-2 mt-1 text-[26px] font-extrabold leading-tight">
                  管理员工账号和权限
                </h2>
                <p className="m-0 leading-[1.7] text-muted">
                  可以新增员工、停用账号、调整角色，或为其他员工重置登录密码。
                </p>
              </div>
            </div>
          </div>

          <AdminUsersPanel currentUserId={currentUser.id} users={users} />
        </div>
      </section>
    </main>
  );
}
