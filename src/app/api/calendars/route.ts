import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { createCalendar, listCalendars } from "@/server/services/calendar-service";

const DEMO_CALENDARS = [
  { id: "work", name: "Work", color: "var(--work)", isDefault: true, isArchived: false, workspaceId: "demo-workspace" },
  { id: "personal", name: "Personal", color: "var(--personal)", isDefault: false, isArchived: false, workspaceId: "demo-workspace" },
  { id: "study", name: "Study", color: "var(--study)", isDefault: false, isArchived: false, workspaceId: "demo-workspace" },
  { id: "health", name: "Health", color: "var(--health)", isDefault: false, isArchived: false, workspaceId: "demo-workspace" },
];

export async function GET(req: NextRequest) {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "workspaceId required" } }, { status: 400 });

  if (workspaceId === "demo-workspace" && isDemoMode()) {
    return NextResponse.json({ calendars: DEMO_CALENDARS });
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
    const calendars = await listCalendars(user.id, workspaceId);
    return NextResponse.json({ calendars });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("DATABASE_URL") || msg.includes("prisma") || msg.includes("P1001") || msg.includes("Supabase not configured")) {
      console.error("GET /api/calendars infra error:", msg);
      return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Database unavailable." } }, { status: 500 });
    }
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : "BAD_REQUEST", message: msg } }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.workspaceId === "demo-workspace" && isDemoMode()) {
    const mock = { id: `cal-${Date.now()}`, workspaceId: body.workspaceId, name: body.name ?? "New Calendar", color: body.color ?? "var(--accent)", isDefault: false, isArchived: false };
    return NextResponse.json({ calendar: mock }, { status: 201 });
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
    const { workspaceId, name, color } = body as { workspaceId: string; name: string; color: string };
    if (!workspaceId || !name || !color) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "workspaceId/name/color required" } }, { status: 400 });
    const calendar = await createCalendar(user.id, workspaceId, { name, color });
    return NextResponse.json({ calendar }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : "BAD_REQUEST", message: msg } }, { status });
  }
}
