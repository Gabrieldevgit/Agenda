import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { createSupabaseServerClient, isDemoMode } from "@/lib/supabase/server";
import { ensureDefaultWorkspaceForUser, resolveDefaultWorkspace } from "@/server/services/workspace-service";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";

function LandingPage() {
  return (
    <main className="landing">
      <style>{`
        .landing {
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(900px 520px at 12% -5%, color-mix(in srgb, #7c72ff 22%, transparent), transparent 64%),
            radial-gradient(820px 500px at 92% 8%, color-mix(in srgb, #4aa7ff 16%, transparent), transparent 62%),
            linear-gradient(180deg, #0b0d16 0%, #0d1019 55%, #111521 100%);
          color: #fff;
          position: relative;
        }
        .landing::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.75), transparent 72%);
        }
        .landing-shell { width: min(1180px, calc(100% - 40px)); margin: 0 auto; position: relative; z-index: 1; }
        .landing-nav { height: 76px; display: flex; align-items: center; gap: 28px; border-bottom: 1px solid rgba(255,255,255,.08); }
        .landing-brand { display: inline-flex; align-items: center; gap: 11px; text-decoration: none; color: #fff; font: 700 21px/1 var(--font-display); letter-spacing: -.03em; }
        .landing-mark { width: 34px; height: 34px; border-radius: 11px; position: relative; background: linear-gradient(135deg, #7f7bff, #5c88ff); box-shadow: 0 10px 28px rgba(92,136,255,.26); }
        .landing-mark::before { content: ""; position: absolute; left: 8px; top: 8px; width: 11px; height: 11px; border: 2px solid rgba(255,255,255,.92); border-radius: 3px; }
        .landing-mark::after { content: ""; position: absolute; right: 6px; bottom: 6px; width: 7px; height: 7px; border-radius: 50%; background: #fff; }
        .landing-nav-links { display: flex; align-items: center; gap: 6px; margin-left: auto; }
        .landing-nav-link { color: #adb7d2; text-decoration: none; font-size: 13px; font-weight: 600; padding: 9px 11px; border-radius: 10px; transition: .18s ease; }
        .landing-nav-link:hover { color: #fff; background: rgba(255,255,255,.06); }
        .landing-signin { color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); border-radius: 11px; padding: 10px 14px; font-weight: 700; font-size: 13px; margin-left: 6px; transition: .18s ease; backdrop-filter: blur(14px); }
        .landing-signin:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.22); }
        .landing-hero { padding: 78px 0 58px; display: grid; grid-template-columns: minmax(0, 1.03fr) minmax(0, .97fr); gap: 54px; align-items: center; }
        .landing-eyebrow { display: inline-flex; align-items: center; gap: 8px; color: #b9c3dc; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); border-radius: 999px; padding: 8px 12px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .landing-eyebrow i { width: 7px; height: 7px; border-radius: 50%; background: #6f9cff; box-shadow: 0 0 16px rgba(111,156,255,.8); }
        .landing-title { margin: 18px 0 0; max-width: 730px; font: 700 clamp(46px, 6vw, 78px)/.98 var(--font-display); letter-spacing: -.055em; }
        .landing-title span { background: linear-gradient(100deg, #dfe5ff 8%, #9f9bff 44%, #6ba9ff 86%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .landing-copy { margin: 22px 0 0; max-width: 620px; color: #aeb8ce; font-size: 17px; line-height: 1.65; }
        .landing-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
        .landing-cta, .landing-cta-secondary { min-height: 46px; padding: 0 17px; border-radius: 12px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; transition: .18s ease; }
        .landing-cta { color: #101421; background: linear-gradient(135deg, #d7deff, #9ea5ff); box-shadow: 0 14px 34px rgba(112,126,255,.24); }
        .landing-cta:hover { transform: translateY(-1px); filter: brightness(1.03); }
        .landing-cta-secondary { color: #e5eaff; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.11); }
        .landing-cta-secondary:hover { background: rgba(255,255,255,.08); }
        .landing-proof { margin-top: 17px; color: #7f8aa4; font-size: 12px; }
        .landing-product { position: relative; min-height: 470px; display: grid; place-items: center; }
        .landing-orb { position: absolute; width: 330px; height: 330px; border-radius: 50%; background: radial-gradient(circle, rgba(118,129,255,.23), rgba(118,129,255,0) 68%); filter: blur(8px); }
        .landing-dashboard { position: relative; width: min(100%, 560px); border-radius: 22px; border: 1px solid rgba(255,255,255,.1); background: rgba(17,21,33,.84); box-shadow: 0 38px 90px rgba(0,0,0,.5), 0 0 0 8px rgba(255,255,255,.018); overflow: hidden; backdrop-filter: blur(18px); transform: perspective(1200px) rotateY(-4deg) rotateX(2deg); }
        .landing-windowbar { height: 44px; display: flex; align-items: center; gap: 7px; padding: 0 15px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .landing-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.2); }
        .landing-window-title { margin-left: 6px; font-size: 10px; color: #79839b; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
        .landing-dashboard-body { display: grid; grid-template-columns: 118px 1fr; min-height: 340px; }
        .landing-side { padding: 14px 11px; border-right: 1px solid rgba(255,255,255,.07); }
        .landing-side-item { height: 31px; display: flex; align-items: center; gap: 8px; padding: 0 9px; border-radius: 9px; color: #76819a; font-size: 10px; font-weight: 600; margin-bottom: 4px; }
        .landing-side-item.active { color: #edf1ff; background: rgba(125,131,255,.14); }
        .landing-side-dot { width: 6px; height: 6px; border-radius: 50%; background: #7385ff; }
        .landing-calendar { padding: 17px 16px 16px; }
        .landing-calendar-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .landing-calendar-title { font: 700 18px var(--font-display); color: #f4f6ff; }
        .landing-calendar-actions { display: flex; gap: 5px; }
        .landing-mini-button { width: 22px; height: 22px; border-radius: 7px; background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.06); }
        .landing-week { display: grid; grid-template-columns: 46px repeat(5, 1fr); gap: 0; border: 1px solid rgba(255,255,255,.07); border-radius: 13px; overflow: hidden; }
        .landing-week > div { min-height: 50px; border-right: 1px solid rgba(255,255,255,.055); border-bottom: 1px solid rgba(255,255,255,.055); }
        .landing-week-head { min-height: 38px !important; display: grid; place-items: center; color: #76819a; font-size: 9px; font-weight: 700; }
        .landing-time { min-height: 78px !important; display: flex; justify-content: flex-end; padding: 7px 6px 0 0; color: #5e6980; font-size: 8px; }
        .landing-cell { position: relative; min-height: 78px !important; }
        .landing-event { position: absolute; left: 5px; right: 5px; border-radius: 7px; padding: 6px 7px; font-size: 8px; line-height: 1.25; font-weight: 700; color: #eff3ff; background: linear-gradient(135deg, rgba(104,106,255,.85), rgba(83,157,255,.72)); box-shadow: 0 5px 16px rgba(84,111,255,.18); }
        .landing-event.secondary { background: linear-gradient(135deg, rgba(199,93,153,.75), rgba(150,102,255,.72)); }
        .landing-event.green { background: linear-gradient(135deg, rgba(55,171,165,.75), rgba(73,137,255,.65)); }
        .landing-event em { display: block; font-style: normal; opacity: .7; font-size: 7px; margin-top: 2px; font-weight: 500; }
        .landing-section { padding: 24px 0 88px; }
        .landing-section-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
        .landing-section-title { margin: 0; font: 700 30px/1.08 var(--font-display); letter-spacing: -.03em; }
        .landing-section-copy { margin: 7px 0 0; color: #8e99b2; max-width: 620px; font-size: 14px; }
        .landing-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
        .landing-card { min-height: 180px; padding: 19px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.035); box-shadow: inset 0 1px 0 rgba(255,255,255,.03); }
        .landing-card-icon { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: linear-gradient(135deg, rgba(123,128,255,.18), rgba(76,154,255,.1)); color: #bfc8ff; font-size: 11px; font-weight: 800; margin-bottom: 18px; }
        .landing-card h3 { margin: 0; font: 700 16px var(--font-display); letter-spacing: -.02em; }
        .landing-card p { margin: 7px 0 0; color: #8f99b0; font-size: 12.5px; line-height: 1.55; }
        .landing-bottom { margin: 8px 0 38px; padding: 26px; border-radius: 18px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(110deg, rgba(118,121,255,.12), rgba(70,159,255,.06)); display: flex; align-items: center; justify-content: space-between; gap: 22px; }
        .landing-bottom h2 { margin: 0; font: 700 22px var(--font-display); letter-spacing: -.03em; }
        .landing-bottom p { margin: 5px 0 0; color: #96a0b8; font-size: 13px; }
        .landing-footer { padding: 24px 0 38px; border-top: 1px solid rgba(255,255,255,.07); color: #68738b; display: flex; justify-content: space-between; gap: 20px; font-size: 11px; }
        .landing-footer a { color: #8f9ab4; text-decoration: none; }
        .landing-footer a:hover { color: #fff; }
        @media (max-width: 980px) {
          .landing-hero { grid-template-columns: 1fr; }
          .landing-product { min-height: 380px; }
          .landing-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 680px) {
          .landing-shell { width: min(100% - 24px, 1180px); }
          .landing-nav { height: 66px; gap: 9px; }
          .landing-nav-links { display: none; }
          .landing-brand { margin-right: auto; }
          .landing-hero { padding: 54px 0 34px; gap: 22px; }
          .landing-title { font-size: clamp(42px, 13vw, 60px); }
          .landing-copy { font-size: 15px; }
          .landing-product { min-height: 300px; }
          .landing-dashboard { transform: none; }
          .landing-dashboard-body { grid-template-columns: 92px 1fr; min-height: 270px; }
          .landing-side { padding: 11px 8px; }
          .landing-calendar { padding: 12px 10px; }
          .landing-week { grid-template-columns: 32px repeat(5,1fr); }
          .landing-grid { grid-template-columns: 1fr; }
          .landing-bottom { flex-direction: column; align-items: flex-start; }
          .landing-footer { flex-direction: column; }
        }
      `}</style>

      <div className="landing-shell">
        <nav className="landing-nav" aria-label="Landing">
          <Link className="landing-brand" href="/">
            <span className="landing-mark" aria-hidden="true" />
            <span>Tempo</span>
          </Link>
          <div className="landing-nav-links">
            <a className="landing-nav-link" href="#features">Features</a>
            <a className="landing-nav-link" href="#workflow">Workflow</a>
            <a className="landing-nav-link" href="#views">Views</a>
          </div>
          <Link className="landing-signin" href="/login">Sign in</Link>
        </nav>

        <section className="landing-hero">
          <div>
            <div className="landing-eyebrow"><i /> Modern agenda workspace</div>
            <h1 className="landing-title">Your time, <span>organized beautifully.</span></h1>
            <p className="landing-copy">A focused agenda for planning real days, not filling dashboards with noise. Move between Day, Week, Month, Agenda, Book and Year views, create events quickly, and keep your schedule close at hand.</p>
            <div className="landing-actions">
              <Link className="landing-cta" href="/login">Open your agenda</Link>
              <a className="landing-cta-secondary" href="#features">Explore features</a>
            </div>
            <div className="landing-proof">Drag and drop · Realtime updates · Command palette · Context actions</div>
          </div>

          <div className="landing-product" aria-label="Agenda preview">
            <div className="landing-orb" />
            <div className="landing-dashboard">
              <div className="landing-windowbar">
                <span className="landing-dot" /><span className="landing-dot" /><span className="landing-dot" />
                <span className="landing-window-title">tempo workspace</span>
              </div>
              <div className="landing-dashboard-body">
                <aside className="landing-side">
                  <div className="landing-side-item active"><span className="landing-side-dot" />Week</div>
                  <div className="landing-side-item">Today</div>
                  <div className="landing-side-item">Agenda</div>
                  <div className="landing-side-item">Book</div>
                  <div className="landing-side-item">Year</div>
                  <div className="landing-side-item">Calendars</div>
                </aside>
                <div className="landing-calendar">
                  <div className="landing-calendar-top">
                    <div className="landing-calendar-title">This week</div>
                    <div className="landing-calendar-actions"><span className="landing-mini-button" /><span className="landing-mini-button" /></div>
                  </div>
                  <div className="landing-week">
                    <div className="landing-week-head" />
                    {["MON", "TUE", "WED", "THU", "FRI"].map((day) => <div className="landing-week-head" key={day}>{day}</div>)}
                    <div className="landing-time">09:00</div>
                    <div className="landing-cell"><div className="landing-event" style={{ top: 8, height: 44 }}>Product review<em>09:15 · 10:00</em></div></div>
                    <div className="landing-cell"><div className="landing-event green" style={{ top: 22, height: 52 }}>Deep work<em>09:30 · 10:30</em></div></div>
                    <div className="landing-cell" />
                    <div className="landing-cell"><div className="landing-event secondary" style={{ top: 10, height: 44 }}>Design sync<em>09:15 · 10:00</em></div></div>
                    <div className="landing-cell" />
                    <div className="landing-time">11:00</div>
                    <div className="landing-cell" />
                    <div className="landing-cell"><div className="landing-event secondary" style={{ top: 14, height: 48 }}>Lunch<em>11:30 · 12:30</em></div></div>
                    <div className="landing-cell" />
                    <div className="landing-cell" />
                    <div className="landing-cell"><div className="landing-event" style={{ top: 7, height: 45 }}>Planning<em>11:15 · 12:00</em></div></div>
                    <div className="landing-time">14:00</div>
                    <div className="landing-cell"><div className="landing-event green" style={{ top: 9, height: 46 }}>Focus block<em>14:15 · 15:00</em></div></div>
                    <div className="landing-cell" />
                    <div className="landing-cell"><div className="landing-event" style={{ top: 28, height: 48 }}>Team call<em>14:30 · 15:30</em></div></div>
                    <div className="landing-cell" />
                    <div className="landing-cell" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-head">
            <div>
              <h2 className="landing-section-title">A calendar that feels intentional.</h2>
              <p className="landing-section-copy">The public page now explains the product instead of dropping unauthenticated visitors onto a bare sign-in wall.</p>
            </div>
          </div>
          <div className="landing-grid">
            <article className="landing-card"><div className="landing-card-icon">01</div><h3>Plan at the right level</h3><p>Jump between day, week, month, agenda, book and year views depending on the task in front of you.</p></article>
            <article className="landing-card"><div className="landing-card-icon">02</div><h3>Move things naturally</h3><p>Create events quickly, drag and resize them, duplicate them, and use contextual actions when you need precision.</p></article>
            <article className="landing-card"><div className="landing-card-icon">03</div><h3>Stay in sync</h3><p>Realtime event updates keep the workspace current across connected clients without turning the interface into a control room.</p></article>
            <article className="landing-card"><div className="landing-card-icon">04</div><h3>Work faster</h3><p>Use search, keyboard shortcuts, the command palette, reminders and the built-in productivity tools to reduce friction.</p></article>
          </div>
        </section>

        <section className="landing-section" id="workflow">
          <div className="landing-bottom">
            <div><h2>Ready when your day starts.</h2><p>Sign in to continue to your workspace and build the schedule around how you actually work.</p></div>
            <Link className="landing-cta" href="/login">Continue to Tempo</Link>
          </div>
        </section>

        <footer className="landing-footer">
          <span>Tempo · A focused agenda workspace</span>
          <span><a href="/login">Sign in</a></span>
        </footer>
      </div>
    </main>
  );
}

