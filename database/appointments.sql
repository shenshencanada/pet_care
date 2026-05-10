create extension if not exists pgcrypto;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'full' check (source in ('quick', 'full', 'staff')),
  customer_id uuid,
  pet_id uuid,
  contact_name text,
  phone text not null,
  pet_type text not null,
  package_name text,
  appointment_date date not null,
  appointment_time time not null,
  customer_note text,
  staff_note text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'arrived', 'completed', 'canceled')),
  status_changed_at timestamptz not null default now(),
  handled_by_staff_id uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  phone text not null,
  normalized_phone text not null,
  wechat_id text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text,
  pet_type text not null,
  breed text,
  gender text,
  age_text text,
  weight_text text,
  care_notes text,
  pet_identity_key text generated always as (
    lower(coalesce(nullif(name, ''), pet_type))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'booked', 'no_answer', 'skipped')),
  contact_note text,
  next_follow_up_date date,
  booked_appointment_id uuid references public.appointments(id) on delete set null,
  handled_by_staff_id uuid references public.staff_users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists source text not null default 'full',
  add column if not exists customer_id uuid,
  add column if not exists pet_id uuid,
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists pet_type text,
  add column if not exists package_name text,
  add column if not exists appointment_date date,
  add column if not exists appointment_time time,
  add column if not exists customer_note text,
  add column if not exists staff_note text,
  add column if not exists status text not null default 'pending',
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists handled_by_staff_id uuid references public.staff_users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.customers
  add column if not exists display_name text,
  add column if not exists phone text,
  add column if not exists normalized_phone text,
  add column if not exists wechat_id text,
  add column if not exists note text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.pets
  add column if not exists customer_id uuid references public.customers(id) on delete cascade,
  add column if not exists name text,
  add column if not exists pet_type text,
  add column if not exists breed text,
  add column if not exists gender text,
  add column if not exists age_text text,
  add column if not exists weight_text text,
  add column if not exists care_notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.follow_ups
  add column if not exists customer_id uuid references public.customers(id) on delete cascade,
  add column if not exists pet_id uuid references public.pets(id) on delete cascade,
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists due_date date,
  add column if not exists status text not null default 'pending',
  add column if not exists contact_note text,
  add column if not exists next_follow_up_date date,
  add column if not exists booked_appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists handled_by_staff_id uuid references public.staff_users(id) on delete set null,
  add column if not exists handled_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'pet_identity_key'
  ) then
    alter table public.pets
      add column pet_identity_key text generated always as (
        lower(coalesce(nullif(name, ''), pet_type))
      ) stored;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'note'
  ) then
    update public.appointments
    set customer_note = coalesce(customer_note, note)
    where customer_note is null;
  end if;
end;
$$;

update public.appointments
set source = coalesce(nullif(source, ''), 'full'),
    status = coalesce(nullif(status, ''), 'pending'),
    phone = coalesce(nullif(phone, ''), '000000'),
    pet_type = coalesce(nullif(pet_type, ''), '未填写宠物类型'),
    status_changed_at = coalesce(status_changed_at, updated_at, created_at, now()),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

