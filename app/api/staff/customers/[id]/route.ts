import { NextRequest, NextResponse } from "next/server";
import {
  cleanOptionalText,
  cleanRequiredText,
  isLikelyPhone,
  normalizePhone,
} from "../../../../../lib/customers";
import { getPool } from "../../../../../lib/db";
import { requireStaffApi } from "../../../../../lib/staff-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateCustomerInput = {
  displayName?: string;
  phone?: string;
  wechatId?: string;
  note?: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  try {
    const [result, petsResult, appointmentsResult, followUpsResult] = await Promise.all([
      getPool().query(
        `select id, display_name, phone, normalized_phone, wechat_id, note, created_at, updated_at
         from public.customers
         where id = $1
         limit 1`,
        [id],
      ),
      getPool().query(
        `select id, name, pet_type, breed, gender, age_text, weight_text, care_notes, created_at, updated_at
         from public.pets
         where customer_id = $1
         order by created_at asc`,
        [id],
      ),
      getPool().query(
        `select
           a.id,
           a.source,
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
           s.display_name as handled_by_staff_name,
           a.created_at,
           a.updated_at
         from public.appointments a
         left join public.pets p on p.id = a.pet_id
         left join public.staff_users s on s.id = a.handled_by_staff_id
         where a.customer_id = $1
         order by a.appointment_date desc, a.appointment_time desc, a.created_at desc`,
        [id],
      ),
      getPool().query(
        `select
           f.id,
           f.pet_id,
           p.name as pet_name,
           p.pet_type,
           f.due_date,
           f.status,
           f.contact_note,
           f.next_follow_up_date,
           f.booked_appointment_id,
           f.created_at,
           f.updated_at
         from public.follow_ups f
         join public.pets p on p.id = f.pet_id
         where f.customer_id = $1
         order by
           case when f.status = 'pending' then 0 else 1 end,
           f.due_date asc,
           f.updated_at desc`,
        [id],
      ),
    ]);

    if (!result.rows[0]) {
      return NextResponse.json({ message: "没有找到这个客户。" }, { status: 404 });
    }

    return NextResponse.json({
      customer: result.rows[0],
      pets: petsResult.rows,
      appointments: appointmentsResult.rows,
      followUps: followUpsResult.rows,
    });
  } catch (error) {
    console.error("Failed to get customer", error);
    return NextResponse.json({ message: "客户详情暂时不可用，请稍后再试。" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: UpdateCustomerInput;

  try {
    input = (await request.json()) as UpdateCustomerInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const { id } = await context.params;
  const displayName = cleanOptionalText(input.displayName, 40);
  const phone = cleanRequiredText(input.phone, 30);
  const wechatId = cleanOptionalText(input.wechatId, 80);
  const note = cleanOptionalText(input.note, 800);

  if (!isLikelyPhone(phone)) {
    return NextResponse.json({ message: "请填写可联系的手机号码。" }, { status: 400 });
  }

  try {
    const result = await getPool().query<{ id: string }>(
      `update public.customers
       set display_name = $1,
           phone = $2,
           normalized_phone = $3,
           wechat_id = $4,
           note = $5
       where id = $6
       returning id`,
      [displayName, phone, normalizePhone(phone), wechatId, note, id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ message: "没有找到这个客户。" }, { status: 404 });
    }

    return NextResponse.json({ message: "客户资料已保存。" });
  } catch (error) {
    console.error("Failed to update customer", error);
    return NextResponse.json({ message: "客户资料保存失败，请检查手机号是否已属于其他客户。" }, { status: 500 });
  }
}
