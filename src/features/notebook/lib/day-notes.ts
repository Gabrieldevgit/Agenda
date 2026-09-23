/**
 * Per-day free-text notes for the Notebook page view. There's no `notes`
 * column on Event/Calendar in the schema, and a day itself isn't a row in
 * the DB — so this is deliberately local-only, same pattern as
 * `src/lib/settings.ts`: scoped per workspace + civil day, persisted to
 * localStorage, nothing sent to the server.
 */
const PREFIX = "tempo-notebook-note:";

function key(workspaceId: string, dateKey: string) {
  return `${PREFIX}${workspaceId}:${dateKey}`;
}

export function getDayNote(workspaceId: string, dateKey: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(key(workspaceId, dateKey)) ?? "";
  } catch {
    return "";
  }
}

export function setDayNote(workspaceId: string, dateKey: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value.trim()) localStorage.setItem(key(workspaceId, dateKey), value);
    else localStorage.removeItem(key(workspaceId, dateKey)); // don't keep empty notes around
  } catch {
    // localStorage can throw (private mode, quota) — notes just won't persist
  }
}
