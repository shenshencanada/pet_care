"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock3, MessageSquareText, Phone, Plus, X } from "lucide-react";
import {
  APPOINTMENT_PACKAGES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TIME_SLOTS,
  AppointmentStatus,
  AppointmentView,
} from "../../../lib/appointments";

type CalendarDay = {
  value: string;
  label: string;
  weekday: string;
};

type ApiResult = {
  message?: string;
};

type AppointmentCalendarBoardProps = {
  appointments: AppointmentView[];
  days: CalendarDay[];
};

type TodayAppointmentsViewProps = {
  appointments: AppointmentView[];
};

type SearchAppointmentsViewProps = {
  appointments: AppointmentView[];
  error: string;
  query: string;
};

const statusClassNames: Record<AppointmentStatus, string> = {
  pending: "bg-coral/10 text-coral",
  confirmed: "bg-teal/10 text-teal",
  arrived: "bg-[#f6d18b]/40 text-ink",
  completed: "bg-mist text-teal",
  canceled: "bg-line text-muted",
};

const sourceLabels: Record<AppointmentView["source"], string> = {
  quick: "快速预约",
  full: "完整预约",
  staff: "后台录入",
  api: "外部 API",
};

async function readApiResult(response: Response) {
  const text = await response.text();

  if (!text) {
    return {} as ApiResult;
  }

  try {
    return JSON.parse(text) as ApiResult;
  } catch {
    return {} as ApiResult;
  }
}

function getContactName(appointment: AppointmentView) {
  return appointment.contactName ?? (appointment.source === "quick" ? "快速预约客户" : "未留称呼");
}

function getPetSummary(appointment: AppointmentView) {
  return [appointment.petName, appointment.petType, appointment.packageName].filter(Boolean).join(" / ");
}

function getEditableContactName(value: string, appointment: AppointmentView) {
  return value.trim() || (appointment.source === "quick" ? "快速预约客户" : "未留称呼");
}

