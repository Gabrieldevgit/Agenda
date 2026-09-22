import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { createEvent, listEventsInRange } from "@/server/services/event-service";
import { getDemoStore, addToDemoStore, type DemoEvent } from "@/lib/demo/events";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const rangeStart = url.searchParams.get("rangeStart");
  const rangeEnd = url.searchParams.get("rangeEnd");
  const q = url.searchParams.get("q");
  const calendarIds = url.searchParams.getAll("calendarId");
  const emptySentinel = url.searchParams.get("_emptyCalendars");
  if (!workspaceId || !rangeStart || !rangeEnd) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "workspaceId, rangeStart and rangeEnd are required" } }, { status: 400 });
  }

  // Demo fallback: prototype-accurate seed so week view matches tempo-agenda.html
  if (workspaceId === "demo-workspace" && isDemoMode()) {
    let evts: DemoEvent[] = getDemoStore();
    const rs = new Date(rangeStart);
    const re = new Date(rangeEnd);
    // Half-open filtering like repository: startAt < re && endAt > rs (or allDay day in range)
    evts = evts.filter((e) => {
      if (e.allDay) {
        // All-day: include if its civil day is within [rs, re)
        const ek = e.startAt.slice(0, 10);
        const rsk = rs.toISOString().slice(0, 10);
        const rek = re.toISOString().slice(0, 10);
        return ek >= rsk && ek < rek;
      }
      const s = new Date(e.startAt).getTime();
      const en = new Date(e.endAt).getTime();
      return s < re.getTime() && en > rs.getTime();
    });
    if (q) {
      const lc = q.toLowerCase();
      evts = evts.filter((e) => `${e.title} ${e.description} ${e.location}`.toLowerCase().includes(lc));
    }
    if (emptySentinel) return NextResponse.json({ events: [] });
    if (calendarIds.length) evts = evts.filter((e) => calendarIds.includes(e.calendarId));
    return NextResponse.json({ events: evts });
  }

  let user: { id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = (res.data?.user as { id: string } | null) ?? null;
  } catch {
    // isDemoMode already handled above; any other Supabase misconfig -> 500 with friendly message
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and keys." } }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  try {
    const ids = emptySentinel ? [] : (calendarIds.length ? calendarIds : undefined);
    const { listEventsInRange, searchEvents } = await import("@/server/services/event-service");
    const events = q
      ? await searchEvents(user.id, workspaceId, q, ids, new Date(rangeStart), new Date(rangeEnd))
      : await listEventsInRange(user.id, workspaceId, ids, new Date(rangeStart), new Date(rangeEnd));
    return NextResponse.json({ events });
  } catch (err) {
    const msg = (err as Error).message;
    // Notebook v3 §2.4: never hide DB outage as empty — return 500
    if (msg.includes("DATABASE_URL") || msg.includes("Can't reach database") || msg.includes("P1001") || msg.includes("prisma") || msg.includes("Supabase not configured")) {
      console.error("GET /api/events infra error:", msg);
      return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Database unavailable. Try again." } }, { status: 500 });
    }
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("NOT_FOUND") ? 404 : msg.startsWith("CONFLICT") ? 409 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message: msg } }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  // Explicit demo mode only (TEMPO_DEMO_MODE=true) — fail closed otherwise
  if (isDemoMode() && body?.calendarId) {
    const demoCalIds = new Set(["work", "personal", "study", "health"]);
    if (demoCalIds.has(body.calendarId)) {
      const now = new Date().toISOString();
      const mock: DemoEvent = {
        id: `demo-${Date.now()}`,
        calendarId: body.calendarId,
        title: body.title ?? "(No title)",
        description: body.description ?? "",
        location: body.location ?? "",
        startAt: body.startAt ?? now,
        endAt: body.endAt ?? now,
        timezone: body.timezone ?? "UTC",
        allDay: !!body.allDay,
        status: "confirmed",
      };
      addToDemoStore(mock);
      return NextResponse.json({ event: mock }, { status: 201 });
    }
  }

  let user: { id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = (res.data?.user as { id: string } | null) ?? null;
  } catch (e) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: (e as Error).message } }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  try {
    const event = await createEvent(user.id, body);
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : "BAD_REQUEST", message: msg } }, { status });
  }
}
