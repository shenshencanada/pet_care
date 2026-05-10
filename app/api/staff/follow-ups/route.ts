import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../lib/db";
import { FOLLOW_UP_SELECT, toFollowUpView } from "../../../../lib/follow-ups";
import { requireStaffApi } from "../../../../lib/staff-api";

export const runtime = "nodejs";

type FollowUpRow = Parameters<typeof toFollowUpView>[0];

function cleanSection(value: string | null) {
  return value === "overdue" || value === "today" || value === "upcoming" || value === "handled" ? value : "active";
}

function getWhereClause(section: string) {
  if (section === "overdue") {
    return "where f.status = 'pending' and f.due_date < current_date";
  }

  if (section === "today") {
    return "where f.status = 'pending' and f.due_date = current_date";
  }

  if (section === "upcoming") {
    return "where f.status = 'pending' and f.due_date > current_date and f.due_date <= current_date + interval '7 days'";
  }

  if (section === "handled") {
    return "where f.status <> 'pending'";
  }

  return "where (f.status = 'pending' and f.due_date <= current_date + interval '7 days') or f.status <> 'pending'";
}

export async function GET(request: NextRequest) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  const section = cleanSection(request.nextUrl.searchParams.get("section"));

  try {
    const result = await getPool().query<FollowUpRow>(
      `select ${FOLLOW_UP_SELECT}
       from public.follow_ups f
       join public.customers c on c.id = f.customer_id
       join public.pets p on p.id = f.pet_id
       left join public.appointments a on a.id = f.appointment_id
       left join public.staff_users s on s.id = f.handled_by_staff_id
       ${getWhereClause(section)}
       order by
         case when f.status = 'pending' then 0 else 1 end,
         f.due_date asc,
         f.updated_at desc
       limit 120`,
    );

    return NextResponse.json({ followUps: result.rows.map(toFollowUpView) });
  } catch (error) {
    console.error("Failed to list follow ups", error);
    return NextResponse.json({ message: "回访提醒暂时不可用，请稍后再试。" }, { status: 500 });
  }
}
