-- Tempo RLS — Notebook v2 §§6,20,33 — defense-in-depth for direct Supabase Data API access.
-- Prisma (DATABASE_URL) bypasses RLS; the service layer (workspace-service.ts) is still the primary
-- authorization boundary. This file hardens the DB if a leaked anon key or direct table access is attempted.
-- See: supabase.com/docs/guides/database/postgres/row-level-security

-- Enable RLS on all tenant tables exposed via PostgREST.
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;

-- Helper: current user is member of workspace?
-- Using auth.uid() = Supabase Auth user id = user_profiles.id.

-- Workspaces: readable only if member, insert/update/delete restricted to owner/admin via service,
-- but RLS allows owner to mutate (secondary check).
CREATE POLICY "workspaces_select_member" ON workspaces FOR SELECT
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.workspace_id = workspaces.id AND m.user_id = auth.uid()));
CREATE POLICY "workspaces_insert_owner" ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "workspaces_update_member" ON workspaces FOR UPDATE
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.workspace_id = workspaces.id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- Memberships: user can read memberships for workspaces they belong to.
CREATE POLICY "memberships_select_own" ON memberships FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM memberships m2 WHERE m2.workspace_id = memberships.workspace_id AND m2.user_id = auth.uid()));
-- Writes to memberships should go via service; deny direct writes except via service_role (bypass).
CREATE POLICY "memberships_no_direct_write" ON memberships FOR ALL
  USING (false) WITH CHECK (false);

-- Calendars: visible only inside own workspace.
CREATE POLICY "calendars_select_member" ON calendars FOR SELECT
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.workspace_id = calendars.workspace_id AND m.user_id = auth.uid()));
CREATE POLICY "calendars_write_owner_admin" ON calendars FOR ALL
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.workspace_id = calendars.workspace_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.workspace_id = calendars.workspace_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- Events: readable if calendar's workspace member; writable only if role can write.
-- Note: Prisma bypasses these, but direct PostgREST is now protected.
CREATE POLICY "events_select_member" ON events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM calendars c JOIN memberships m ON m.workspace_id = c.workspace_id
    WHERE c.id = events.calendar_id AND m.user_id = auth.uid()
  ));
CREATE POLICY "events_insert_writer" ON events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM calendars c JOIN memberships m ON m.workspace_id = c.workspace_id
    WHERE c.id = calendar_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin','member')
  ));
CREATE POLICY "events_update_writer" ON events FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM calendars c JOIN memberships m ON m.workspace_id = c.workspace_id
    WHERE c.id = events.calendar_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin','member')
  ));
CREATE POLICY "events_delete_writer" ON events FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM calendars c JOIN memberships m ON m.workspace_id = c.workspace_id
    WHERE c.id = events.calendar_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin','member')
  ));

-- Attendees / Reminders / Recurrence: same workspace-membership gate.
CREATE POLICY "attendees_select_member" ON attendees FOR SELECT
  USING (EXISTS (SELECT 1 FROM events e JOIN calendars c ON c.id = e.calendar_id JOIN memberships m ON m.workspace_id = c.workspace_id WHERE e.id = attendees.event_id AND m.user_id = auth.uid()));
CREATE POLICY "reminders_select_member" ON reminders FOR SELECT
  USING (EXISTS (SELECT 1 FROM events e JOIN calendars c ON c.id = e.calendar_id JOIN memberships m ON m.workspace_id = c.workspace_id WHERE e.id = reminders.event_id AND m.user_id = auth.uid()));
CREATE POLICY "recurrence_select_member" ON recurrence_rules FOR SELECT
  USING (EXISTS (SELECT 1 FROM events e JOIN calendars c ON c.id = e.calendar_id JOIN memberships m ON m.workspace_id = c.workspace_id WHERE e.id = recurrence_rules.event_id AND m.user_id = auth.uid()));

-- Audit logs: read only for workspace members (admin view); no direct writes.
CREATE POLICY "audit_select_member" ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.workspace_id = audit_logs.workspace_id AND m.user_id = auth.uid()));
CREATE POLICY "audit_no_write" ON audit_logs FOR ALL USING (false) WITH CHECK (false);

-- User profiles: user can read own + members of shared workspaces.
CREATE POLICY "profiles_select_self_or_member" ON user_profiles FOR SELECT
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM memberships m1 JOIN memberships m2 ON m1.workspace_id = m2.workspace_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = user_profiles.id
  ));
CREATE POLICY "profiles_update_self" ON user_profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Least privilege: revoke anon write on all.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON workspaces, memberships, calendars, events, attendees, reminders, recurrence_rules, audit_logs, user_profiles TO authenticated;

-- Partial unique index: one default calendar per workspace (Notebook v2 §33).
CREATE UNIQUE INDEX IF NOT EXISTS calendars_one_default_per_workspace ON calendars (workspace_id) WHERE is_default = true;
