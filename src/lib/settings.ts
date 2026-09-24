import { useEffect, useState } from "react";

export type WeekStart = "monday" | "sunday";
export type TimeFormat = "12h" | "24h";

export type AiProvider = "groq" | "openrouter" | "custom";
export interface AiPermissions {
  canRead: boolean;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canCreateCalendars: boolean;
  canManageCalendars: boolean;
}

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
  // AI
  aiEnabled: boolean;
  aiProvider: AiProvider;
  aiModel: string;
  aiApiKey: string; // stored locally, full key without prefix
  aiKeyPrefix: string; // shown before input, from env or user
  aiPermissions: AiPermissions;
  aiVisionEnabled: boolean; // allow image attachments
}

const KEY = "tempo-settings";

const ENV_PREFIX = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_GROQ_KEY_PREFIX || process.env.NEXT_PUBLIC_AI_KEY_PREFIX || "gsk_") : "gsk_";

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
  aiEnabled: false,
  aiProvider: "groq",
  aiModel: "llama-3.1-8b-instant",
  aiApiKey: "",
  aiKeyPrefix: ENV_PREFIX,
  aiPermissions: {
    canRead: true,
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: false,
    canCreateCalendars: true,
    canManageCalendars: false,
  },
  aiVisionEnabled: true,
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
