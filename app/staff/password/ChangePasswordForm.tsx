"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";

type ApiResult = {
  message?: string;
};

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (newPassword !== confirmPassword) {
      setMessage("两次输入的新密码不一致。");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/staff/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        setMessage(result.message ?? "密码修改失败，请稍后再试。");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsSuccess(true);
      setMessage(result.message ?? "密码已更新。");
      window.setTimeout(() => {
        router.replace("/staff/login");
        router.refresh();
      }, 800);
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-bold text-muted">
        当前密码
        <span className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
            aria-hidden="true"
          />
          <input
            className="pl-10"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="请输入当前密码"
          />
        </span>
      </label>

      <label className="grid gap-2 text-sm font-bold text-muted">
        新密码
        <span className="relative">
          <KeyRound
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
            aria-hidden="true"
          />
          <input
            className="pl-10"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="至少 8 位"
          />
        </span>
      </label>

      <label className="grid gap-2 text-sm font-bold text-muted">
        确认新密码
        <span className="relative">
          <KeyRound
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
            aria-hidden="true"
          />
          <input
            className="pl-10"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="再次输入新密码"
          />
        </span>
      </label>

      {message ? (
        <p
          className={`m-0 rounded-card border px-3 py-2 text-sm font-bold ${
            isSuccess
              ? "border-teal/30 bg-teal/10 text-teal"
              : "border-coral/30 bg-coral/10 text-coral"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button className="primary-btn mt-1 w-full" disabled={isSubmitting} type="submit">
        <CheckCircle2 aria-hidden="true" />
        {isSubmitting ? "正在保存" : "更新密码"}
      </button>
    </form>
  );
}
