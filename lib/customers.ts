import type { Pool, PoolClient } from "pg";

export type CustomerPetInput = {
  contactName: string | null;
  phone: string;
  petName?: string | null;
  petType: string;
};

type Queryable = Pick<Pool | PoolClient, "query">;

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function cleanRequiredText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function isLikelyPhone(value: string | null): value is string {
  return value !== null && /^[\d\s()+-]{6,30}$/.test(value) && normalizePhone(value).length >= 6;
}

export async function upsertCustomerAndPet(db: Queryable, input: CustomerPetInput) {
  const normalizedPhone = normalizePhone(input.phone);
  const petName = cleanOptionalText(input.petName, 60);

  const customerResult = await db.query<{ id: string }>(
    `insert into public.customers (display_name, phone, normalized_phone)
     values ($1, $2, $3)
     on conflict (normalized_phone) do update
     set display_name = coalesce(nullif(excluded.display_name, ''), public.customers.display_name),
         phone = excluded.phone
     returning id`,
    [input.contactName, input.phone, normalizedPhone],
  );
  const customerId = customerResult.rows[0].id;
  const petResult = await db.query<{ id: string }>(
    `insert into public.pets (customer_id, name, pet_type)
     values ($1, $2, $3)
     on conflict (customer_id, pet_identity_key) do update
     set name = coalesce(public.pets.name, excluded.name),
         pet_type = excluded.pet_type
     returning id`,
    [customerId, petName, input.petType],
  );

  return {
    customerId,
    petId: petResult.rows[0].id,
    petName,
  };
}
