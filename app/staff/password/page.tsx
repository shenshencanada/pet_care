import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound, PawPrint } from "lucide-react";
import { getCurrentStaffUserResult } from "../../../lib/staff-auth";
import { STAFF_SESSION_COOKIE } from "../../../lib/staff-session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function StaffPasswordPage() {
  const cookieStore = await cookies();
  const currentUserResult = await getCurrentStaffUserResult(
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    if (currentUserResult.status === "inactive") {
      redirect("/api/staff/session/clear?from=/staff/password");
    }

    redirect("/staff/login?from=/staff/password");
  }

  const currentUser = currentUserResult.user;

  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="bg-ink px-5 py-8 text-white">
        <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-teal">
              <PawPrint aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-sm font-bold text-white/70">泡泡爪宠物洗护</p>
              <h1 className="m-0 text-[30px] font-extrabold leading-tight">修改密码</h1>
            </div>
          </div>

          <Link className="secondary-btn border-white/40" href="/staff">
            <ArrowLeft aria-hidden="true" />
            返回后台
          </Link>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto w-full max-w-[760px] rounded-card border border-line bg-white p-7 shadow-soft">
          <div className="mb-7 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-mist text-teal">
              <KeyRound aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-sm font-bold text-coral">
                当前员工：{currentUser.displayName}
              </p>
              <h2 className="mb-2 mt-1 text-[26px] font-extrabold leading-tight">
                更新员工登录密码
              </h2>
              <p className="m-0 leading-[1.7] text-muted">
                保存后，请用新密码重新登录员工后台。
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
