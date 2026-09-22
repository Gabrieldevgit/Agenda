import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { resolveDefaultWorkspace } from "@/server/services/workspace-service";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";

export default async function Page() {
  // Notebook v3 §2.1: real auth → workspace resolver, never hardcode tenant in production.
  // Demo mode is explicit via TEMPO_DEMO_MODE=true (§2.2).
  if (isDemoMode()) {
    return <CalendarShell workspaceId="demo-workspace" timeZone="America/Toronto" />;
  }

  let user: { id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = (data?.user as any) ?? null;
  } catch (e) {
    // Supabase not configured and not in demo mode → fail closed
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Configuration required</h1>
        <p>Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and keys, or run with <code>TEMPO_DEMO_MODE=true</code> for local demo.</p>
        <p style={{ color: "#666", fontSize: 12 }}>{String((e as Error).message)}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Sign in required</h1>
        <p>You need to sign in to see your calendar.</p>
        <p><Link href="/login" style={{ color: "var(--accent)" }}>Go to login →</Link></p>
        <p style={{ marginTop: 16, color: "#666", fontSize: 12 }}>Demo: set <code>TEMPO_DEMO_MODE=true</code> in .env to bypass auth locally.</p>
      </div>
    );
  }

  // Resolve workspace server-side — never trust client-supplied workspaceId
  let workspaceId: string | null = null;
  try {
    const resolved = await resolveDefaultWorkspace(user.id);
    workspaceId = resolved?.workspaceId ?? null;
  } catch (e) {
    return (
      <div style={{ padding: 32 }}>
        <p>Database unavailable. Try again.</p>
        <p style={{ fontSize: 12, color: "#666" }}>{String((e as Error).message)}</p>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div style={{ padding: 32 }}>
        <h1>Workspace setup required</h1>
        <p>No workspace found for this user. Run onboarding/seed.</p>
      </div>
    );
  }

  let timeZone = "America/Toronto";
  try {
    const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
    if (profile?.defaultTimezone) timeZone = profile.defaultTimezone;
  } catch {
    // ignore, use fallback
  }

  return <CalendarShell workspaceId={workspaceId} timeZone={timeZone} />;
}
