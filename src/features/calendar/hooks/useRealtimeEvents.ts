"use client";
/**
 * Live updates via Supabase Realtime (Notebook "Next": deferred → now wired).
 * Subscribes to Postgres changes on `public.events` for the calendars this
 * workspace has visible, and invalidates the `useCalendarEvents` cache so
 * every open view — including other tabs/devices signed into the same
 * workspace — picks up creates/edits/deletes without a manual refresh.
 *
 * Requires the `events` table to be added to the `supabase_realtime`
 * publication (see supabase/migrations/0002_enable_realtime.sql) and RLS
 * (supabase/migrations/0001_enable_rls.sql) to already scope reads to
 * members of the workspace.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function useRealtimeEvents({ workspaceId, calendarIds }: { workspaceId: string; calendarIds: string[] }) {
  const queryClient = useQueryClient();
  // Postgres realtime filters can't take an empty `in.()` list — key off a stable, sorted string.
  const idsKey = [...calendarIds].sort().join(",");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!calendarIds.length) return; // nothing visible to subscribe to
    const supabase = createSupabaseBrowserClient();
    // The demo/unconfigured stub client only exposes `.auth` — bail out quietly.
    if (typeof (supabase as { channel?: unknown }).channel !== "function") return;

    const invalidate = () => {
      // Coalesce bursts (e.g. a drag-resize triggers PATCH then a broadcast echo)
      // into one refetch instead of one per row change.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "events" && q.queryKey[1] === workspaceId,
        });
      }, 150);
    };

    const channel = supabase
      .channel(`events-workspace-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `calendar_id=in.(${idsKey})` },
        invalidate
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, idsKey]);
}
