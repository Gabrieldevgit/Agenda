import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { getDemoStore, type DemoEvent } from "@/lib/demo/events";

/**
 * Global search — used by the header search bar's dropdown. Unlike
 * `GET /api/events?q=`, this is not bounded by the currently-visible
 * range: it searches every (non-deleted) event in the workspace so a
 * match next month, or last year, still shows up.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const q = (url.searchParams.get("q") ?? "").trim();
  const calendarIds = url.searchParams.getAll("calendarId");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(50, Number(limitParam) || 20)) : 20;
  if (!workspaceId) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "workspaceId is required" } }, { status: 400 });
  }
  if (!q) return NextResponse.json({ events: [] });

  if (workspaceId === "demo-workspace" && isDemoMode()) {
    let evts: DemoEvent[] = getDemoStore().filter((e) => !("deletedAt" in e));
    const lc = q.toLowerCase();
    evts = evts.filter((e) => `${e.title} ${e.description} ${e.location}`.toLowerCase().includes(lc));
    if (calendarIds.length) evts = evts.filter((e) => calendarIds.includes(e.calendarId));
    const now = Date.now();
    evts = evts.sort((a, b) => Math.abs(new Date(a.startAt).getTime() - now) - Math.abs(new Date(b.startAt).getTime() - now)).slice(0, limit);
    return NextResponse.json({ events: evts });
  }

  let user: { id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = (res.data?.user as { id: string } | null) ?? null;
  } catch {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and keys." } }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  try {
    const { searchEventsGlobal } = await import("@/server/services/event-service");
    const ids = calendarIds.length ? calendarIds : undefined;
    const events = await searchEventsGlobal(user.id, workspaceId, q, ids, limit);
    return NextResponse.json({ events });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("DATABASE_URL") || msg.includes("Can't reach database") || msg.includes("P1001") || msg.includes("prisma") || msg.includes("Supabase not configured")) {
      console.error("GET /api/events/search infra error:", msg);
      return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Database unavailable. Try again." } }, { status: 500 });
    }
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : "BAD_REQUEST", message: msg } }, { status });
  }
}
