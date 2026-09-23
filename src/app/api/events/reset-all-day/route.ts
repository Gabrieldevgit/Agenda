import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { resetAllDayEvents } from "@/server/services/event-service";
import { resetAllDayDemo } from "@/lib/demo/events";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { workspaceId, calendarIds } = body as { workspaceId: string; calendarIds?: string[] };

  if (!workspaceId) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "workspaceId required" } }, { status: 400 });
  }

  if (isDemoMode() && workspaceId === "demo-workspace") {
    const result = resetAllDayDemo(workspaceId, calendarIds);
    return NextResponse.json(result);
  }

  let user: { id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = (res.data?.user as { id: string } | null) ?? null;
    if (!user && isDemoMode()) user = { id: "demo-user" } as unknown as { id: string };
  } catch (e) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: (e as Error).message } }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  try {
    const result = await resetAllDayEvents(user.id, workspaceId, calendarIds);
    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("DATABASE_URL") || msg.includes("prisma")) {
      return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Database unavailable." } }, { status: 500 });
    }
    const status = msg.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : "BAD_REQUEST", message: msg } }, { status });
  }
}
