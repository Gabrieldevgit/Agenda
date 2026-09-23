import { useEffect, useState } from "react";

export type WeekStart = "monday" | "sunday";
export type TimeFormat = "12h" | "24h";

export interface UserSettings {
  timezone: string;
  weekStart: WeekStart;
  timeFormat: TimeFormat;
  defaultCalendarId: string | null;
  defaultDuration: number; // minutes
  showWeekends: boolean;
  showPastEvents: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  density: "comfortable" | "compact";
}

const KEY = "tempo-settings";

const DEFAULTS: UserSettings = {
  timezone: "America/Toronto",
  weekStart: "monday",
  timeFormat: "12h",
  defaultCalendarId: null,
  defaultDuration: 60,
  showWeekends: true,
  showPastEvents: true,
  emailNotifications: true,
  pushNotifications: false,
  density: "comfortable",
};

export function getSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(patch: Partial<UserSettings>) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  // Dispatch event so other hooks update
  window.dispatchEvent(new CustomEvent("tempo-settings-changed", { detail: next }));
  return next;
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);

  useEffect(() => {
    setSettings(getSettings());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as UserSettings | undefined;
      setSettings(detail ?? getSettings());
    };
    const storageHandler = () => setSettings(getSettings());
    window.addEventListener("tempo-settings-changed", handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("tempo-settings-changed", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const update = (patch: Partial<UserSettings>) => {
    const next = saveSettings(patch);
    setSettings(next);
  };

  return { settings, update, defaults: DEFAULTS };
}

export const TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Lisbon",
  "Africa/Casablanca",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Australia/Sydney",
  "UTC",
];