export default async function Page() {
  if (isDemoMode()) {
    return <CalendarShell workspaceId="demo-workspace" timeZone="America/Toronto" />;
  }

  let user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = (data?.user as { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) ?? null;
  } catch (e) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Configuration required</h1>
        <p>Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and keys, or run with <code>TEMPO_DEMO_MODE=true</code> for local demo.</p>
        <p style={{ color: "#666", fontSize: 12 }}>{String((e as Error).message)}</p>
      </div>
    );
  }

  if (!user) return <LandingPage />;

  let workspaceId: string | null = null;
  try {
    const resolved = await resolveDefaultWorkspace(user.id);
    workspaceId = resolved?.workspaceId ?? null;
    if (!workspaceId) {
      const onboarded = await ensureDefaultWorkspaceForUser(user.id, {
        email: user.email ?? null,
        displayName: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
      });
      workspaceId = onboarded.workspaceId;
    }
  } catch (e) {
    return <div style={{ padding: 32 }}><p>Database unavailable. Try again.</p><p style={{ fontSize: 12, color: "#666" }}>{String((e as Error).message)}</p></div>;
  }

  let timeZone = "America/Toronto";
  try {
    const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
    if (profile?.defaultTimezone) timeZone = profile.defaultTimezone;
  } catch {}

  return <CalendarShell workspaceId={workspaceId} timeZone={timeZone} />;
}
