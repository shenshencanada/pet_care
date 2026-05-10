"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Plus, ShieldCheck, UserX } from "lucide-react";

type StaffRole = "admin" | "staff";

export type StaffUserView = {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResult = {
  message?: string;
};

type AdminUsersPanelProps = {
  currentUserId: string;
  users: StaffUserView[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminUsersPanel({ currentUserId, users }: AdminUsersPanelProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [resetConfirmations, setResetConfirmations] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingAction, setPendingAction] = useState("");

  async function submitRequest(
    url: string,
    options: RequestInit,
    successMessage: string,
    reset?: () => void,
  ) {
    setMessage("");
    setIsSuccess(false);
    setPendingAction(url);

    try {
      const response = await fetch(url, options);
      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        setMessage(result.message ?? "操作失败，请稍后再试。");
        return;
      }

      reset?.();
      setIsSuccess(true);
      setMessage(result.message ?? successMessage);
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setPendingAction("");
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await submitRequest(
      "/api/staff/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, displayName, password, role }),
      },
      "员工账号已创建。",
      () => {
        setUsername("");
        setDisplayName("");
        setPassword("");
        setRole("staff");
      },
    );
  }

  async function updateUser(userId: string, payload: { role?: StaffRole; isActive?: boolean }) {
    await submitRequest(
      `/api/staff/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      "员工账号已更新。",
    );
  }

  async function resetPassword(userId: string) {
    await submitRequest(
      `/api/staff/users/${userId}/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: resetPasswords[userId] ?? "",
          confirmPassword: resetConfirmations[userId] ?? "",
        }),
      },
      "员工密码已重置。",
      () => {
        setResetPasswords((current) => ({ ...current, [userId]: "" }));
        setResetConfirmations((current) => ({ ...current, [userId]: "" }));
      },
    );
  }

  return (
    <div className="grid gap-6">
      <form className="rounded-card border border-line bg-white p-6 shadow-soft" onSubmit={handleCreate}>
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-card bg-mist text-teal">
            <Plus aria-hidden="true" />
          </span>
          <div>
            <p className="m-0 text-sm font-bold text-coral">新增员工</p>
            <h2 className="m-0 text-[24px] font-extrabold leading-tight">创建员工账号</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-muted">
            员工账号
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="例如 staff01"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            员工姓名
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例如 小林"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            初始密码
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            角色
            <select value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
              <option value="staff">普通员工</option>
              <option value="admin">管理员</option>
            </select>
          </label>
        </div>

        <button className="primary-btn mt-5" disabled={Boolean(pendingAction)} type="submit">
          <Plus aria-hidden="true" />
          创建账号
        </button>
      </form>

      {message ? (
        <p
          className={`m-0 rounded-card border px-4 py-3 text-sm font-bold ${
            isSuccess
              ? "border-teal/30 bg-teal/10 text-teal"
              : "border-coral/30 bg-coral/10 text-coral"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;

          return (
            <article className="rounded-card border border-line bg-white p-5 shadow-soft" key={user.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-xl font-extrabold">{user.displayName}</h3>
                    <span className="rounded-card bg-mist px-2 py-1 text-xs font-bold text-teal">
                      {user.role === "admin" ? "管理员" : "普通员工"}
                    </span>
                    <span
                      className={`rounded-card px-2 py-1 text-xs font-bold ${
                        user.isActive ? "bg-teal/10 text-teal" : "bg-coral/10 text-coral"
                      }`}
                    >
                      {user.isActive ? "已启用" : "已停用"}
                    </span>
                    {isCurrentUser ? (
                      <span className="rounded-card bg-[#f6d18b]/30 px-2 py-1 text-xs font-bold text-ink">
                        当前账号
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 text-sm text-muted">
                    账号：{user.username} · 创建：{formatDateTime(user.createdAt)} · 更新：
                    {formatDateTime(user.updatedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="secondary-btn border-line bg-white text-ink"
                    disabled={Boolean(pendingAction) || isCurrentUser || user.role === "admin"}
                    onClick={() => updateUser(user.id, { role: "admin" })}
                    type="button"
                  >
                    <ShieldCheck aria-hidden="true" />
                    设为管理员
                  </button>
                  <button
                    className="secondary-btn border-line bg-white text-ink"
                    disabled={Boolean(pendingAction) || isCurrentUser || user.role === "staff"}
                    onClick={() => updateUser(user.id, { role: "staff" })}
                    type="button"
                  >
                    <UserX aria-hidden="true" />
                    设为员工
                  </button>
                  <button
                    className="secondary-btn border-line bg-white text-ink"
                    disabled={Boolean(pendingAction) || isCurrentUser}
                    onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                    type="button"
                  >
                    <CheckCircle2 aria-hidden="true" />
                    {user.isActive ? "停用" : "启用"}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 border-t border-line pt-5 md:grid-cols-[1fr_1fr_auto]">
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={isCurrentUser}
                  value={resetPasswords[user.id] ?? ""}
                  onChange={(event) =>
                    setResetPasswords((current) => ({ ...current, [user.id]: event.target.value }))
                  }
                  placeholder={isCurrentUser ? "自己的密码请到修改密码页面更新" : "新密码，至少 8 位"}
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={isCurrentUser}
                  value={resetConfirmations[user.id] ?? ""}
                  onChange={(event) =>
                    setResetConfirmations((current) => ({
                      ...current,
                      [user.id]: event.target.value,
                    }))
                  }
                  placeholder="再次输入新密码"
                />
                <button
                  className="primary-btn"
                  disabled={Boolean(pendingAction) || isCurrentUser}
                  onClick={() => resetPassword(user.id)}
                  type="button"
                >
                  <KeyRound aria-hidden="true" />
                  重置密码
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
