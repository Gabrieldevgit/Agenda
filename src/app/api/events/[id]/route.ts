import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { deleteEvent, moveOrResizeEvent, updateEvent } from "@/server/services/event-service";

async function requireUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
    if (isDemoMode()) return { id: "demo-user" } as any; // demo bypass so PATCH/DELETE don't 401
    return null;
  } catch {
    if (isDemoMode()) return { id: "demo-user" } as any;
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  let body: any = null;
  try {
    body = await req.json();
    if (isDemoMode() && String(id).startsWith("demo-")) {
      // Echo mock in demo
      return NextResponse.json({ event: { id, ...body, title: body.title ?? "Demo" } });
    }
    // A bare {startAt, endAt} payload is a drag/resize; anything else is a full edit.
    const isMoveOrResize = Object.keys(body).every((k) => k === "startAt" || k === "endAt");
    const event = isMoveOrResize
      ? await moveOrResizeEvent(user.id, id, body)
      : await updateEvent(user.id, id, body);
    return NextResponse.json({ event });
  } catch (err) {
    const msg = (err as Error).message;
    if (isDemoMode() && (msg.includes("DATABASE_URL") || msg.includes("prisma") || msg.includes("P1001"))) {
      return NextResponse.json({ event: { id, ...(body ?? {}) } });
    }
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("NOT_FOUND") ? 404 : msg.startsWith("CONFLICT") ? 409 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : status === 409 ? "CONFLICT" : "BAD_REQUEST", message: msg } }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  if (isDemoMode() && String(id).startsWith("demo-")) return new NextResponse(null, { status: 204 });
  try {
    await deleteEvent(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = (err as Error).message;
    if (isDemoMode() && (msg.includes("DATABASE_URL") || msg.includes("prisma") || msg.includes("P1001"))) return new NextResponse(null, { status: 204 });
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("NOT_FOUND") ? 404 : msg.startsWith("CONFLICT") ? 409 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : status === 409 ? "CONFLICT" : "BAD_REQUEST", message: msg } }, { status });
  }
}
