import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../../lib/db";
import { getCurrentStaffUserResult } from "../../../../../lib/staff-auth";
import {
  APPOINTMENT_TIME_SLOTS,
  AppointmentStatus,
  isAppointmentPackage,
  isAppointmentStatus,
} from "../../../../../lib/appointments";
import { STAFF_SESSION_COOKIE } from "../../../../../lib/staff-session";
import {
  cleanOptionalText,
  cleanRequiredText,
  isLikelyPhone,
  upsertCustomerAndPet,
} from "../../../../../lib/customers";
import { createFollowUpForCompletedAppointment } from "../../../../../lib/follow-ups";

export const runtime = "nodejs";

type UpdateAppointmentInput = {
  status?: AppointmentStatus;
  staffNote?: string;
  contactName?: string;
  phone?: string;
  petName?: string;
  petType?: string;
  packageName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

function isValidDate(value: string | null) {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string | null) {
  return value !== null && APPOINTMENT_TIME_SLOTS.includes(value);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireStaff(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: UpdateAppointmentInput;

  try {
    input = (await request.json()) as UpdateAppointmentInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  if (!isAppointmentStatus(input.status)) {
    return NextResponse.json({ message: "请选择有效的预约状态。" }, { status: 400 });
  }

  const { id } = await context.params;
  const contactName = cleanOptionalText(input.contactName, 40);
  const phone = cleanRequiredText(input.phone, 30);
  const petName = cleanOptionalText(input.petName, 60);
  const petType = cleanRequiredText(input.petType, 40);
  const packageName = cleanOptionalText(input.packageName, 40);
  const appointmentDate = cleanRequiredText(input.appointmentDate, 10);
  const appointmentTime = cleanRequiredText(input.appointmentTime, 5);
  const staffNote = cleanOptionalText(input.staffNote, 800);

  if (!isLikelyPhone(phone)) {
    return NextResponse.json({ message: "请填写可联系的手机号码。" }, { status: 400 });
  }

  if (!petType) {
    return NextResponse.json({ message: "请选择宠物类型。" }, { status: 400 });
  }

  if (!isAppointmentPackage(packageName)) {
    return NextResponse.json({ message: "请选择有效的预约套餐。" }, { status: 400 });
  }

  if (!isValidDate(appointmentDate) || !isValidTime(appointmentTime)) {
    return NextResponse.json({ message: "预约日期或时段格式不正确。" }, { status: 400 });
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
        `update public.appointments
         set status = $1,
             staff_note = $2,
             customer_id = $3,
             pet_id = $4,
             contact_name = $5,
             phone = $6,
             pet_type = $7,
             package_name = $8,
             appointment_date = $9,
             appointment_time = $10,
             handled_by_staff_id = $11
         where id = $12
         returning id`,
        [
          input.status,
          staffNote,
          customerId,
          petId,
          contactName,
          phone,
          petType,
          packageName,
          appointmentDate,
          appointmentTime,
          auth.currentUser.id,
          id,
        ],
      );

      if (!result.rows[0]) {
        await client.query("rollback");
        return NextResponse.json({ message: "没有找到这条预约记录。" }, { status: 404 });
      }

      if (input.status === "completed") {
        await createFollowUpForCompletedAppointment(client, id);
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ message: "预约已更新。" });
  } catch (error) {
    console.error("Failed to update appointment", error);
    return NextResponse.json({ message: "预约更新失败，请稍后再试。" }, { status: 500 });
  }
}
