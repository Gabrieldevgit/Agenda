-- Tempo Realtime — powers useRealtimeEvents (Notebook "Next": Realtime, now wired).
-- Adds `events` to the `supabase_realtime` publication so postgres_changes
-- subscriptions (INSERT/UPDATE/DELETE) reach connected clients. RLS from
-- 0001_enable_rls.sql still gates *which* rows a given client is allowed to
-- receive, since Realtime honors RLS on the publication tables.
--
-- Safe to re-run: guards against "relation already member of publication".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END $$;

-- REPLICA IDENTITY FULL so UPDATE/DELETE payloads include the old row values
-- (needed to know which calendar_id a deleted/soft-deleted row belonged to).
ALTER TABLE public.events REPLICA IDENTITY FULL;
