-- RLS allowed/denied tests (Notebook v2 §35, Notebook §27).
-- Run with: supabase test db or via pgTAP. This file documents the matrix to be enforced.

-- 1. events_select_member: user A cannot SELECT user B's events
--    SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = 'user-a';
--    SELECT * FROM events WHERE calendar_id IN (SELECT id FROM calendars WHERE workspace_id = 'ws-b'); -- expect 0 rows

-- 2. events_insert_writer: viewer cannot INSERT
--    viewer (role='viewer') INSERT INTO events (...) -- expect RLS violation / service throws FORBIDDEN

-- 3. calendars_one_default_per_workspace: second is_default=true in same workspace -> unique violation

-- 4. cross-workspace move: update events.calendar_id to calendar in other workspace where user is member of both
--    -> service layer throws FORBIDDEN: cannot move event to different workspace (event-service.ts)

-- 5. soft-delete: findInRange excludes deletedAt IS NOT NULL; restore requires deleted row

-- Use pgTAP assertions (example):
-- SELECT ok((SELECT count(*) FROM events) = 0, 'viewer sees zero events in other workspace');
