-- Harden Supabase: RLS policies, grants, rls_auto_enable, timestamps, indexes
-- Addresses Supabase Security/Performance Advisor findings 1,2,5,6,8
-- Idempotent + shadow-DB safe (creates dummy auth.uid() if missing)

-- Ensure auth schema + uid() exist for shadow DB validation (live Supabase already has it)
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uid' AND pronamespace = 'auth'::regnamespace) THEN
    CREATE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT NULL::uuid $$ LANGUAGE sql;
  END IF;
END $$;

-- 1. Fix timestamps: timestamp without tz -> timestamptz (P6). Only alter if still without tz to stay idempotent after failed deploy.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "user_profiles" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "user_profiles" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "workspaces" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "workspaces" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='memberships' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "memberships" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='calendars' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "calendars" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='calendars' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "calendars" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='start_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "events" ALTER COLUMN "start_at" TYPE TIMESTAMPTZ(3) USING "start_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='end_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "events" ALTER COLUMN "end_at" TYPE TIMESTAMPTZ(3) USING "end_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "events" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "events" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='deleted_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "events" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recurrence_rules' AND column_name='dtstart' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "recurrence_rules" ALTER COLUMN "dtstart" TYPE TIMESTAMPTZ(3) USING "dtstart" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recurrence_rules' AND column_name='until' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "recurrence_rules" ALTER COLUMN "until" TYPE TIMESTAMPTZ(3) USING "until" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recurrence_rules' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "recurrence_rules" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recurrence_rules' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "recurrence_rules" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendees' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "attendees" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendees' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "attendees" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reminders' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "reminders" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
    ALTER TABLE "audit_logs" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
  END IF;
END $$;

-- 6. Missing FK indexes (Performance Advisor)
CREATE INDEX IF NOT EXISTS "attendees_user_id_idx" ON "attendees"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX IF NOT EXISTS "events_created_by_id_idx" ON "events"("created_by_id");
CREATE INDEX IF NOT EXISTS "reminders_event_id_idx" ON "reminders"("event_id");
CREATE INDEX IF NOT EXISTS "reminders_user_id_idx" ON "reminders"("user_id");
CREATE INDEX IF NOT EXISTS "workspaces_owner_id_idx" ON "workspaces"("owner_id");
CREATE UNIQUE INDEX IF NOT EXISTS "calendars_one_default_per_workspace" ON "calendars"("workspace_id") WHERE is_default = true;

-- 1. RLS: enable on all app tables (idempotent)
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendars" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurrence_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running (idempotent)
DROP POLICY IF EXISTS "workspaces_select_member" ON "workspaces";
DROP POLICY IF EXISTS "workspaces_insert_owner" ON "workspaces";
DROP POLICY IF EXISTS "workspaces_update_member" ON "workspaces";
DROP POLICY IF EXISTS "memberships_select_own" ON "memberships";
DROP POLICY IF EXISTS "memberships_no_direct_write" ON "memberships";
DROP POLICY IF EXISTS "calendars_select_member" ON "calendars";
DROP POLICY IF EXISTS "calendars_write_owner_admin" ON "calendars";
DROP POLICY IF EXISTS "events_select_member" ON "events";
DROP POLICY IF EXISTS "events_insert_writer" ON "events";
DROP POLICY IF EXISTS "events_update_writer" ON "events";
DROP POLICY IF EXISTS "events_delete_writer" ON "events";
DROP POLICY IF EXISTS "attendees_select_member" ON "attendees";
DROP POLICY IF EXISTS "reminders_select_member" ON "reminders";
DROP POLICY IF EXISTS "recurrence_select_member" ON "recurrence_rules";
DROP POLICY IF EXISTS "audit_select_member" ON "audit_logs";
DROP POLICY IF EXISTS "audit_no_write" ON "audit_logs";
DROP POLICY IF EXISTS "profiles_select_self_or_member" ON "user_profiles";
DROP POLICY IF EXISTS "profiles_update_self" ON "user_profiles";

-- Policies: defense-in-depth for direct Data API (Prisma bypasses RLS via service role)
-- Fix: cast auth.uid()::text to match TEXT columns (was text = uuid error P3018)
CREATE POLICY "workspaces_select_member" ON "workspaces" FOR SELECT USING (EXISTS (SELECT 1 FROM "memberships" m WHERE m.workspace_id = "workspaces".id AND m.user_id = auth.uid()::text));
CREATE POLICY "workspaces_insert_owner" ON "workspaces" FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "workspaces_update_member" ON "workspaces" FOR UPDATE USING (EXISTS (SELECT 1 FROM "memberships" m WHERE m.workspace_id = "workspaces".id AND m.user_id = auth.uid()::text AND m.role IN ('owner','admin')));

