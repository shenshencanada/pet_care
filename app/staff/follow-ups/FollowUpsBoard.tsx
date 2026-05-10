"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Save } from "lucide-react";
import {
  APPOINTMENT_PACKAGES,
  APPOINTMENT_TIME_SLOTS,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_STATUSES,
  FollowUpStatus,
  FollowUpView,
} from "../../../lib/appointments";

type ApiResult = {
  message?: string;
};

type FollowUpSection = {
  title: string;
  description: string;
  followUps: FollowUpView[];
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

function getPetSummary(followUp: FollowUpView) {
  return [followUp.petName, followUp.petType, followUp.packageName].filter(Boolean).join(" / ");
}

function FollowUpCard({ followUp }: { followUp: FollowUpView }) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowUpStatus>(followUp.status);
  const [contactNote, setContactNote] = useState(followUp.contactNote ?? "");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(followUp.nextFollowUpDate ?? "");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [packageName, setPackageName] = useState(followUp.packageName ?? "");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  async function saveFollowUp() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/follow-ups/${followUp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, contactNote, nextFollowUpDate }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "回访记录保存失败。");
        return;
      }

      setMessage(result.message ?? "回访记录已保存。");
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function createAppointment() {
    setIsBooking(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/follow-ups/${followUp.id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: followUp.customerName ?? "",
          packageName,
          appointmentDate,
          appointmentTime,
          customerNote: appointmentNote,
          staffNote: contactNote,
          status: "confirmed",
        }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "预约创建失败。");
        return;
      }

      setMessage(result.message ?? "预约已创建。");
      setStatus("booked");
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <article className="rounded-card border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-black text-coral">
            回访日 {followUp.dueDate} · {FOLLOW_UP_STATUS_LABELS[followUp.status]}
          </p>
          <h3 className="mb-1 mt-2 text-lg font-extrabold">{followUp.customerName || "未留称呼"}</h3>
          <p className="m-0 text-sm font-bold text-muted">{followUp.phone}</p>
        </div>
        <a className="text-sm font-black text-teal hover:text-coral" href={`/staff/customers/${followUp.customerId}`}>
          客户档案
        </a>
      </div>

      <div className="mt-3 grid gap-2 text-sm font-bold text-muted">
        <p className="m-0">宠物：{getPetSummary(followUp) || "未填写宠物信息"}</p>
        <p className="m-0">上次服务：{followUp.appointmentDate || "手动提醒"} · {followUp.packageName || "未选套餐"}</p>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-muted">
            回访状态
            <select value={status} onChange={(event) => setStatus(event.target.value as FollowUpStatus)}>
              {FOLLOW_UP_STATUSES.map((item) => (
                <option value={item} key={item}>
                  {FOLLOW_UP_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            下次回访
            <input type="date" value={nextFollowUpDate} onChange={(event) => setNextFollowUpDate(event.target.value)} />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-bold text-muted">
          回访备注
          <textarea value={contactNote} onChange={(event) => setContactNote(event.target.value)} placeholder="记录客户反馈、未接通原因或下次沟通点" />
        </label>
      </div>

      <div className="mt-4 rounded-card border border-line bg-white p-3">
        <p className="m-0 text-sm font-bold text-coral">转新预约</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-muted">
            预约日期
            <input type="date" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} />
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
          <label className="grid gap-2 text-sm font-bold text-muted">
            套餐
            <select value={packageName} onChange={(event) => setPackageName(event.target.value)}>
              <option value="">暂未选择</option>
              {APPOINTMENT_PACKAGES.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            预约备注
            <input value={appointmentNote} onChange={(event) => setAppointmentNote(event.target.value)} placeholder="客户约定时间或需求" />
          </label>
        </div>
      </div>

      {message ? (
        <p className={`mb-0 mt-3 rounded-card border px-3 py-2 text-sm font-bold ${message.includes("失败") || message.includes("不可用") || message.includes("格式") ? "border-coral/30 bg-coral/10 text-coral" : "border-teal/30 bg-teal/10 text-teal"}`}>
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button className="secondary-btn border-line bg-white text-ink" disabled={isSaving} onClick={saveFollowUp} type="button">
          <Save aria-hidden="true" />
          {isSaving ? "保存中" : "保存回访"}
        </button>
        <button className="primary-btn" disabled={isBooking} onClick={createAppointment} type="button">
          <CalendarCheck aria-hidden="true" />
          {isBooking ? "创建中" : "创建预约"}
        </button>
      </div>
    </article>
  );
}

export function FollowUpsBoard({ sections }: { sections: FollowUpSection[] }) {
  return (
    <div className="grid gap-5">
      {sections.map((section) => (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft" key={section.title}>
          <div className="mb-4">
            <p className="m-0 text-sm font-bold text-coral">{section.description}</p>
            <h2 className="mb-0 mt-1 text-2xl font-extrabold">
              {section.title} · {section.followUps.length}
            </h2>
          </div>
          {section.followUps.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {section.followUps.map((followUp) => (
                <FollowUpCard followUp={followUp} key={followUp.id} />
              ))}
            </div>
          ) : (
            <p className="m-0 rounded-card bg-paper px-4 py-8 text-center text-sm font-bold text-muted">
              暂无回访任务
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
