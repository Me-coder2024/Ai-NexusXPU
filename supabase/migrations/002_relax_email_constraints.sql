-- ============================================================
-- AI NEXUS — Complete Database Update
-- Run this ONCE in Supabase SQL Editor
-- ============================================================
-- This migration:
--   1. Relaxes email constraints (allow personal emails for 1st year students)
--   2. Allows admin/faculty accounts with non-university emails
--   3. Keeps enrollment number unique (no duplicate applications)
--   4. Creates the admin account (me.coder.in@gmail.com)
-- ============================================================

begin;

-- -------------------------------------------------------
-- 1. RELAX EMAIL CONSTRAINTS
-- -------------------------------------------------------

-- Remove the university-email-only check on applications table
-- (1st year students apply with personal emails like gmail.com)
alter table public.applications drop constraint if exists applications_email_check;

-- Remove the composite check on users table that forces STUDENT role
-- to have university email (1st year students use personal email)
alter table public.users drop constraint if exists users_check;

-- Re-add a general email format check on applications (any valid email)
alter table public.applications add constraint applications_email_check 
  check(email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- Re-add roles validation without email domain restriction
alter table public.users drop constraint if exists users_roles_check;
alter table public.users add constraint users_roles_check check(
  roles <@ array['SUPER_ADMIN','CONFIG_ADMIN','CLUB_LEAD','CORE_TEAM','FACULTY','STUDENT']::text[]
  and cardinality(roles) > 0
);

-- -------------------------------------------------------
-- 2. ENSURE ENROLLMENT UNIQUENESS (already exists, but confirm)
-- -------------------------------------------------------
-- The original schema already has: enrollment text unique not null
-- This means each enrollment/UG number can only submit one application.
-- If a duplicate is attempted, the app returns:
--   "An application already exists for this enrollment number or email."

-- -------------------------------------------------------
-- 3. CREATE ADMIN ACCOUNT
-- -------------------------------------------------------
-- Insert admin user (skip if already exists)
insert into public.users (email, name, roles, permissions, disabled)
values ('me.coder.in@gmail.com', 'Admin', '{SUPER_ADMIN}', '{}', false)
on conflict (email) do update set roles = '{SUPER_ADMIN}';

commit;
