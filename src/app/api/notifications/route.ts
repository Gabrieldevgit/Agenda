import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { listNotifications, createNotification } from "@/server/services/notification-service";

export async function GET(req: NextRequest) {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: { message: "workspaceId required" } }, { status: 400 });

  if (isDemoMode() && workspaceId === "demo-workspace") {
    // Demo mock: return empty or a welcome notification
    return NextResponse.json({
      items: [
        { id: "demo-n1", userId: "demo-user", workspaceId, type: "system", title: "Welcome to Tempo", body: "Your calendar is ready. Try creating an event or enabling AI.", isRead: false, createdAt: new Date().toISOString(), eventId: null },
      ],
      unread: 1,
    });
  }

  let user: { id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = (res.data?.user as { id: string } | null) ?? null;
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: { message: "Sign in required." } }, { status: 401 });

  try {
    const data = await listNotifications(user.id, workspaceId);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { workspaceId, type, title, body: msgBody, eventId } = body as {
    workspaceId: string;
    type?: string;
    title: string;
    body?: string;
    eventId?: string;
  };
  if (!workspaceId || !title) return NextResponse.json({ error: { message: "workspaceId and title required" } }, { status: 400 });

  if (isDemoMode() && workspaceId === "demo-workspace") {
    return NextResponse.json({ id: `demo-${Date.now()}`, ok: true });
  }

  let user: { id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = (res.data?.user as { id: string } | null) ?? null;
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: { message: "Sign in required." } }, { status: 401 });

  try {
    const notif = await createNotification(user.id, workspaceId, {
      type: type || "system",
      title,
      body: msgBody,
      eventId,
    });
    return NextResponse.json(notif);
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}