function AppointmentEditor({
  children,
}: {
  children: (openAppointment: (appointment: AppointmentView) => void) => React.ReactNode;
}) {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentView | null>(null);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [packageName, setPackageName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [status, setStatus] = useState<AppointmentStatus>("pending");
  const [staffNote, setStaffNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function openAppointment(appointment: AppointmentView) {
    setSelectedAppointment(appointment);
    setContactName(appointment.contactName ?? "");
    setPhone(appointment.phone ?? "");
    setPetName(appointment.petName ?? "");
    setPetType(appointment.petType ?? "");
    setPackageName(appointment.packageName ?? "");
    setAppointmentDate(appointment.appointmentDate ?? "");
    setAppointmentTime(appointment.appointmentTime || APPOINTMENT_TIME_SLOTS[0]);
    setStatus(appointment.status);
    setStaffNote(appointment.staffNote ?? "");
    setMessage("");
  }

  async function updateAppointment() {
    if (!selectedAppointment) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactName,
          phone,
          petName,
          petType,
          packageName,
          appointmentDate,
          appointmentTime,
          status,
          staffNote,
        }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "预约更新失败，请稍后再试。");
        return;
      }

      setMessage(result.message ?? "预约已更新。");
      router.refresh();
      window.setTimeout(() => setSelectedAppointment(null), 450);
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {children(openAppointment)}

      {selectedAppointment ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 px-4 py-8 backdrop-blur-sm">
          <section className="max-h-[calc(100vh-64px)] w-full max-w-[720px] overflow-y-auto rounded-card bg-white p-6 text-ink shadow-soft">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-sm font-bold text-coral">预约详情</p>
                <h2 className="mb-2 mt-1 text-[28px] font-extrabold leading-tight">
                  {getEditableContactName(contactName, selectedAppointment)}
                </h2>
                <div className="flex flex-wrap gap-2 text-sm font-bold text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 aria-hidden="true" />
                    {appointmentDate || selectedAppointment.appointmentDate}{" "}
                    {appointmentTime || selectedAppointment.appointmentTime}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone aria-hidden="true" />
                    {phone || "未填写手机"}
                  </span>
                </div>
              </div>
              <button
                className="icon-btn h-11 w-11 bg-mist text-ink"
                onClick={() => setSelectedAppointment(null)}
                type="button"
                aria-label="关闭预约详情"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-card border border-line bg-paper p-4">
                <p className="m-0 text-xs font-bold text-muted">宠物和套餐</p>
                <p className="mb-0 mt-2 font-extrabold">
                  {[petName, petType, packageName].filter(Boolean).join(" / ") || "未选择套餐"}
                </p>
              </div>
              <div className="rounded-card border border-line bg-paper p-4">
                <p className="m-0 text-xs font-bold text-muted">来源</p>
                <p className="mb-0 mt-2 font-extrabold">{sourceLabels[selectedAppointment.source]}</p>
              </div>
            </div>

            <div className="mt-4 rounded-card border border-line bg-paper p-4">
              <p className="m-0 flex items-center gap-2 text-xs font-bold text-muted">
                <MessageSquareText aria-hidden="true" />
                客户备注
              </p>
              <p className="mb-0 mt-2 leading-[1.7] text-muted">
                {selectedAppointment.customerNote || "客户暂未填写备注。"}
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-muted">
                  联系人称呼
                  <input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="例如：王女士"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-muted">
                  手机号码
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="用于确认预约"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-muted">
                宠物名字
                <input value={petName} onChange={(event) => setPetName(event.target.value)} placeholder="例如：团子" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-muted">
                  宠物类型
                  <input value={petType} onChange={(event) => setPetType(event.target.value)} placeholder="例如：小型犬 / 猫咪" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-muted">
                  套餐选择
                  <select value={packageName} onChange={(event) => setPackageName(event.target.value)}>
                    <option value="">暂未选择</option>
                    {APPOINTMENT_PACKAGES.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-muted">
                  预约日期
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(event) => setAppointmentDate(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-muted">
                  预约时段
                  <select value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)}>
                    {APPOINTMENT_TIME_SLOTS.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-muted">
                预约状态
                <select value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)}>
                  {APPOINTMENT_STATUSES.map((item) => (
                    <option value={item} key={item}>
                      {APPOINTMENT_STATUS_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-muted">
                员工备注
                <textarea
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  placeholder="记录确认时间、到店情况、护理注意事项或取消原因"
                />
              </label>
            </div>

            {selectedAppointment.handledByStaffName ? (
              <p className="mb-0 mt-3 text-xs font-bold text-muted">
                上次处理：{selectedAppointment.handledByStaffName}
              </p>
            ) : null}

            {selectedAppointment.customerId ? (
              <Link className="mt-3 inline-flex text-sm font-black text-coral" href={`/staff/customers/${selectedAppointment.customerId}`}>
                查看客户档案
              </Link>
            ) : null}

            {message ? (
              <p
                className={`mb-0 mt-4 rounded-card border px-4 py-3 text-sm font-bold ${
                  message.includes("失败") || message.includes("不可用") || message.includes("请选择")
                    ? "border-coral/30 bg-coral/10 text-coral"
                    : "border-teal/30 bg-teal/10 text-teal"
                }`}
              >
                {message}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className="secondary-btn border-line bg-white text-ink"
                onClick={() => setSelectedAppointment(null)}
                type="button"
              >
                取消
              </button>
              <button className="primary-btn" disabled={isSaving} onClick={updateAppointment} type="button">
                <CalendarCheck aria-hidden="true" />
                {isSaving ? "保存中" : "保存处理结果"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function CreateAppointmentButton({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [packageName, setPackageName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [appointmentTime, setAppointmentTime] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [customerNote, setCustomerNote] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("confirmed");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function openForm() {
    setContactName("");
    setPhone("");
    setPetName("");
    setPetType("");
    setPackageName("");
    setAppointmentDate(defaultDate);
    setAppointmentTime(APPOINTMENT_TIME_SLOTS[0]);
    setCustomerNote("");
    setStaffNote("");
    setStatus("confirmed");
    setMessage("");
    setIsOpen(true);
  }

  async function createAppointment() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/staff/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactName,
          phone,
          petName,
          petType,
          packageName,
          appointmentDate,
          appointmentTime,
          customerNote,
          staffNote,
          status,
        }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "预约创建失败，请稍后再试。");
        return;
      }

      setMessage(result.message ?? "预约已新增。");
      router.refresh();
      window.setTimeout(() => setIsOpen(false), 450);
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button className="primary-btn" onClick={openForm} type="button">
        <Plus aria-hidden="true" />
        新增预约
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 px-4 py-8 backdrop-blur-sm">
          <section className="max-h-[calc(100vh-64px)] w-full max-w-[720px] overflow-y-auto rounded-card bg-white p-6 text-ink shadow-soft">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-sm font-bold text-coral">后台录入</p>
                <h2 className="mb-2 mt-1 text-[28px] font-extrabold leading-tight">新增预约</h2>
                <p className="m-0 text-sm font-bold text-muted">用于电话、微信或到店现场登记。</p>
              </div>
              <button
                className="icon-btn h-11 w-11 bg-mist text-ink"
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="关闭新增预约"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-muted">
                  联系人称呼
                  <input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="例如：王女士"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-muted">
                  手机号码
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="用于确认预约" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-muted">
                  宠物名字
                  <input value={petName} onChange={(event) => setPetName(event.target.value)} placeholder="例如：团子" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-muted">
                  宠物类型
                  <input value={petType} onChange={(event) => setPetType(event.target.value)} placeholder="例如：小型犬 / 猫咪" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-muted">
                  套餐选择
                  <select value={packageName} onChange={(event) => setPackageName(event.target.value)}>
                    <option value="">暂未选择</option>
                    {APPOINTMENT_PACKAGES.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-muted">
                  预约日期
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(event) => setAppointmentDate(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-muted">
                  预约时段
                  <select value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)}>
                    {APPOINTMENT_TIME_SLOTS.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-bold text-muted">
                预约状态
                <select value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)}>
                  {APPOINTMENT_STATUSES.map((item) => (
                    <option value={item} key={item}>
                      {APPOINTMENT_STATUS_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-muted">
                客户备注
                <textarea
                  value={customerNote}
                  onChange={(event) => setCustomerNote(event.target.value)}
                  placeholder="记录客户原始需求，例如宠物性格、掉毛、打结或指定护理"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-muted">
                员工备注
                <textarea
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  placeholder="记录确认过程、服务提醒或内部注意事项"
                />
              </label>
            </div>

            {message ? (
              <p
                className={`mb-0 mt-4 rounded-card border px-4 py-3 text-sm font-bold ${
                  message.includes("失败") ||
                  message.includes("不可用") ||
                  message.includes("请选择") ||
                  message.includes("格式") ||
                  message.includes("有效")
                    ? "border-coral/30 bg-coral/10 text-coral"
                    : "border-teal/30 bg-teal/10 text-teal"
                }`}
              >
                {message}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className="secondary-btn border-line bg-white text-ink"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                取消
              </button>
              <button className="primary-btn" disabled={isSaving} onClick={createAppointment} type="button">
                <CalendarCheck aria-hidden="true" />
                {isSaving ? "保存中" : "保存预约"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function AppointmentCard({
  appointment,
  onOpen,
  compact = false,
  showDate = false,
}: {
  appointment: AppointmentView;
  onOpen: (appointment: AppointmentView) => void;
  compact?: boolean;
  showDate?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<AppointmentStatus | null>(null);
  const quickActions: Array<{ label: string; status: AppointmentStatus }> =
    appointment.status === "pending"
      ? [
          { label: "确认", status: "confirmed" },
          { label: "取消", status: "canceled" },
        ]
      : appointment.status === "confirmed"
        ? [
            { label: "到店", status: "arrived" },
            { label: "取消", status: "canceled" },
          ]
        : appointment.status === "arrived"
          ? [
              { label: "完成", status: "completed" },
              { label: "取消", status: "canceled" },
            ]
          : [];

  async function updateStatus(nextStatus: AppointmentStatus) {
    setUpdatingStatus(nextStatus);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactName: appointment.contactName ?? "",
          phone: appointment.phone,
          petName: appointment.petName ?? "",
          petType: appointment.petType,
          packageName: appointment.packageName ?? "",
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          status: nextStatus,
          staffNote: appointment.staffNote ?? "",
        }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "状态更新失败，请稍后再试。");
        return;
      }

      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setUpdatingStatus(null);
    }
  }

  return (
    <div
      className={`w-full rounded-card border border-line bg-paper p-3 text-left transition hover:-translate-y-px hover:border-teal ${
        compact ? "" : "shadow-[0_8px_20px_rgba(23,33,31,0.06)]"
      }`}
    >
      <button className="w-full text-left" onClick={() => onOpen(appointment)} type="button">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-black text-teal">
            {showDate ? `${appointment.appointmentDate} ` : ""}
            {appointment.appointmentTime}
          </span>
          <span className={`rounded-card px-2 py-1 text-xs font-black ${statusClassNames[appointment.status]}`}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </span>
        </div>
        <strong className="block text-sm leading-tight text-ink">{getContactName(appointment)}</strong>
        <span className="mt-1 block text-xs leading-[1.55] text-muted">
          {appointment.phone} · {getPetSummary(appointment) || appointment.petType}
        </span>
        {appointment.customerNote ? (
          <span className="mt-2 line-clamp-2 block text-xs leading-[1.55] text-muted">{appointment.customerNote}</span>
        ) : null}
      </button>
      {quickActions.length ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {quickActions.map((action) => (
            <button
              className={`rounded-card px-3 py-1.5 text-xs font-black transition ${
                action.status === "canceled"
                  ? "bg-line text-muted hover:bg-coral/10 hover:text-coral"
                  : "bg-teal/10 text-teal hover:bg-teal hover:text-white"
              }`}
              disabled={updatingStatus !== null}
              key={action.status}
              onClick={() => updateStatus(action.status)}
              type="button"
            >
              {updatingStatus === action.status ? "更新中" : action.label}
            </button>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="mb-0 mt-2 rounded-card border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function SearchAppointmentsView({ appointments, error, query }: SearchAppointmentsViewProps) {
  return (
    <AppointmentEditor>
      {(openAppointment) => (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-bold text-coral">搜索结果</p>
              <h3 className="mb-1 mt-1 text-2xl font-extrabold">“{query}”</h3>
              <p className="m-0 text-sm font-bold text-muted">
                {error ? "请调整关键词后重新搜索。" : `共找到 ${appointments.length} 条近期预约。`}
              </p>
            </div>
          </div>

          {error ? (
            <p className="m-0 rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-bold text-coral">
              {error}
            </p>
          ) : appointments.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {appointments.map((appointment) => (
                <AppointmentCard appointment={appointment} key={appointment.id} onOpen={openAppointment} showDate />
              ))}
            </div>
          ) : (
            <p className="m-0 rounded-card bg-paper px-4 py-8 text-center text-sm font-bold text-muted">
              没有找到匹配预约
            </p>
          )}
        </section>
      )}
    </AppointmentEditor>
  );
}

export function TodayAppointmentsView({ appointments }: TodayAppointmentsViewProps) {
  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, AppointmentView[]>();

    for (const time of APPOINTMENT_TIME_SLOTS) {
      groups.set(time, []);
    }

    for (const appointment of appointments) {
      groups.get(appointment.appointmentTime)?.push(appointment);
    }

    for (const time of APPOINTMENT_TIME_SLOTS) {
      const slotAppointments = groups.get(time) ?? [];

      slotAppointments.sort((current, next) => {
        const currentStatusIndex = APPOINTMENT_STATUSES.indexOf(current.status);
        const nextStatusIndex = APPOINTMENT_STATUSES.indexOf(next.status);

        if (currentStatusIndex !== nextStatusIndex) {
          return currentStatusIndex - nextStatusIndex;
        }

        return new Date(current.createdAt).getTime() - new Date(next.createdAt).getTime();
      });
    }

    return groups;
  }, [appointments]);

  return (
    <AppointmentEditor>
      {(openAppointment) => (
        <div className="grid gap-4">
          {APPOINTMENT_TIME_SLOTS.map((time) => {
            const slotAppointments = groupedAppointments.get(time) ?? [];
            const statusCounts = APPOINTMENT_STATUSES.map((status) => ({
              status,
              count: slotAppointments.filter((appointment) => appointment.status === status).length,
            }));

            return (
              <section className="rounded-card border border-line bg-white p-4 shadow-soft" key={time}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[24px] font-black leading-tight text-teal">{time}</p>
                    <p className="m-0 text-sm font-bold text-muted">{slotAppointments.length} 条预约</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusCounts.map(({ status, count }) => (
                      <span className={`rounded-card px-2.5 py-1 text-xs font-black ${statusClassNames[status]}`} key={status}>
                        {APPOINTMENT_STATUS_LABELS[status]} {count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {slotAppointments.length ? (
                    slotAppointments.map((appointment) => (
                      <AppointmentCard appointment={appointment} key={appointment.id} onOpen={openAppointment} />
                    ))
                  ) : (
                    <p className="m-0 rounded-card bg-paper px-3 py-6 text-center text-sm font-bold text-muted">
                      暂无预约
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppointmentEditor>
  );
}

export function AppointmentCalendarBoard({ appointments, days }: AppointmentCalendarBoardProps) {
  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, AppointmentView[]>();

    for (const appointment of appointments) {
      const key = `${appointment.appointmentDate}-${appointment.appointmentTime}`;
      const current = groups.get(key) ?? [];
      current.push(appointment);
      groups.set(key, current);
    }

    return groups;
  }, [appointments]);

  return (
    <AppointmentEditor>
      {(openAppointment) => (
        <>
          <div className="grid gap-4 md:hidden">
        {days.map((day) => {
          const dayAppointments = appointments.filter((appointment) => appointment.appointmentDate === day.value);

          return (
            <section className="rounded-card border border-line bg-white p-4 shadow-soft" key={day.value}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="m-0 text-xl font-extrabold">{day.weekday}</h3>
                <span className="text-sm font-bold text-muted">{day.label}</span>
              </div>
              <div className="grid gap-3">
                {dayAppointments.length ? (
                  dayAppointments.map((appointment) => (
                    <AppointmentCard appointment={appointment} compact key={appointment.id} onOpen={openAppointment} />
                  ))
                ) : (
                  <p className="m-0 rounded-card bg-paper px-3 py-6 text-center text-sm font-bold text-muted">
                    暂无预约
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-card border border-line bg-white shadow-soft md:block">
        <div className="grid min-w-[980px] grid-cols-[104px_repeat(7,minmax(120px,1fr))]">
          <div className="border-b border-r border-line bg-mist p-3 text-sm font-extrabold text-muted">
            时段
          </div>
          {days.map((day) => (
            <div className="border-b border-r border-line bg-mist p-3 last:border-r-0" key={day.value}>
              <p className="m-0 text-sm font-extrabold text-ink">{day.weekday}</p>
              <p className="m-0 text-xs font-bold text-muted">{day.label}</p>
            </div>
          ))}

          {APPOINTMENT_TIME_SLOTS.map((time) => (
            <Fragment key={time}>
              <div
                className="border-b border-r border-line bg-paper p-3 text-sm font-black text-teal"
              >
                {time}
              </div>
              {days.map((day) => {
                const slotAppointments = groupedAppointments.get(`${day.value}-${time}`) ?? [];

                return (
                  <div
                    className="min-h-[154px] border-b border-r border-line bg-white p-2.5 last:border-r-0"
                    key={`${day.value}-${time}`}
                  >
                    <div className="grid gap-2">
                      {slotAppointments.length ? (
                        slotAppointments.map((appointment) => (
                          <AppointmentCard appointment={appointment} key={appointment.id} onOpen={openAppointment} />
                        ))
                      ) : (
                        <span className="block py-8 text-center text-xs font-bold text-muted/70">暂无预约</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
        </>
      )}
    </AppointmentEditor>
  );
}
