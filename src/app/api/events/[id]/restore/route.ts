import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { restoreEvent } from "@/server/services/event-service";
import { restoreDemoStore } from "@/lib/demo/events";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isDemoMode() && String(id).startsWith("demo-")) {
    const restored = restoreDemoStore(id);
    if (restored) return NextResponse.json({ event: restored });
    return NextResponse.json({ event: { id, title: "Restored", calendarId: "work", startAt: new Date().toISOString(), endAt: new Date().toISOString(), timezone: "UTC", allDay: false, status: "confirmed" } });
  }
  let user: any = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = res.data?.user;
    if (!user && isDemoMode()) user = { id: "demo-user" } as any;
  } catch {
    if (isDemoMode()) return NextResponse.json({ event: { id } });
  }
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  try {
    const event = await restoreEvent(user.id, id);
    return NextResponse.json({ event });
  } catch (err) {
    const msg = (err as Error).message;
    if (isDemoMode() && (msg.includes("DATABASE_URL") || msg.includes("prisma"))) return NextResponse.json({ event: { id } });
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("NOT_FOUND") ? 404 : msg.startsWith("CONFLICT") ? 409 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message: msg } }, { status });
  }
}
