import { NextRequest, NextResponse } from "next/server";
import { cleanOptionalText, cleanRequiredText } from "../../../../../../lib/customers";
import { getPool } from "../../../../../../lib/db";
import { requireStaffApi } from "../../../../../../lib/staff-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateFollowUpInput = {
  petId?: string;
  dueDate?: string;
  contactNote?: string;
};

function isValidDate(value: string | null) {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: CreateFollowUpInput;

  try {
    input = (await request.json()) as CreateFollowUpInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const { id } = await context.params;
  const petId = cleanRequiredText(input.petId, 80);
  const dueDate = cleanRequiredText(input.dueDate, 10);
  const contactNote = cleanOptionalText(input.contactNote, 800);

  if (!petId) {
    return NextResponse.json({ message: "请选择宠物档案。" }, { status: 400 });
  }

  if (!isValidDate(dueDate)) {
    return NextResponse.json({ message: "请选择有效的回访日期。" }, { status: 400 });
  }

  try {
    const result = await getPool().query<{ id: string }>(
      `insert into public.follow_ups (customer_id, pet_id, due_date, status, contact_note, handled_by_staff_id)
       select $1, p.id, $2, 'pending', $3, $4
       from public.pets p
       where p.id = $5
         and p.customer_id = $1
       returning id`,
      [id, dueDate, contactNote, auth.currentUser.id, petId],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ message: "没有找到这个宠物档案。" }, { status: 404 });
    }

    return NextResponse.json({ id: result.rows[0].id, message: "回访提醒已新增。" }, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer follow up", error);
    return NextResponse.json({ message: "回访提醒创建失败，请稍后再试。" }, { status: 500 });
  }
}
