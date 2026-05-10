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

type CreatePetInput = {
  name?: string;
  petType?: string;
  breed?: string;
  gender?: string;
  ageText?: string;
  weightText?: string;
  careNotes?: string;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  let input: CreatePetInput;

  try {
    input = (await request.json()) as CreatePetInput;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const { id } = await context.params;
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
      `insert into public.pets (customer_id, name, pet_type, breed, gender, age_text, weight_text, care_notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (customer_id, pet_identity_key) do update
       set name = excluded.name,
           pet_type = excluded.pet_type,
           breed = excluded.breed,
           gender = excluded.gender,
           age_text = excluded.age_text,
           weight_text = excluded.weight_text,
           care_notes = excluded.care_notes
       returning id`,
      [id, name, petType, breed, gender, ageText, weightText, careNotes],
    );

    return NextResponse.json({ id: result.rows[0].id, message: "宠物档案已保存。" }, { status: 201 });
  } catch (error) {
    console.error("Failed to create pet", error);
    return NextResponse.json({ message: "宠物档案保存失败，请稍后再试。" }, { status: 500 });
  }
}
