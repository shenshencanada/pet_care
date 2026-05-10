import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../lib/db";
import { getCurrentStaffUserResult } from "../../../../lib/staff-auth";
import {
  APPOINTMENT_TIME_SLOTS,
  AppointmentStatus,
  AppointmentView,
  isAppointmentPackage,
  isAppointmentStatus,
} from "../../../../lib/appointments";
import { STAFF_SESSION_COOKIE } from "../../../../lib/staff-session";
import {
  cleanOptionalText,
  cleanRequiredText,
  isLikelyPhone,
  upsertCustomerAndPet,
} from "../../../../lib/customers";
import { createFollowUpForCompletedAppointment } from "../../../../lib/follow-ups";

export const runtime = "nodejs";

type AppointmentRow = {
  id: string;
  source: "quick" | "full" | "staff";
  customer_id: string | null;
  pet_id: string | null;
  contact_name: string | null;
  phone: string | null;
  pet_name: string | null;
  pet_type: string | null;
  package_name: string | null;
  appointment_date: Date | string | null;
  appointment_time: string | null;
  customer_note: string | null;
  staff_note: string | null;
  status: AppointmentStatus;
  status_changed_at: Date | string;
  handled_by_staff_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type CreateAppointmentInput = {
  contactName?: string;
  phone?: string;
  petName?: string;
  petType?: string;
  packageName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  customerNote?: string;
  staffNote?: string;
  status?: AppointmentStatus;
};

function clearStaffSession(response: NextResponse) {
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

async function requireStaff(request: NextRequest) {
  const currentUserResult = await getCurrentStaffUserResult(
    request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    process.env.STAFF_SESSION_SECRET,
  );

  if (currentUserResult.status !== "ok") {
    const response = NextResponse.json({ message: "请先登录员工后台。" }, { status: 401 });

    return {
      error: currentUserResult.status === "inactive" ? clearStaffSession(response) : response,
    };
  }

  return { currentUser: currentUserResult.user };
}

function formatDateValue(value: Date | string | null) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toAppointmentView(row: AppointmentRow): AppointmentView {
  return {
    id: row.id,
    source: row.source,
    customerId: row.customer_id,
    petId: row.pet_id,
    contactName: row.contact_name,
    phone: row.phone ?? "",
    petName: row.pet_name,
    petType: row.pet_type ?? "未填写宠物类型",
    packageName: row.package_name,
    appointmentDate: formatDateValue(row.appointment_date),
    appointmentTime: row.appointment_time?.slice(0, 5) ?? "",
    customerNote: row.customer_note,
    staffNote: row.staff_note,
    status: row.status,
    statusChangedAt: new Date(row.status_changed_at).toISOString(),
    handledByStaffName: row.handled_by_staff_name,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function isValidDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cleanSearchQuery(value: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed.slice(0, 80);
}

function isValidSearchQuery(value: string) {
  if (!value) {
    return true;
  }

  if (/^\d+$/.test(value)) {
    return value.length >= 4;
  }

  return value.length >= 2;
}

function isValidTime(value: string | null) {
  return value !== null && APPOINTMENT_TIME_SLOTS.includes(value);
}

export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = request.nextUrl;
  const searchQuery = cleanSearchQuery(searchParams.get("q"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");

  if (searchQuery) {
    if (!isValidSearchQuery(searchQuery)) {
      return NextResponse.json({ message: "请输入至少 2 个字符，手机号请至少输入 4 位数字。" }, { status: 400 });
    }

    try {
      const today = new Date();
      const searchFrom = toDateValue(addDays(today, -30));
      const searchTo = toDateValue(addDays(today, 90));
      const digitsQuery = searchQuery.replace(/\D/g, "");
      const result = await getPool().query<AppointmentRow>(
        `select
           a.id,
           a.source,
           a.customer_id,
           a.pet_id,
           a.contact_name,
           a.phone,
           p.name as pet_name,
           a.pet_type,
           a.package_name,
           a.appointment_date,
           a.appointment_time::text as appointment_time,
           a.customer_note,
           a.staff_note,
           a.status,
           a.status_changed_at,
           s.display_name as handled_by_staff_name,
           a.created_at,
           a.updated_at
         from public.appointments a
         left join public.staff_users s on s.id = a.handled_by_staff_id
         left join public.pets p on p.id = a.pet_id
         where a.appointment_date between $1::date and $2::date
           and (
             coalesce(a.contact_name, '') ilike $3
             or coalesce(a.phone, '') ilike $3
             or coalesce(p.name, '') ilike $3
             or coalesce(a.pet_type, '') ilike $3
             or coalesce(a.package_name, '') ilike $3
             or coalesce(a.customer_note, '') ilike $3
             or coalesce(a.staff_note, '') ilike $3
             or ($4 <> '' and regexp_replace(coalesce(a.phone, ''), '\\D', '', 'g') like $5)
           )
         order by a.appointment_date desc, a.appointment_time asc, a.created_at desc
         limit 50`,
        [searchFrom, searchTo, `%${searchQuery}%`, digitsQuery, `%${digitsQuery}%`],
      );

      return NextResponse.json({ appointments: result.rows.map(toAppointmentView) });
    } catch (error) {
      console.error("Failed to search appointments", error);
      return NextResponse.json({ message: "预约搜索暂时不可用，请稍后再试。" }, { status: 500 });
    }
  }

  if (!isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json({ message: "请选择有效的查询日期范围。" }, { status: 400 });
  }

  if (status && status !== "all" && !isAppointmentStatus(status)) {
    return NextResponse.json({ message: "请选择有效的预约状态。" }, { status: 400 });
  }

  try {
    const params: Array<string> = [from, to];
    const statusCondition = status && status !== "all" ? "and a.status = $3" : "";

    if (status && status !== "all") {
      params.push(status);
    }

    const result = await getPool().query<AppointmentRow>(
      `select
         a.id,
         a.source,
         a.customer_id,
         a.pet_id,
         a.contact_name,
         a.phone,
         p.name as pet_name,
         a.pet_type,
         a.package_name,
         a.appointment_date,
         a.appointment_time::text as appointment_time,
         a.customer_note,
         a.staff_note,
         a.status,
         a.status_changed_at,
         s.display_name as handled_by_staff_name,
         a.created_at,
         a.updated_at
       from public.appointments a
       left join public.staff_users s on s.id = a.handled_by_staff_id
       left join public.pets p on p.id = a.pet_id
       where a.appointment_date between $1::date and $2::date
       ${statusCondition}
       order by a.appointment_date asc, a.appointment_time asc, a.created_at asc`,
      params,
    );

    return NextResponse.json({ appointments: result.rows.map(toAppointmentView) });
  } catch (error) {
    console.error("Failed to list appointments", error);
    return NextResponse.json({ message: "预约列表暂时不可用，请稍后再试。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: CreateAppointmentInput;

  try {
    input = (await request.json()) as CreateAppointmentInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const contactName = cleanOptionalText(input.contactName, 40);
  const phone = cleanRequiredText(input.phone, 30);
  const petName = cleanOptionalText(input.petName, 60);
  const petType = cleanRequiredText(input.petType, 40);
  const packageName = cleanOptionalText(input.packageName, 40);
  const appointmentDate = cleanRequiredText(input.appointmentDate, 10);
  const appointmentTime = cleanRequiredText(input.appointmentTime, 5);
  const customerNote = cleanOptionalText(input.customerNote, 500);
  const staffNote = cleanOptionalText(input.staffNote, 800);
  const status = input.status ?? "confirmed";

  if (!isLikelyPhone(phone)) {
    return NextResponse.json({ message: "请填写可联系的手机号码。" }, { status: 400 });
  }

  if (!petType) {
    return NextResponse.json({ message: "请选择宠物类型。" }, { status: 400 });
  }

  if (!appointmentDate || !appointmentTime) {
    return NextResponse.json({ message: "请选择预约日期和时段。" }, { status: 400 });
  }

  if (!isValidDate(appointmentDate) || !isValidTime(appointmentTime)) {
    return NextResponse.json({ message: "预约日期或时段格式不正确。" }, { status: 400 });
  }

  if (!isAppointmentStatus(status)) {
    return NextResponse.json({ message: "请选择有效的预约状态。" }, { status: 400 });
  }

  if (!isAppointmentPackage(packageName)) {
    return NextResponse.json({ message: "请选择有效的预约套餐。" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("begin");
      const { customerId, petId } = await upsertCustomerAndPet(client, {
        contactName,
        phone,
        petName,
        petType,
      });
      const result = await client.query<{ id: string }>(
        `insert into public.appointments
          (source, customer_id, pet_id, contact_name, phone, pet_type, package_name, appointment_date, appointment_time, customer_note, staff_note, status, handled_by_staff_id)
         values
          ('staff', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning id`,
        [
          customerId,
          petId,
          contactName,
          phone,
          petType,
          packageName,
          appointmentDate,
          appointmentTime,
          customerNote,
          staffNote,
          status,
          auth.currentUser.id,
        ],
      );

      if (status === "completed") {
        await createFollowUpForCompletedAppointment(client, result.rows[0].id);
      }

      await client.query("commit");

      return NextResponse.json({ id: result.rows[0].id, message: "预约已新增。" }, { status: 201 });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to create staff appointment", error);
    return NextResponse.json({ message: "预约创建失败，请稍后再试。" }, { status: 500 });
  }
}
