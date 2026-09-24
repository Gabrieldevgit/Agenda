import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/server/services/notification-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { workspaceId } = body as { workspaceId: string };
  if (!workspaceId) return NextResponse.json({ error: { message: "workspaceId required" } }, { status: 400 });

  if (isDemoMode() && workspaceId === "demo-workspace") {
    return NextResponse.json({ ok: true });
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
    await markAllNotificationsRead(user.id, workspaceId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}
