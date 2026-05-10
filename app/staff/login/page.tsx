"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, PawPrint, UserRound } from "lucide-react";

function getSafeRedirectPath(value: string | null) {
  if (!value || value === "/staff" || value.startsWith("/staff/")) {
    return value ?? "/staff";
  }

  return "/staff";
}

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, rememberMe }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(result.message ?? "登录失败，请稍后再试。");
        return;
      }

      const from = new URLSearchParams(window.location.search).get("from");

      router.replace(getSafeRedirectPath(from));
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-[420px] rounded-card border border-line bg-white p-7 shadow-soft">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-teal text-white">
              <PawPrint aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-sm font-bold text-coral">泡泡爪宠物洗护</p>
              <h1 className="m-0 text-[28px] font-extrabold leading-tight">员工登录</h1>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold text-muted">
              员工账号
              <span className="relative">
                <UserRound
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
                  aria-hidden="true"
                />
                <input
                  className="pl-10"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入员工账号"
                />
              </span>
            </label>

            <label className="grid gap-2 text-sm font-bold text-muted">
              密码
              <span className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
                  aria-hidden="true"
                />
                <input
                  className="pl-10"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                />
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm font-bold text-muted">
              <input
                className="h-4 min-h-0 w-4 accent-teal"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                type="checkbox"
              />
              记住我
            </label>

            {message ? (
              <p className="m-0 rounded-card border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-bold text-coral">
                {message}
              </p>
            ) : null}

            <button className="primary-btn mt-1 w-full" disabled={isSubmitting} type="submit">
              <LogIn aria-hidden="true" />
              {isSubmitting ? "正在登录" : "登录后台"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
