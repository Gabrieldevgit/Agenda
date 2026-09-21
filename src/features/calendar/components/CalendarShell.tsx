"use client";
/**
 * Orchestrator — wires navigation state, server data (useCalendarEvents/useCalendars),
 * and the view components together. Implements Notebook v2 corrections:
 * - correct Day/Week/Month navigation (§16)
 * - correct view titles (§16)
 * - correct creation time via toInstant (§13)
 * - real calendars via /api/calendars with DEMO fallback (§18)
 * - search debounced wiring (§17)
 * - Month/Agenda real views (§15)
 * - Undo toast end-to-end (restore API) (§21)
 * - empty calendar filter not mutated (§19)
 */
import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { addDays, addMonths, mondayOf, titleForView, toInstant } from "@/lib/dates/date-utils";
import { useCalendarEvents, useEventMutations } from "../hooks/useCalendarEvents";
import { useCalendars } from "../hooks/useCalendars";
import { TimeGrid } from "./TimeGrid";
import { MonthView } from "./MonthView";
import { AgendaView } from "./AgendaView";
import { EventDialog } from "@/features/events/components/EventDialog";
import { ChevronLeftIcon, ChevronRightIcon, DayViewIcon, WeekViewIcon, MonthViewIcon, AgendaViewIcon, PlusIcon, SearchIcon, MenuIcon } from "@/lib/icons";
import type { CalendarSummary, CalendarView, EventDraft } from "../types";

const queryClient = new QueryClient();

const FALLBACK_CALENDARS: CalendarSummary[] = [
  { id: "work", name: "Work", color: "var(--work)", isDefault: true, isArchived: false },
  { id: "personal", name: "Personal", color: "var(--personal)", isDefault: false, isArchived: false },
  { id: "study", name: "Study", color: "var(--study)", isDefault: false, isArchived: false },
  { id: "health", name: "Health", color: "var(--health)", isDefault: false, isArchived: false },
];

export function CalendarShell(props: { workspaceId: string; timeZone: string }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CalendarShellInner {...props} />
    </QueryClientProvider>
  );
}

