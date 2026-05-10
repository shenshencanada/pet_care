"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus } from "lucide-react";
import { FOLLOW_UP_STATUS_LABELS, FollowUpStatus } from "../../../../lib/appointments";

type Customer = {
  id: string;
  displayName: string;
  phone: string;
  wechatId: string;
  note: string;
};

type Pet = {
  id: string;
  name: string;
  petType: string;
  breed: string;
  gender: string;
  ageText: string;
  weightText: string;
  careNotes: string;
};

type FollowUp = {
  id: string;
  petId: string;
  petName: string;
  petType: string;
  dueDate: string;
  status: FollowUpStatus;
  contactNote: string;
  nextFollowUpDate: string;
};

type ApiResult = {
  message?: string;
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

function PetForm({ customerId, pet }: { customerId: string; pet: Pet }) {
  const router = useRouter();
  const [name, setName] = useState(pet.name);
  const [petType, setPetType] = useState(pet.petType);
  const [breed, setBreed] = useState(pet.breed);
  const [gender, setGender] = useState(pet.gender);
  const [ageText, setAgeText] = useState(pet.ageText);
  const [weightText, setWeightText] = useState(pet.weightText);
  const [careNotes, setCareNotes] = useState(pet.careNotes);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function savePet() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/customers/${customerId}/pets/${pet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, petType, breed, gender, ageText, weightText, careNotes }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "宠物档案保存失败。");
        return;
      }

      setMessage(result.message ?? "宠物档案已保存。");
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-card border border-line bg-paper p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-muted">
          宠物名字
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：团子" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-muted">
          宠物类型
          <input value={petType} onChange={(event) => setPetType(event.target.value)} placeholder="例如：小型犬 / 猫咪" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-muted">
          品种
          <input value={breed} onChange={(event) => setBreed(event.target.value)} placeholder="例如：比熊 / 布偶" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-muted">
          性别
          <input value={gender} onChange={(event) => setGender(event.target.value)} placeholder="例如：妹妹 / 已绝育" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-muted">
          年龄
          <input value={ageText} onChange={(event) => setAgeText(event.target.value)} placeholder="例如：3岁" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-muted">
          体重
          <input value={weightText} onChange={(event) => setWeightText(event.target.value)} placeholder="例如：5.6kg" />
        </label>
      </div>
      <label className="mt-4 grid gap-2 text-sm font-bold text-muted">
        护理注意事项
        <textarea value={careNotes} onChange={(event) => setCareNotes(event.target.value)} placeholder="怕吹风、皮肤敏感、毛结位置等" />
      </label>
      {message ? (
        <p className={`mb-0 mt-3 rounded-card border px-3 py-2 text-sm font-bold ${message.includes("失败") || message.includes("不可用") ? "border-coral/30 bg-coral/10 text-coral" : "border-teal/30 bg-teal/10 text-teal"}`}>
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <button className="primary-btn" disabled={isSaving} onClick={savePet} type="button">
          <Save aria-hidden="true" />
          {isSaving ? "保存中" : "保存宠物"}
        </button>
      </div>
    </article>
  );
}

function NewPetForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [petType, setPetType] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function createPet() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/customers/${customerId}/pets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, petType }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "宠物档案保存失败。");
        return;
      }

      setName("");
      setPetType("");
      setMessage(result.message ?? "宠物档案已保存。");
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-card border border-dashed border-line bg-white p-4">
      <p className="m-0 text-sm font-bold text-coral">新增宠物</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-muted">
          宠物名字
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：团子" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-muted">
          宠物类型
          <input value={petType} onChange={(event) => setPetType(event.target.value)} placeholder="例如：小型犬 / 猫咪" />
        </label>
      </div>
      {message ? (
        <p className={`mb-0 mt-3 rounded-card border px-3 py-2 text-sm font-bold ${message.includes("失败") || message.includes("不可用") ? "border-coral/30 bg-coral/10 text-coral" : "border-teal/30 bg-teal/10 text-teal"}`}>
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <button className="primary-btn" disabled={isSaving} onClick={createPet} type="button">
          <Plus aria-hidden="true" />
          {isSaving ? "保存中" : "添加宠物"}
        </button>
      </div>
    </article>
  );
}

