"use client";
import { useEffect, useState } from "react";
import { CloseIcon, SunIcon, MoonIcon, SettingsIcon, ClockIcon, BellIcon, UserIcon, LayoutIcon, GlobeIcon, LogOutIcon } from "@/lib/icons";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { useSettings, TIMEZONES } from "@/lib/settings";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CalendarSummary } from "@/features/calendar/types";

type Tab = "appearance" | "calendar" | "notifications" | "account";

export function SettingsDialog({ open, onClose, calendars }: { open: boolean; onClose: () => void; calendars?: CalendarSummary[] }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [tab, setTab] = useState<Tab>("appearance");
  const { settings, update } = useSettings();

  useEffect(() => { if (open) setThemeState(getStoredTheme()); }, [open]);

  if (!open) return null;

  function choose(t: Theme) {
    setThemeState(t);
    setTheme(t);
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label="Settings" style={{ maxWidth: 640, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 14px", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <SettingsIcon size={20} />
          <h2 style={{ margin: 0, font: "700 18px var(--font-display)", flex: 1 }}>Settings</h2>
          <button className="icon" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: "1px solid var(--line)", overflowX: "auto", flex: "none" }}>
          {([
            ["appearance", "Appearance", LayoutIcon],
            ["calendar", "Calendar", ClockIcon],
            ["notifications", "Notifications", BellIcon],
            ["account", "Account", UserIcon],
          ] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setTab(v as Tab)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 20,
                border: tab === v ? "1px solid var(--accent)" : "1px solid var(--line)",
                background: tab === v ? "color-mix(in srgb, var(--accent) 14%, var(--surface))" : "transparent",
                color: tab === v ? "var(--accent)" : "var(--muted)",
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px 20px 8px" }}>
          {tab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><LayoutIcon size={14} /> Theme</div>
                <div className="picks" role="radiogroup" aria-label="Theme" style={{ gap: 8 }}>
                  {([
                    ["light", "Light", SunIcon],
                    ["dark", "Dark", MoonIcon],
                    ["system", "System", SettingsIcon],
                  ] as const).map(([v, label, Icon]) => (
                    <button
                      key={v}
                      type="button"
                      className="pick"
                      role="radio"
                      aria-checked={theme === v}
                      onClick={() => choose(v as Theme)}
                      style={{ flex: 1, justifyContent: "center", height: 40 }}
                    >
                      <Icon size={16} />{label}
                    </button>
                  ))}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>System follows your OS. Stored in <code style={{ background: "var(--hover)", padding: "2px 6px", borderRadius: 6 }}>localStorage</code>.</p>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 8 }}>Density</div>
                <div className="picks">
                  {(["comfortable", "compact"] as const).map((d) => (
                    <button key={d} className="pick" role="radio" aria-checked={settings.density === d} onClick={() => update({ density: d })} style={{ flex: 1, justifyContent: "center" }}>
                      {d[0]!.toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, background: "var(--hover)", padding: 12, borderRadius: 12 }}>
                <strong style={{ color: "var(--ink)" }}>Pro tip:</strong> Try <em>Dark</em> for late-night planning — Tempo’s tokens adapt automatically.
              </div>
            </div>
          )}

          {tab === "calendar" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", display: "block", marginBottom: 6 }}><GlobeIcon size={12} style={{ marginRight: 6, verticalAlign: -1 }} /> Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => update({ timezone: e.target.value })}
                  style={{ width: "100%", height: 38, borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", padding: "0 10px", fontWeight: 600 }}
                >
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted)" }}>Used to display event times. Your profile default is also saved on the server.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", display: "block", marginBottom: 6 }}>Week starts on</label>
                  <div className="picks">
                    {(["monday", "sunday"] as const).map((w) => (
                      <button key={w} className="pick" role="radio" aria-checked={settings.weekStart === w} onClick={() => update({ weekStart: w })} style={{ flex: 1, justifyContent: "center" }}>
                        {w === "monday" ? "Monday" : "Sunday"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", display: "block", marginBottom: 6 }}>Time format</label>
                  <div className="picks">
                    {(["12h", "24h"] as const).map((f) => (
                      <button key={f} className="pick" role="radio" aria-checked={settings.timeFormat === f} onClick={() => update({ timeFormat: f })} style={{ flex: 1, justifyContent: "center" }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", display: "block", marginBottom: 6 }}>Default calendar</label>
                  <select
                    value={settings.defaultCalendarId ?? ""}
                    onChange={(e) => update({ defaultCalendarId: e.target.value || null })}
                    style={{ width: "100%", height: 38, borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", padding: "0 10px", fontWeight: 600 }}
                  >
                    <option value="">— First visible —</option>
                    {calendars?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", display: "block", marginBottom: 6 }}>Default duration</label>
                  <select
                    value={settings.defaultDuration}
                    onChange={(e) => update({ defaultDuration: Number(e.target.value) })}
                    style={{ width: "100%", height: 38, borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", padding: "0 10px", fontWeight: 600 }}
                  >
                    {[15, 30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n} min</option>)}
                  </select>
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--hover)", borderRadius: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.showWeekends} onChange={(e) => update({ showWeekends: e.target.checked })} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>Show weekends</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{settings.showWeekends ? "On" : "Off"}</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--hover)", borderRadius: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.showPastEvents} onChange={(e) => update({ showPastEvents: e.target.checked })} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>Show past events in Up Next</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{settings.showPastEvents ? "On" : "Off"}</span>
              </label>
            </div>
          )}

          {tab === "notifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "var(--hover)", borderRadius: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => update({ emailNotifications: e.target.checked })} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>Email reminders</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Daily agenda + 15 min before events</span>
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "var(--hover)", borderRadius: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.pushNotifications} onChange={(e) => update({ pushNotifications: e.target.checked })} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>Push notifications</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Browser notifications when supported</span>
                </span>
              </label>
              <div style={{ fontSize: 12, color: "var(--muted)", background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
                Reminders run in the background (future: `Reminder` → queue → email/push). Toggle here controls your preference; delivery is server-side.
              </div>
            </div>
          )}

          {tab === "account" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "var(--hover)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>Your workspace</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  Signed in via Supabase Auth. Your calendars and events are isolated per workspace via <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 6, border: "1px solid var(--line)" }}>membership</code>.
                </div>
              </div>

              <button
                onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 40, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--now)", fontWeight: 700, cursor: "pointer" }}
              >
                <LogOutIcon size={16} /> Sign out
              </button>

              <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
                Tempo Agenda · <a href="https://github.com/Gabrieldevgit/Agenda" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>GitHub</a> · v0.1
              </div>
            </div>
          )}
        </div>

        <div className="acts" style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", flex: "none" }}>
          <span style={{ flex: 1 }} />
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
