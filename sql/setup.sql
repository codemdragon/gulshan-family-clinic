-- ============================================================
-- GULSHAN CLINIC FAMILY — Full Database Setup
-- Run this in your Supabase SQL Editor (or any PostgreSQL)
-- ============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text unique,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. PATIENTS (appointment form submissions)
-- ============================================================
create table if not exists public.patients (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete set null,
  name          text not null,
  age           integer,
  gender        text check (gender in ('male','female','other')),
  phone         text,
  visit_type    text check (visit_type in ('first_time','returning')),
  payment_method text check (payment_method in ('in_clinic','online')),
  created_at    timestamptz default now()
);

alter table public.patients enable row level security;

create policy "Users can insert their own patient record"
  on public.patients for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own patient records"
  on public.patients for select
  using (auth.uid() = user_id);

create policy "Admins can view all patient records"
  on public.patients for select
  using (check_admin(auth.uid()));

-- ============================================================
-- 3. CLINIC_INFO (singleton — admin-editable)
-- ============================================================
create table if not exists public.clinic_info (
  id              integer primary key default 1 check (id = 1),
  clinic_name     text not null default 'Gulshan Clinic',
  email           text,
  phone           text,
  address         text,
  google_maps_link text,
  support_email   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.clinic_info enable row level security;

create policy "Anyone can read clinic info"
  on public.clinic_info for select
  using (true);

create policy "Admins can update clinic info"
  on public.clinic_info for update
  using (check_admin(auth.uid()));

-- ============================================================
-- AFTER RUNNING THIS SCRIPT:
--   1. Create your first user via the app (Sign Up)
--   2. Run the following in Supabase SQL Editor to make them admin
--      (replace USER_UUID with the user's id from auth.users):
--
--      insert into public.admin_users (user_id) values ('USER_UUID');
--
-- ============================================================

-- Seed clinic info
insert into public.clinic_info (id, clinic_name, email, phone, address, support_email)
values (
  1,
  'Gulshan Clinic',
  'info@gulshanclinic.com',
  '+92-300-1234567',
  '123 Main Street, Gulshan-e-Maymar, Karachi',
  'support@gulshanclinic.com'
) on conflict (id) do nothing;

-- ============================================================
-- 4. ADMIN_USERS
-- ============================================================
create table if not exists public.admin_users (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade unique,
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

create policy "Admins can view admin list"
  on public.admin_users for select
  using (check_admin(auth.uid()));

-- Helper: check if a user is admin
create or replace function public.check_admin(uid uuid)
returns boolean as $$
begin
  return exists (select 1 from public.admin_users where user_id = uid);
end;
$$ language plpgsql security definer stable;

-- ============================================================
-- 5. INDEXES
-- ============================================================
create index if not exists idx_patients_user_id   on public.patients(user_id);
create index if not exists idx_patients_created_at on public.patients(created_at desc);
create index if not exists idx_patients_name      on public.patients(name);