function CalendarShellInner({ workspaceId, timeZone }: { workspaceId: string; timeZone: string }) {
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [visibleCalendars, setVisibleCalendars] = useState<string[]>(FALLBACK_CALENDARS.map((c) => c.id));
  const [dialogDraft, setDialogDraft] = useState<EventDraft | null>(null);
  const [dialogIsNew, setDialogIsNew] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undoId?: string } | null>(null);

  // Debounce search (Notebook v2 §17/39)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: serverCalendars } = useCalendars(workspaceId);
  const calendars: CalendarSummary[] = serverCalendars && serverCalendars.length ? serverCalendars : FALLBACK_CALENDARS;

  // Keep visibleCalendars in sync when server calendars load first time (preserve user toggles otherwise)
  useEffect(() => {
    if (serverCalendars && serverCalendars.length && visibleCalendars.length === FALLBACK_CALENDARS.length) {
      // Only auto-sync if still on fallback set
      const ids = new Set(serverCalendars.map((c) => c.id));
      const fallbackSet = new Set(FALLBACK_CALENDARS.map((c) => c.id));
      const isFallback = visibleCalendars.every((id) => fallbackSet.has(id));
      if (isFallback) setVisibleCalendars(serverCalendars.map((c) => c.id));
    }
  }, [serverCalendars]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "month" || view === "agenda") {
      // For range fetching month/agenda still need full month buffer
      const monday = mondayOf(anchor, timeZone);
      return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    }
    const monday = mondayOf(anchor, timeZone);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [view, anchor, timeZone]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "month") {
      const zoned = anchor;
      // Expand to grid: start of month's Monday, end 42 days later
      const start = mondayOf(new Date(zoned.getFullYear(), zoned.getMonth(), 1), timeZone);
      // Actually need to compute correctly via civil: use mondayOf of month start
      // For simplicity use the same monday calculation above via startOfMonthInZone would be better,
      // but mondayOf already uses timezone. We'll align grid with MonthView's 42 cells.
      const monthStart = new Date(zoned.getFullYear(), zoned.getMonth(), 1);
      const m = mondayOf(monthStart, timeZone);
      return { rangeStart: m, rangeEnd: addDays(m, 42) };
    }
    if (view === "agenda") {
      const start = days[0]!;
      return { rangeStart: start, rangeEnd: addDays(start, 30) };
    }
    if (view === "day") {
      const s = days[0]!;
      return { rangeStart: s, rangeEnd: addDays(s, 1) };
    }
    // week
    return { rangeStart: days[0]!, rangeEnd: addDays(days[days.length - 1]!, 1) };
  }, [view, days, anchor, timeZone]);

  const rangeArgs = { workspaceId, calendarIds: visibleCalendars, rangeStart, rangeEnd, q: debouncedQ || undefined };
  const { data: events = [], isLoading, isError } = useCalendarEvents(rangeArgs);
  const { create, update, moveOrResize, remove, restore } = useEventMutations(rangeArgs);

  function openNewEventAt(dateKey: string, minutes: number) {
    // Notebook v2 §13: use clicked minutes, 60-min default, via timezone-aware toInstant
    const snapped = Math.round(minutes / 15) * 15;
    const startAt = toInstant(dateKey, snapped, timeZone);
    const endAt = toInstant(dateKey, snapped + 60, timeZone);
    setDialogIsNew(true);
    setDialogDraft({
      calendarId: visibleCalendars[0] ?? calendars[0]!.id,
      title: "",
      description: "",
      location: "",
      startAt,
      endAt,
      timezone: timeZone,
      allDay: false,
    });
  }

  function openExistingEvent(id: string) {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    setDialogIsNew(false);
    setDialogDraft(event);
  }

  function handleSave(draft: EventDraft) {
    if (dialogIsNew) create.mutate(draft);
    else if (draft.id) update.mutate({ ...draft, id: draft.id });
    setDialogDraft(null);
  }

  function handleDelete() {
    const id = dialogDraft?.id;
    if (!id) return;
    remove.mutate(id, {
      onSuccess: () => {
        setToast({ msg: "Event deleted.", undoId: id });
        setTimeout(() => setToast(null), 4000);
      },
    });
    setDialogDraft(null);
  }

  function handlePrev() {
    if (view === "day") setAnchor((d) => addDays(d, -1));
    else if (view === "week" || view === "agenda") setAnchor((d) => addDays(d, -7));
    else if (view === "month") setAnchor((d) => addMonths(d, -1, timeZone));
  }
  function handleNext() {
    if (view === "day") setAnchor((d) => addDays(d, 1));
    else if (view === "week" || view === "agenda") setAnchor((d) => addDays(d, 7));
    else if (view === "month") setAnchor((d) => addMonths(d, 1, timeZone));
  }

  const title = titleForView(anchor, view, timeZone);

  return (
    <div className="app">
      <header className="top">
        <button className="icon" aria-label="Toggle sidebar"><MenuIcon /></button>
        <button className="btn" onClick={() => setAnchor(new Date())}>Today</button>
        <button className="icon" aria-label="Previous" onClick={handlePrev}>
          <ChevronLeftIcon />
        </button>
        <button className="icon" aria-label="Next" onClick={handleNext}>
          <ChevronRightIcon />
        </button>
        <h1>{title}</h1>
        <div style={{ flex: 1 }} />
        <label className="search">
          <SearchIcon size={16} style={{ color: "var(--muted)" }} />
          <input type="search" placeholder="Search events" aria-label="Search events" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </label>
        <div className="seg" role="group" aria-label="View">
          {([
            ["day", DayViewIcon], ["week", WeekViewIcon], ["month", MonthViewIcon], ["agenda", AgendaViewIcon],
          ] as const).map(([v, Icon]) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
              <Icon size={16} /> {v[0]!.toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => openNewEventAt(rangeStart.toISOString().slice(0, 10), 9 * 60)}>
          <PlusIcon size={16} /> Create
        </button>
      </header>

      <div className="body">
        <aside className="side">
          <h2>My calendars</h2>
          {calendars.map((cal) => (
            <button
              key={cal.id}
              className="calrow"
              aria-pressed={visibleCalendars.includes(cal.id)}
              style={{ ["--c" as string]: cal.color }}
              onClick={() =>
                setVisibleCalendars((ids) =>
                  ids.includes(cal.id) ? ids.filter((id) => id !== cal.id) : [...ids, cal.id]
                )
              }
            >
              <span className="cb" />{cal.name}
            </button>
          ))}
        </aside>

        <main>
          {isError && <p role="alert" style={{ padding: 16 }}>Couldn&rsquo;t load events. Try again.</p>}
          {isLoading ? (
            <p style={{ padding: 16, color: "var(--muted)" }}>Loading&hellip;</p>
          ) : view === "month" ? (
            <MonthView anchor={anchor} events={events} calendars={calendars} timeZone={timeZone} onSelectEvent={openExistingEvent} onCreateAt={openNewEventAt} />
          ) : view === "agenda" ? (
            <AgendaView events={events} calendars={calendars} timeZone={timeZone} onSelectEvent={openExistingEvent} />
          ) : (
            <TimeGrid
              days={days}
              events={events}
              calendars={calendars}
              timeZone={timeZone}
              onSelectEvent={openExistingEvent}
              onCreateAt={openNewEventAt}
              onMoveOrResize={(id, startAt, endAt) => moveOrResize.mutate({ id, startAt, endAt })}
            />
          )}
        </main>
      </div>

      <EventDialog
        open={dialogDraft !== null}
        draft={dialogDraft}
        calendars={calendars}
        isNew={dialogIsNew}
        onClose={() => setDialogDraft(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {toast && (
        <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "var(--surface)", padding: "10px 14px", borderRadius: 10, display: "flex", gap: 12, alignItems: "center", zIndex: 60 }}>
          <span>{toast.msg}</span>
          {toast.undoId && (
            <button className="btn primary" style={{ height: 28 }} onClick={() => { if (toast.undoId) restore.mutate(toast.undoId); setToast(null); }}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
