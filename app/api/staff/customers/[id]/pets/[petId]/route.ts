import { NextRequest, NextResponse } from "next/server";
import { cleanOptionalText, cleanRequiredText } from "../../../../../../../lib/customers";
import { getPool } from "../../../../../../../lib/db";
import { requireStaffApi } from "../../../../../../../lib/staff-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
    petId: string;
  }>;
};

type UpdatePetInput = {
  name?: string;
  petType?: string;
  breed?: string;
  gender?: string;
  ageText?: string;
  weightText?: string;
  careNotes?: string;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: UpdatePetInput;

  try {
    input = (await request.json()) as UpdatePetInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const { id, petId } = await context.params;
  const name = cleanOptionalText(input.name, 60);
  const petType = cleanRequiredText(input.petType, 40);
  const breed = cleanOptionalText(input.breed, 60);
  const gender = cleanOptionalText(input.gender, 20);
  const ageText = cleanOptionalText(input.ageText, 40);
  const weightText = cleanOptionalText(input.weightText, 40);
  const careNotes = cleanOptionalText(input.careNotes, 800);

  if (!petType) {
    return NextResponse.json({ message: "请填写宠物类型。" }, { status: 400 });
  }

  try {
    const result = await getPool().query<{ id: string }>(
      `update public.pets
       set name = $1,
           pet_type = $2,
           breed = $3,
           gender = $4,
           age_text = $5,
           weight_text = $6,
           care_notes = $7
       where id = $8
         and customer_id = $9
       returning id`,
      [name, petType, breed, gender, ageText, weightText, careNotes, petId, id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ message: "没有找到这个宠物档案。" }, { status: 404 });
    }

    return NextResponse.json({ message: "宠物档案已保存。" });
  } catch (error) {
    console.error("Failed to update pet", error);
    return NextResponse.json({ message: "宠物档案保存失败，请检查是否与已有宠物重复。" }, { status: 500 });
  }
}