CREATE POLICY "memberships_select_own" ON "memberships" FOR SELECT USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM "memberships" m2 WHERE m2.workspace_id = "memberships".workspace_id AND m2.user_id = auth.uid()::text));
CREATE POLICY "memberships_no_direct_write" ON "memberships" FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "calendars_select_member" ON "calendars" FOR SELECT USING (EXISTS (SELECT 1 FROM "memberships" m WHERE m.workspace_id = "calendars".workspace_id AND m.user_id = auth.uid()::text));
CREATE POLICY "calendars_write_owner_admin" ON "calendars" FOR ALL USING (EXISTS (SELECT 1 FROM "memberships" m WHERE m.workspace_id = "calendars".workspace_id AND m.user_id = auth.uid()::text AND m.role IN ('owner','admin'))) WITH CHECK (EXISTS (SELECT 1 FROM "memberships" m WHERE m.workspace_id = "calendars".workspace_id AND m.user_id = auth.uid()::text AND m.role IN ('owner','admin')));

CREATE POLICY "events_select_member" ON "events" FOR SELECT USING (EXISTS (SELECT 1 FROM "calendars" c JOIN "memberships" m ON m.workspace_id = c.workspace_id WHERE c.id = "events".calendar_id AND m.user_id = auth.uid()::text));
CREATE POLICY "events_insert_writer" ON "events" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "calendars" c JOIN "memberships" m ON m.workspace_id = c.workspace_id WHERE c.id = calendar_id AND m.user_id = auth.uid()::text AND m.role IN ('owner','admin','member')));
CREATE POLICY "events_update_writer" ON "events" FOR UPDATE USING (EXISTS (SELECT 1 FROM "calendars" c JOIN "memberships" m ON m.workspace_id = c.workspace_id WHERE c.id = "events".calendar_id AND m.user_id = auth.uid()::text AND m.role IN ('owner','admin','member')));
CREATE POLICY "events_delete_writer" ON "events" FOR DELETE USING (EXISTS (SELECT 1 FROM "calendars" c JOIN "memberships" m ON m.workspace_id = c.workspace_id WHERE c.id = "events".calendar_id AND m.user_id = auth.uid()::text AND m.role IN ('owner','admin','member')));

CREATE POLICY "attendees_select_member" ON "attendees" FOR SELECT USING (EXISTS (SELECT 1 FROM "events" e JOIN "calendars" c ON c.id = e.calendar_id JOIN "memberships" m ON m.workspace_id = c.workspace_id WHERE e.id = "attendees".event_id AND m.user_id = auth.uid()::text));
CREATE POLICY "reminders_select_member" ON "reminders" FOR SELECT USING (EXISTS (SELECT 1 FROM "events" e JOIN "calendars" c ON c.id = e.calendar_id JOIN "memberships" m ON m.workspace_id = c.workspace_id WHERE e.id = "reminders".event_id AND m.user_id = auth.uid()::text));
CREATE POLICY "recurrence_select_member" ON "recurrence_rules" FOR SELECT USING (EXISTS (SELECT 1 FROM "events" e JOIN "calendars" c ON c.id = e.calendar_id JOIN "memberships" m ON m.workspace_id = c.workspace_id WHERE e.id = "recurrence_rules".event_id AND m.user_id = auth.uid()::text));

CREATE POLICY "audit_select_member" ON "audit_logs" FOR SELECT USING (EXISTS (SELECT 1 FROM "memberships" m WHERE m.workspace_id = "audit_logs".workspace_id AND m.user_id = auth.uid()::text));
CREATE POLICY "audit_no_write" ON "audit_logs" FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "profiles_select_self_or_member" ON "user_profiles" FOR SELECT USING (id = auth.uid()::text OR EXISTS (SELECT 1 FROM "memberships" m1 JOIN "memberships" m2 ON m1.workspace_id = m2.workspace_id WHERE m1.user_id = auth.uid()::text AND m2.user_id = "user_profiles".id));
CREATE POLICY "profiles_update_self" ON "user_profiles" FOR UPDATE USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text);

-- 2. Revoke public execute on rls_auto_enable (SECURITY DEFINER)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable' AND pronamespace = 'public'::regnamespace) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;
  END IF;
END $$;

-- 4/5. Tighten grants: Prisma-only architecture — revoke all from anon/authenticated on app tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
-- No re-grant: Prisma uses service_role/postgres which bypasses RLS. If Data API needed later, GRANT SELECT explicitly.

-- Protect _prisma_migrations from client roles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_prisma_migrations') THEN
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon, authenticated, PUBLIC;
  END IF;
END $$;
