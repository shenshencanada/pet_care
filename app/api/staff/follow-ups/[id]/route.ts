import { NextRequest, NextResponse } from "next/server";
import { FollowUpStatus, isFollowUpStatus } from "../../../../../lib/appointments";
import { cleanOptionalText, cleanRequiredText } from "../../../../../lib/customers";
import { getPool } from "../../../../../lib/db";
import { requireStaffApi } from "../../../../../lib/staff-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateFollowUpInput = {
  status?: FollowUpStatus;
  contactNote?: string;
  nextFollowUpDate?: string;
};

function isValidOptionalDate(value: string | null) {
  return value === null || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: UpdateFollowUpInput;

  try {
    input = (await request.json()) as UpdateFollowUpInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const status = cleanRequiredText(input.status, 20);
  const contactNote = cleanOptionalText(input.contactNote, 800);
  const nextFollowUpDate = cleanOptionalText(input.nextFollowUpDate, 10);

  if (!isFollowUpStatus(status)) {
    return NextResponse.json({ message: "请选择有效的回访状态。" }, { status: 400 });
  }

  if (!isValidOptionalDate(nextFollowUpDate)) {
    return NextResponse.json({ message: "下次回访日期格式不正确。" }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const result = await getPool().query<{ id: string }>(
      `update public.follow_ups
       set status = $1,
           contact_note = $2,
           next_follow_up_date = $3,
           handled_by_staff_id = $4,
           handled_at = now()
       where id = $5
       returning id`,
      [status, contactNote, nextFollowUpDate, auth.currentUser.id, id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ message: "没有找到这条回访提醒。" }, { status: 404 });
    }

    return NextResponse.json({ message: "回访记录已保存。" });
  } catch (error) {
    console.error("Failed to update follow up", error);
    return NextResponse.json({ message: "回访记录保存失败，请稍后再试。" }, { status: 500 });
  }
}