update public.customers
set phone = coalesce(nullif(phone, ''), '000000'),
    normalized_phone = coalesce(nullif(normalized_phone, ''), regexp_replace(coalesce(phone, '000000'), '\D', '', 'g'), '000000'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

update public.pets
set pet_type = coalesce(nullif(pet_type, ''), '未填写宠物类型'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

update public.follow_ups
set status = coalesce(nullif(status, ''), 'pending'),
    due_date = coalesce(due_date, current_date),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

update public.appointments
set status = 'canceled'
where status = 'cancelled';

do $$
begin
  alter table public.appointments
    drop constraint if exists appointments_source_check;

  alter table public.appointments
    add constraint appointments_source_check check (source in ('quick', 'full', 'staff'));

  alter table public.appointments
    drop constraint if exists appointments_status_check;

  alter table public.appointments
    add constraint appointments_status_check check (status in ('pending', 'confirmed', 'arrived', 'completed', 'canceled'));

  alter table public.follow_ups
    drop constraint if exists follow_ups_status_check;

  alter table public.follow_ups
    add constraint follow_ups_status_check check (status in ('pending', 'contacted', 'booked', 'no_answer', 'skipped'));
end;
$$;

create index if not exists appointments_schedule_idx
  on public.appointments (appointment_date, appointment_time);

create index if not exists appointments_status_idx
  on public.appointments (status);

create unique index if not exists customers_normalized_phone_key
  on public.customers (normalized_phone);

create index if not exists customers_display_name_idx
  on public.customers (display_name);

create unique index if not exists pets_customer_identity_key
  on public.pets (customer_id, pet_identity_key);

create index if not exists pets_customer_idx
  on public.pets (customer_id);

create index if not exists follow_ups_due_status_idx
  on public.follow_ups (due_date, status);

create index if not exists follow_ups_customer_idx
  on public.follow_ups (customer_id);

create unique index if not exists follow_ups_appointment_key
  on public.follow_ups (appointment_id)
  where appointment_id is not null;

do $$
begin
  alter table public.appointments
    drop constraint if exists appointments_customer_id_fkey;

  alter table public.appointments
    add constraint appointments_customer_id_fkey
    foreign key (customer_id) references public.customers(id) on delete set null;

  alter table public.appointments
    drop constraint if exists appointments_pet_id_fkey;

  alter table public.appointments
    add constraint appointments_pet_id_fkey
    foreign key (pet_id) references public.pets(id) on delete set null;
end;
$$;

insert into public.customers (display_name, phone, normalized_phone, created_at, updated_at)
select
  nullif((array_agg(nullif(contact_name, '') order by created_at desc))[1], '') as display_name,
  (array_agg(phone order by created_at desc))[1] as phone,
  regexp_replace(phone, '\D', '', 'g') as normalized_phone,
  min(created_at) as created_at,
  max(updated_at) as updated_at
from public.appointments
where phone is not null
  and regexp_replace(phone, '\D', '', 'g') <> ''
group by regexp_replace(phone, '\D', '', 'g')
on conflict (normalized_phone) do update
set display_name = coalesce(public.customers.display_name, excluded.display_name),
    phone = excluded.phone,
    updated_at = greatest(public.customers.updated_at, excluded.updated_at);

update public.appointments a
set customer_id = c.id
from public.customers c
where a.customer_id is null
  and regexp_replace(a.phone, '\D', '', 'g') = c.normalized_phone;

insert into public.pets (customer_id, name, pet_type, created_at, updated_at)
select
  a.customer_id,
  null,
  a.pet_type,
  min(a.created_at) as created_at,
  max(a.updated_at) as updated_at
from public.appointments a
where a.customer_id is not null
  and a.pet_type is not null
group by a.customer_id, a.pet_type
on conflict (customer_id, pet_identity_key) do update
set pet_type = excluded.pet_type,
    updated_at = greatest(public.pets.updated_at, excluded.updated_at);

update public.appointments a
set pet_id = p.id
from public.pets p
where a.pet_id is null
  and a.customer_id = p.customer_id
  and lower(a.pet_type) = p.pet_identity_key;

insert into public.follow_ups (customer_id, pet_id, appointment_id, due_date, status, created_at, updated_at)
select
  a.customer_id,
  a.pet_id,
  a.id,
  a.appointment_date + interval '30 days',
  'pending',
  now(),
  now()
from public.appointments a
where a.status = 'completed'
  and a.customer_id is not null
  and a.pet_id is not null
  and a.appointment_date + interval '30 days' >= current_date - interval '7 days'
on conflict (appointment_id) where appointment_id is not null do nothing;

create or replace function public.set_appointments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_appointments_updated_at on public.appointments;

create trigger set_appointments_updated_at
before update on public.appointments
for each row
execute function public.set_appointments_updated_at();

create or replace function public.set_customers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.normalized_phone = regexp_replace(new.phone, '\D', '', 'g');
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customers_updated_at on public.customers;

create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_customers_updated_at();

create or replace function public.set_pets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pets_updated_at on public.pets;

create trigger set_pets_updated_at
before update on public.pets
for each row
execute function public.set_pets_updated_at();

create or replace function public.set_follow_ups_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status is distinct from old.status then
    new.handled_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_follow_ups_updated_at on public.follow_ups;

create trigger set_follow_ups_updated_at
before update on public.follow_ups
for each row
execute function public.set_follow_ups_updated_at();

alter table public.appointments enable row level security;
alter table public.customers enable row level security;
alter table public.pets enable row level security;
alter table public.follow_ups enable row level security;

revoke all on table public.appointments from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.pets from anon, authenticated;
revoke all on table public.follow_ups from anon, authenticated;