export function CustomerProfilePanel({ customer, pets }: { customer: Customer; pets: Pet[] }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(customer.displayName);
  const [phone, setPhone] = useState(customer.phone);
  const [wechatId, setWechatId] = useState(customer.wechatId);
  const [note, setNote] = useState(customer.note);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveCustomer() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, phone, wechatId, note }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "客户资料保存失败。");
        return;
      }

      setMessage(result.message ?? "客户资料已保存。");
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <p className="m-0 text-sm font-bold text-coral">客户资料</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-muted">
            客户称呼
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：王女士" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            手机号码
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="用于识别客户" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            微信号
            <input value={wechatId} onChange={(event) => setWechatId(event.target.value)} placeholder="可选" />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-bold text-muted">
          客户备注
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="联系偏好、回访说明或家庭多宠情况" />
        </label>
        {message ? (
          <p className={`mb-0 mt-3 rounded-card border px-3 py-2 text-sm font-bold ${message.includes("失败") || message.includes("不可用") ? "border-coral/30 bg-coral/10 text-coral" : "border-teal/30 bg-teal/10 text-teal"}`}>
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button className="primary-btn" disabled={isSaving} onClick={saveCustomer} type="button">
            <Save aria-hidden="true" />
            {isSaving ? "保存中" : "保存客户"}
          </button>
        </div>
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <div className="mb-4">
          <p className="m-0 text-sm font-bold text-coral">宠物档案</p>
          <h2 className="mb-0 mt-1 text-2xl font-extrabold">{pets.length} 只宠物</h2>
        </div>
        <div className="grid gap-4">
          {pets.map((pet) => (
            <PetForm customerId={customer.id} pet={pet} key={pet.id} />
          ))}
          <NewPetForm customerId={customer.id} />
        </div>
      </section>
    </div>
  );
}

export function CustomerFollowUpsPanel({
  customerId,
  pets,
  followUps,
}: {
  customerId: string;
  pets: Pet[];
  followUps: FollowUp[];
}) {
  const router = useRouter();
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function createFollowUp() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/customers/${customerId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, dueDate, contactNote }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(result.message ?? "回访提醒创建失败。");
        return;
      }

      setDueDate("");
      setContactNote("");
      setMessage(result.message ?? "回访提醒已新增。");
      router.refresh();
    } catch {
      setMessage("网络暂时不可用，请稍后再试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="mb-4">
        <p className="m-0 text-sm font-bold text-coral">回访记录</p>
        <h2 className="mb-0 mt-1 text-2xl font-extrabold">{followUps.length} 条记录</h2>
      </div>

      <div className="grid gap-3">
        {followUps.length ? (
          followUps.map((followUp) => (
            <article className="rounded-card border border-line bg-paper p-3" key={followUp.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-sm font-black text-teal">回访日：{followUp.dueDate}</p>
                  <p className="mb-0 mt-1 text-sm font-bold text-muted">
                    {[followUp.petName, followUp.petType].filter(Boolean).join(" / ") || "未填写宠物信息"}
                  </p>
                </div>
                <span className="rounded-card bg-mist px-2 py-1 text-xs font-black text-teal">
                  {FOLLOW_UP_STATUS_LABELS[followUp.status]}
                </span>
              </div>
              {followUp.contactNote ? (
                <p className="mb-0 mt-2 text-sm leading-[1.65] text-muted">{followUp.contactNote}</p>
              ) : null}
              {followUp.nextFollowUpDate ? (
                <p className="mb-0 mt-2 text-xs font-bold text-muted">下次回访：{followUp.nextFollowUpDate}</p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="m-0 rounded-card bg-paper px-4 py-6 text-center text-sm font-bold text-muted">
            暂无回访记录
          </p>
        )}
      </div>

      <article className="mt-4 rounded-card border border-dashed border-line bg-white p-4">
        <p className="m-0 text-sm font-bold text-coral">手动新增回访</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-muted">
            宠物
            <select value={petId} onChange={(event) => setPetId(event.target.value)}>
              {pets.map((pet) => (
                <option value={pet.id} key={pet.id}>
                  {[pet.name, pet.petType].filter(Boolean).join(" / ") || "未填写宠物"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-muted">
            回访日期
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>
        <label className="mt-3 grid gap-2 text-sm font-bold text-muted">
          备注
          <textarea value={contactNote} onChange={(event) => setContactNote(event.target.value)} placeholder="例如：皮肤敏感，建议两周后电话确认状态" />
        </label>
        {message ? (
          <p className={`mb-0 mt-3 rounded-card border px-3 py-2 text-sm font-bold ${message.includes("失败") || message.includes("不可用") ? "border-coral/30 bg-coral/10 text-coral" : "border-teal/30 bg-teal/10 text-teal"}`}>
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button className="primary-btn" disabled={isSaving || !pets.length} onClick={createFollowUp} type="button">
            <Plus aria-hidden="true" />
            {isSaving ? "保存中" : "新增回访"}
          </button>
        </div>
      </article>
    </section>
  );
}
