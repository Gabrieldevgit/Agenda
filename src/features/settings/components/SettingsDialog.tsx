"use client";
import { useEffect, useState } from "react";
import { CloseIcon, SunIcon, MoonIcon, SettingsIcon } from "@/lib/icons";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => { if (open) setThemeState(getStoredTheme()); }, [open]);

  if (!open) return null;

  function choose(t: Theme) {
    setThemeState(t);
    setTheme(t);
  }

  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label="Settings" style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <SettingsIcon size={20} />
          <h2 style={{ margin: 0, font: "700 18px var(--font-display)", flex: 1 }}>Settings</h2>
          <button className="icon" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="fld" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <span className="k" style={{ width: "auto" }}>Appearance</span>
          <div className="picks" role="radiogroup" aria-label="Theme">
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
                style={{ flex: 1, justifyContent: "center" }}
              >
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>
            System follows your OS light/dark preference. Light and Dark override it.
          </p>
        </div>

        <div className="fld" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 16 }}>
          <span className="k" style={{ width: "auto" }}>About</span>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>Tempo Agenda — calendar for people who actually keep it up to date.</p>
            <p style={{ margin: "8px 0 0" }}>Theme adapts to <code style={{ background: "var(--hover)", padding: "2px 6px", borderRadius: 6 }}>prefers-color-scheme</code> and <code style={{ background: "var(--hover)", padding: "2px 6px", borderRadius: 6 }}>data-theme</code>. Your choice is stored locally.</p>
          </div>
        </div>

        <div className="acts" style={{ marginTop: 18 }}>
          <span style={{ flex: 1 }} />
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
