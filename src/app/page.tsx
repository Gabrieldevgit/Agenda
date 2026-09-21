import { CalendarShell } from "@/features/calendar/components/CalendarShell";

export default function Page() {
  // In production this reads the signed-in user's default workspace.
  // Left explicit here so the calendar feature stays workspace-agnostic.
  return <CalendarShell workspaceId="demo-workspace" timeZone="America/Toronto" />;
}
