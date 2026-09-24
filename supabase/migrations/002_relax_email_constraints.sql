-- ============================================================
-- AI NEXUS — BULLETPROOF Database Fix
-- Run in Supabase SQL Editor
-- ============================================================
-- Finds and drops ALL check constraints on users and applications
-- tables, then re-adds only what we need.
-- ============================================================

-- Step 1: Drop ALL check constraints from users table
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'users'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
  ) LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Step 2: Drop ALL check constraints from applications table
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'applications'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
  ) LOOP
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Step 3: Re-add only the constraints we need (no email domain restrictions)
ALTER TABLE public.users ADD CONSTRAINT users_roles_valid CHECK (
  roles <@ array['SUPER_ADMIN','CONFIG_ADMIN','CLUB_LEAD','CORE_TEAM','FACULTY','STUDENT']::text[]
  AND cardinality(roles) > 0
);

ALTER TABLE public.applications ADD CONSTRAINT applications_email_format CHECK (
  email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
);

ALTER TABLE public.applications ADD CONSTRAINT applications_status_valid CHECK (
  status IN ('Submitted','Under Review','Round 1 Shortlisted','Round 1 Rejected','Round 2 Shortlisted','Selected','Waitlisted','Rejected')
);

-- Step 4: Create or update admin account
INSERT INTO public.users (email, name, roles, permissions, disabled)
VALUES ('me.coder.in@gmail.com', 'Admin', '{SUPER_ADMIN}', '{}', false)
ON CONFLICT (email) DO UPDATE SET roles = '{SUPER_ADMIN}';
