create extension if not exists pgcrypto;

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text not null,
  password_hash text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_users_username_lower_key
  on public.staff_users (lower(username));

create or replace function public.set_staff_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_staff_users_updated_at on public.staff_users;

create trigger set_staff_users_updated_at
before update on public.staff_users
for each row
execute function public.set_staff_users_updated_at();

create table if not exists public.staff_login_attempts (
  id uuid primary key default gen_random_uuid(),
  username_lower text not null,
  ip_address text not null,
  failed_count integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_login_attempts_username_ip_key
  on public.staff_login_attempts (username_lower, ip_address);

create or replace function public.set_staff_login_attempts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_staff_login_attempts_updated_at on public.staff_login_attempts;

create trigger set_staff_login_attempts_updated_at
before update on public.staff_login_attempts
for each row
execute function public.set_staff_login_attempts_updated_at();

alter table public.staff_users enable row level security;
alter table public.staff_login_attempts enable row level security;

revoke all on table public.staff_users from anon, authenticated;
revoke all on table public.staff_login_attempts from anon, authenticated;
