import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../lib/db";
import { requireStaffApi } from "../../../../lib/staff-api";

export const runtime = "nodejs";

type CustomerListRow = {
  id: string;
  display_name: string | null;
  phone: string;
  wechat_id: string | null;
  pet_count: string;
  appointment_count: string;
  last_appointment_date: Date | string | null;
  last_status: string | null;
};

function cleanSearchQuery(value: string | null) {
  return (value ?? "").trim().slice(0, 80);
}

function formatDateValue(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const auth = await requireStaffApi(request);

  if ("error" in auth) {
    return auth.error;
  }

  const query = cleanSearchQuery(request.nextUrl.searchParams.get("q"));
  const params: string[] = [];
  const searchCondition = query
    ? `where coalesce(c.display_name, '') ilike $1
        or coalesce(c.phone, '') ilike $1
        or coalesce(c.wechat_id, '') ilike $1
        or exists (
          select 1
          from public.pets p
          where p.customer_id = c.id
            and (coalesce(p.name, '') ilike $1 or coalesce(p.pet_type, '') ilike $1)
        )`
    : "";

  if (query) {
    params.push(`%${query}%`);
  }

  try {
    const result = await getPool().query<CustomerListRow>(
      `select
         c.id,
         c.display_name,
         c.phone,
         c.wechat_id,
         count(distinct p.id)::text as pet_count,
         count(distinct a.id)::text as appointment_count,
         max(a.appointment_date) as last_appointment_date,
         (array_agg(a.status order by a.appointment_date desc, a.appointment_time desc, a.created_at desc)
           filter (where a.id is not null))[1] as last_status
       from public.customers c
       left join public.pets p on p.customer_id = c.id
       left join public.appointments a on a.customer_id = c.id
       ${searchCondition}
       group by c.id
       order by max(a.appointment_date) desc nulls last, c.updated_at desc
       limit 80`,
      params,
    );

    return NextResponse.json({
      customers: result.rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        phone: row.phone,
        wechatId: row.wechat_id,
        petCount: Number(row.pet_count),
        appointmentCount: Number(row.appointment_count),
        lastAppointmentDate: formatDateValue(row.last_appointment_date),
        lastStatus: row.last_status,
      })),
    });
  } catch (error) {
    console.error("Failed to list customers", error);
    return NextResponse.json({ message: "客户列表暂时不可用，请稍后再试。" }, { status: 500 });
  }
}
