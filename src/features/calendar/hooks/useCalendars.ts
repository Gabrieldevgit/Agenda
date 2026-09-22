"use client";
import { useQuery } from "@tanstack/react-query";
import type { CalendarSummary } from "../types";
import { readApiError } from "@/lib/api/error";

async function fetchCalendars(workspaceId: string): Promise<CalendarSummary[]> {
  const res = await fetch(`/api/calendars?workspaceId=${encodeURIComponent(workspaceId)}`);
  if (!res.ok) await readApiError(res);
  const data = await res.json();
  return (data.calendars as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    isDefault: c.isDefault,
    isArchived: c.isArchived,
  }));
}

export function useCalendars(workspaceId: string) {
  return useQuery({ queryKey: ["calendars", workspaceId], queryFn: () => fetchCalendars(workspaceId), enabled: !!workspaceId });
}
