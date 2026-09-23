"use client";
/**
 * Orchestrator — wires navigation state, server data (useCalendarEvents/useCalendars),
 * and the view components together. Implements Notebook v2/v3 corrections plus
 * prototype chrome parity (brand, mini calendar, UpNext, all-day row, tabs/FAB, keyboard).
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, mondayOf, startOfWeek, titleForView, toInstant } from "@/lib/dates/date-utils";
import { useCalendarEvents, useEventMutations } from "../hooks/useCalendarEvents";
import { useCalendars } from "../hooks/useCalendars";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TimeGrid } from "./TimeGrid";
import { MonthView } from "./MonthView";
import { AgendaView } from "./AgendaView";
import { MiniCalendar } from "./MiniCalendar";
import { UpNext } from "./UpNext";
import { RealtimeClock } from "@/features/clock/components/RealtimeClock";
import { PomodoroTimer } from "@/features/pomodoro/components/PomodoroTimer";
import { GlobalSearch } from "./GlobalSearch";
import { EventDialog } from "@/features/events/components/EventDialog";
import { ChevronLeftIcon, ChevronRightIcon, DayViewIcon, WeekViewIcon, MonthViewIcon, AgendaViewIcon, PlusIcon, MenuIcon, SettingsIcon, PrintIcon, TrashIcon } from "@/lib/icons";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import { PrintDialog } from "@/features/print/components/PrintDialog";
import { useRealtimeEvents } from "../hooks/useRealtimeEvents";
import { useSettings } from "@/lib/settings";
import type { CalendarSummary, CalendarView, EventDraft, EventRecord } from "../types";
import { dayKey } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";

const FALLBACK_CALENDARS: CalendarSummary[] = [
  { id: "work", name: "Work", color: "var(--work)", isDefault: true, isArchived: false },
  { id: "personal", name: "Personal", color: "var(--personal)", isDefault: false, isArchived: false },
  { id: "study", name: "Study", color: "var(--study)", isDefault: false, isArchived: false },
  { id: "health", name: "Health", color: "var(--health)", isDefault: false, isArchived: false },
];

export function CalendarShell(props: { workspaceId: string; timeZone: string }) {
  return <CalendarShellInner {...props} />;
}

function CalendarShellInner({ workspaceId, timeZone }: { workspaceId: string; timeZone: string }) {
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [miniAnchor, setMiniAnchor] = useState(new Date());
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [visibleCalendars, setVisibleCalendars] = useState<string[]>(FALLBACK_CALENDARS.map((c) => c.id));
  const [dialogDraft, setDialogDraft] = useState<EventDraft | null>(null);
  const [dialogIsNew, setDialogIsNew] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState<{ msg: string; undoId?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [lastReset, setLastReset] = useState<{ ids: string[]; count: number } | null>(null);
  const { settings } = useSettings();
  const effectiveTimeZone = settings.timezone || timeZone;
  const weekStart = settings.weekStart;
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: serverCalendars, isLoading: calLoading, isError: calError } = useCalendars(workspaceId);
  const calendars: CalendarSummary[] = (() => {
    if (calError) return FALLBACK_CALENDARS;
    if (calLoading) return FALLBACK_CALENDARS;
    if (serverCalendars && serverCalendars.length) return serverCalendars;
    if (serverCalendars && serverCalendars.length === 0) return [];
    return FALLBACK_CALENDARS;
  })();

  useEffect(() => {
    if (serverCalendars && serverCalendars.length && visibleCalendars.length === FALLBACK_CALENDARS.length) {
      const fallbackSet = new Set(FALLBACK_CALENDARS.map((c) => c.id));
      const isFallback = visibleCalendars.every((id) => fallbackSet.has(id));
      if (isFallback) setVisibleCalendars(serverCalendars.map((c) => c.id));
    }
  }, [serverCalendars]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep mini in sync with anchor's month when anchor moves visibly
  useEffect(() => {
    setMiniAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  }, [anchor]);

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "month") {
      const start = startOfWeek(anchor, effectiveTimeZone, weekStart);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i, effectiveTimeZone));
    }
    if (view === "agenda") return [anchor];
    const start = startOfWeek(anchor, effectiveTimeZone, weekStart);
    const all = Array.from({ length: 7 }, (_, i) => addDays(start, i, effectiveTimeZone));
    if (!settings.showWeekends && view === "week") {
      // Hide Sat/Sun: for monday start, idx 5,6 are Sat,Sun; for sunday start, idx 0 and 6
      return all.filter((_, idx) => (weekStart === "monday" ? idx < 5 : idx !== 0 && idx !== 6));
    }
    return all;
  }, [view, anchor, effectiveTimeZone, weekStart, settings.showWeekends]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "month") {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const m = startOfWeek(monthStart, effectiveTimeZone, weekStart);
      return { rangeStart: m, rangeEnd: addDays(m, 42, effectiveTimeZone) };
    }
    if (view === "agenda") {
      return { rangeStart: anchor, rangeEnd: addDays(anchor, 30, effectiveTimeZone) };
    }
    if (view === "day") {
      const s = days[0]!;
      return { rangeStart: s, rangeEnd: addDays(s, 1, effectiveTimeZone) };
    }
    return { rangeStart: days[0]!, rangeEnd: addDays(days[days.length - 1]!, 1, effectiveTimeZone) };
  }, [view, days, anchor, effectiveTimeZone, weekStart]);

  const rangeArgs = { workspaceId, calendarIds: visibleCalendars, rangeStart, rangeEnd, q: debouncedQ || undefined };
  const { data: events = [], isLoading, isError } = useCalendarEvents(rangeArgs);
  const { create, update, moveOrResize, remove, restore } = useEventMutations(rangeArgs);
  const queryClient = useQueryClient();
  const allDayCount = events.filter((e) => e.allDay).length;
  const resetAllDay = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/events/reset-all-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, calendarIds: visibleCalendars }),
      });
      if (!res.ok) {
        const b: any = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "Failed to reset all-day events");
      }
      return (await res.json()) as { count: number; ids: string[] };
    },
    onSuccess: (data) => {
      if (!data.count) {
        setToast({ msg: "No all-day events to reset." });
        setTimeout(() => setToast(null), 2500);
        return;
      }
      setLastReset({ ids: data.ids, count: data.count });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setToast({ msg: `Reset ${data.count} all-day event(s).`, undoId: "bulk-all-day" });
      setTimeout(() => setToast(null), 5000);
    },
    onError: (e: unknown) => {
      setToast({ msg: e instanceof Error ? e.message : String(e) });
      setTimeout(() => setToast(null), 4000);
    },
  });
  const restoreBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/events/restore-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ids }),
      });
      if (!res.ok) throw new Error("Failed to restore");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setLastReset(null);
      setToast({ msg: "Restored all-day events." });
      setTimeout(() => setToast(null), 3000);
    },
  });

  function openNewEventAt(dateKey: string, minutes: number) {
    // P0 §2: invariant — never open dialog without a valid calendar
    const preferred = settings.defaultCalendarId && calendars.some((c) => c.id === settings.defaultCalendarId) ? settings.defaultCalendarId : null;
    const targetCal = preferred ?? visibleCalendars[0] ?? calendars[0]?.id;
    if (!targetCal) {
      setToast({ msg: "Create a calendar first — then add events." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const snapped = Math.round(minutes / 15) * 15;
    const dur = settings.defaultDuration || 60;
    const startAt = toInstant(dateKey, snapped, effectiveTimeZone);
    const endAt = toInstant(dateKey, snapped + dur, effectiveTimeZone);
    setDialogIsNew(true);
    setDialogDraft({
      calendarId: targetCal,
      title: "",
      description: "",
      location: "",
      startAt,
      endAt,
      timezone: effectiveTimeZone,
      allDay: false,
    });
  }

  function openExistingEvent(id: string) {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    setDialogIsNew(false);
    setDialogDraft(event);
  }

  /** Search bar "Jump to day" — go to that civil day in Day view. */
  function jumpToDay(dateKeyStr: string) {
    const [y, m, d] = dateKeyStr.split("-").map(Number);
    setAnchor(new Date(y!, m! - 1, d!));
    setView("day");
    setSidebarOpen(false);
  }

  /** Search bar event result — jump to its day and open it, even if it's outside the loaded range. */
  function jumpToEvent(event: EventRecord) {
    const [y, m, d] = dayKey(event.startAt, timeZone).split("-").map(Number);
    setAnchor(new Date(y!, m! - 1, d!));
    setView("day");
    setSidebarOpen(false);
    setDialogIsNew(false);
    setDialogDraft(event);
  }

  // Realtime (Supabase Postgres Changes): other clients' creates/edits/deletes
  // in this workspace's visible calendars refresh this view live.
  useRealtimeEvents({ workspaceId, calendarIds: calendars.map((c) => c.id) });

  function handleSave(draft: EventDraft) {
    setDialogError("");
    const opts = {
      onSuccess: () => { setDialogDraft(null); setDialogError(""); },
      onError: (e: unknown) => setDialogError(e instanceof Error ? e.message : String(e)),
    };
    if (dialogIsNew) create.mutate(draft, opts);
    else if (draft.id) update.mutate({ ...draft, id: draft.id }, opts);
  }

  function handleDelete() {
    const id = dialogDraft?.id;
    if (!id) return;
    setDialogError("");
    remove.mutate(id, {
      onSuccess: () => {
        setDialogDraft(null);
        setToast({ msg: "Event deleted.", undoId: id });
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: unknown) => setDialogError(e instanceof Error ? e.message : String(e)),
    });
  }

  function handlePrev() {
    if (view === "day") setAnchor((d) => addDays(d, -1, effectiveTimeZone));
    else if (view === "week" || view === "agenda") setAnchor((d) => addDays(d, -7, effectiveTimeZone));
    else if (view === "month") setAnchor((d) => addMonths(d, -1, effectiveTimeZone));
  }
  function handleNext() {
    if (view === "day") setAnchor((d) => addDays(d, 1, effectiveTimeZone));
    else if (view === "week" || view === "agenda") setAnchor((d) => addDays(d, 7, effectiveTimeZone));
    else if (view === "month") setAnchor((d) => addMonths(d, 1, effectiveTimeZone));
  }

  const title = titleForView(anchor, view, effectiveTimeZone, weekStart);

  const createDateKey = formatInTimeZone(anchor, effectiveTimeZone, "yyyy-MM-dd");
  const isSaving = create.isPending || update.isPending;

  // Keyboard shortcuts (prototype parity)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.closest?.("input,textarea,select")) {
        if (e.key === "Escape" && dialogDraft) { setDialogDraft(null); setDialogError(""); }
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "Enter" && dialogDraft) handleSave(dialogDraft);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "t") { e.preventDefault(); setAnchor(new Date()); }
      else if (k === "d") setView("day");
      else if (k === "w") setView("week");
      else if (k === "m") setView("month");
      else if (k === "a") setView("agenda");
      else if (k === "c") { e.preventDefault(); openNewEventAt(createDateKey, 9 * 60); }
      else if (k === "j" || e.key === "ArrowRight") handleNext();
      else if (k === "k" || e.key === "ArrowLeft") handlePrev();
      else if (e.key === "/") { e.preventDefault(); document.getElementById("global-search-input")?.focus(); }
      else if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogDraft, sidebarOpen, createDateKey, view]);

  // For mini dots: every touched civil day (prototype dot per day)
  const eventsByDate = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      const sk = dayKey(e.startAt, timeZone);
      const ek = dayKey(e.endAt, timeZone);
      s.add(sk);
      if (sk !== ek) {
        // Walk intermediate civil days (handles multi-day)
        let cur = sk;
        for (let i = 0; i < 30; i++) {
          if (cur >= ek) break;
          // increment civil day by 1 (use string arithmetic via Date)
          const d = new Date(cur + "T12:00:00");
          d.setDate(d.getDate() + 1);
          cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (cur <= ek) s.add(cur);
          else break;
        }
      }
    }
    return s;
  }, [events, timeZone]);

  const selectedRange: [string, string] = useMemo(() => {
    if (view === "week") {
      const m = mondayOf(anchor, timeZone);
      const ms = formatInTimeZone(m, timeZone, "yyyy-MM-dd");
      const es = formatInTimeZone(addDays(m, 6, timeZone), timeZone, "yyyy-MM-dd");
      return [ms, es];
    }
    // Prototype parity: day/month/agenda highlight only anchor day (month/agenda not week range)
    const k = formatInTimeZone(anchor, timeZone, "yyyy-MM-dd");
    return [k, k];
  }, [view, anchor, timeZone]);

  return (
    <div className="app">
      <header className="top">
        <button className="icon" id="menu" aria-label="Toggle sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((v) => !v)}><MenuIcon /></button>
        <div className="brand"><span className="mark" />Tempo</div>
        <button className="btn today-btn" onClick={() => setAnchor(new Date())}>Today</button>
        <button className="btn m-today" onClick={() => setAnchor(new Date())}>Today</button>
        <div className="nav">
          <button className="icon" aria-label="Previous" onClick={handlePrev}><ChevronLeftIcon /></button>
          <button className="icon" aria-label="Next" onClick={handleNext}><ChevronRightIcon /></button>
        </div>
        <h1 id="title" aria-live="polite">{title}</h1>
        <div style={{ flex: 1 }} />
        <GlobalSearch
          value={searchInput}
          onChange={setSearchInput}
          workspaceId={workspaceId}
          calendarIds={visibleCalendars}
          calendars={calendars}
          timeZone={timeZone}
          onJumpToDay={jumpToDay}
          onJumpToEvent={jumpToEvent}
        />
        <div className="seg" role="group" aria-label="View">
          {([
            ["day", DayViewIcon], ["week", WeekViewIcon], ["month", MonthViewIcon], ["agenda", AgendaViewIcon],
          ] as const).map(([v, Icon]) => (
            <button key={v} data-view={v} aria-pressed={view === v} onClick={() => setView(v as CalendarView)}>
              <Icon size={16} /> {v[0]!.toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <button className="icon" aria-label="Print" title="Print" onClick={() => setPrintOpen(true)}><PrintIcon /></button>
        <button className="icon" aria-label="Settings" title="Settings" onClick={() => setSettingsOpen(true)}><SettingsIcon /></button>
        <button className="btn primary" onClick={() => openNewEventAt(createDateKey, 9 * 60)} disabled={!calendars.length} title={!calendars.length ? "Create a calendar first" : undefined} style={{ opacity: !calendars.length ? 0.5 : 1 }}><PlusIcon size={16} /> Create</button>
      </header>

      <div className="body">
        <aside className={`side${sidebarOpen ? " open" : ""}`} id="side" aria-label="Sidebar">
          <button className="create" onClick={() => { setSidebarOpen(false); openNewEventAt(createDateKey, 9 * 60); }} disabled={!calendars.length} title={!calendars.length ? "Create a calendar first" : undefined} style={{ opacity: !calendars.length ? 0.5 : 1 }}><PlusIcon size={20} />Create</button>
          <RealtimeClock timeZone={effectiveTimeZone} />
          <MiniCalendar
            anchor={miniAnchor}
            timeZone={effectiveTimeZone}
            weekStart={weekStart}
            eventsByDate={eventsByDate}
            onSelect={(iso) => { const [y, m, d] = iso.split("-").map(Number); setAnchor(new Date(y!, m! - 1, d!)); setSidebarOpen(false); }}
            onPrev={() => setMiniAnchor((d) => addMonths(d, -1, effectiveTimeZone))}
            onNext={() => setMiniAnchor((d) => addMonths(d, 1, effectiveTimeZone))}
            selectedRange={selectedRange}
          />
          <UpNext events={events} calendars={calendars} timeZone={effectiveTimeZone} />
          <PomodoroTimer />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h2 style={{ margin: 0 }}>My calendars</h2>
            <button
              className="btn ghost"
              onClick={() => setResetConfirmOpen(true)}
              disabled={!allDayCount || resetAllDay.isPending}
              title={allDayCount ? `Reset ${allDayCount} all-day event(s)` : "No all-day events"}
              style={{ height: 28, padding: "0 8px", fontSize: 11, opacity: !allDayCount ? 0.5 : 1, gap: 4 }}
            >
              <TrashIcon size={12} /> Reset all-day
            </button>
          </div>
          {calError && <p style={{ fontSize: 12, color: "var(--now)" }}>Calendars failed to load.</p>}
          {calLoading && <p style={{ fontSize: 12, color: "var(--muted)" }}>Loading calendars…</p>}
          {!calLoading && !calError && calendars.length === 0 && <p style={{ fontSize: 12, color: "var(--muted)" }}>No calendars — create your first.</p>}
          <div id="cals">
            {calendars.map((cal) => (
              <button
                key={cal.id}
                className="calrow"
                data-cal={cal.id}
                aria-pressed={visibleCalendars.includes(cal.id)}
                style={{ ["--c" as string]: cal.color } as unknown as React.CSSProperties}
                onClick={() =>
                  setVisibleCalendars((ids) =>
                    ids.includes(cal.id) ? ids.filter((id) => id !== cal.id) : [...ids, cal.id]
                  )
                }
              >
                <span className="cb" />{cal.name}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <button className="calrow" onClick={() => setPrintOpen(true)} style={{ ["--c" as string]: "var(--muted)" } as unknown as React.CSSProperties}>
              <span className="cb" style={{ display: "grid", placeItems: "center", borderColor: "var(--muted)" }}><PrintIcon size={12} /></span> Print…
            </button>
            <button className="calrow" onClick={() => setSettingsOpen(true)} style={{ ["--c" as string]: "var(--muted)" } as unknown as React.CSSProperties}>
              <span className="cb" style={{ display: "grid", placeItems: "center", borderColor: "var(--muted)" }}><SettingsIcon size={12} /></span> Settings
            </button>
          </div>
        </aside>
        <div className={`backdrop${sidebarOpen ? " open" : ""}`} id="backdrop" onClick={() => setSidebarOpen(false)} />

        <main id="main">
          {isError && <p role="alert" style={{ padding: 16 }}>Couldn’t load events. Try again.</p>}
          {isLoading ? (
            <p style={{ padding: 16, color: "var(--muted)" }}>Loading…</p>
          ) : view === "month" ? (
            <MonthView anchor={anchor} events={events} calendars={calendars} timeZone={effectiveTimeZone} weekStart={weekStart} onSelectEvent={openExistingEvent} onCreateAt={openNewEventAt} />
          ) : view === "agenda" ? (
            <AgendaView events={events} calendars={calendars} timeZone={effectiveTimeZone} onSelectEvent={openExistingEvent} anchor={anchor} />
          ) : (
            <TimeGrid
              days={days}
              events={events}
              calendars={calendars}
              timeZone={effectiveTimeZone}
              onSelectEvent={openExistingEvent}
              onCreateAt={openNewEventAt}
              onMoveOrResize={(id, startAt, endAt) => moveOrResize.mutate({ id, startAt, endAt })}
              onSelectDay={(iso) => { const [y, m, d] = iso.split("-").map(Number); setAnchor(new Date(y!, m! - 1, d!)); setView("day"); }}
            />
          )}
        </main>
      </div>

      <nav className="tabs" id="tabs" aria-label="Views">
        {(["day", "week", "month", "agenda"] as const).map((v) => {
          const Icon = v === "day" ? DayViewIcon : v === "week" ? WeekViewIcon : v === "month" ? MonthViewIcon : AgendaViewIcon;
          return (
            <button key={v} data-view={v} aria-pressed={view === v} onClick={() => setView(v)}>
              <Icon size={16} />{v[0]!.toUpperCase() + v.slice(1)}
            </button>
          );
        })}
      </nav>
      <button className="fab" id="fab" aria-label="Create event" onClick={() => openNewEventAt(createDateKey, 9 * 60)} disabled={!calendars.length} style={{ opacity: !calendars.length ? 0.5 : 1 }}><PlusIcon size={22} /></button>

      <EventDialog
        open={dialogDraft !== null}
        draft={dialogDraft}
        calendars={calendars}
        isNew={dialogIsNew}
        onClose={() => { if (!isSaving) { setDialogDraft(null); setDialogError(""); } }}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={isSaving || remove.isPending}
        externalError={dialogError}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} calendars={calendars} />
      <PrintDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        workspaceId={workspaceId}
        calendars={calendars}
        visibleCalendars={visibleCalendars}
        timeZone={timeZone}
        anchor={anchor}
      />

      {resetConfirmOpen && (
        <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) setResetConfirmOpen(false); }}>
          <div className="dlg" role="dialog" aria-modal="true" aria-label="Reset all-day events">
            <h2 style={{ margin: "0 0 8px", font: "700 18px var(--font-display)" }}>Reset all-day events?</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.4 }}>
              {allDayCount
                ? `This will delete ${allDayCount} all-day event(s) in this workspace${visibleCalendars.length ? " (filtered calendars)" : ""}. You can undo immediately after.`
                : "There are no all-day events to reset."}
            </p>
            <div className="acts" style={{ marginTop: 16 }}>
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => setResetConfirmOpen(false)}>Cancel</button>
              <button
                className="btn danger"
                disabled={!allDayCount || resetAllDay.isPending}
                onClick={() => {
                  setResetConfirmOpen(false);
                  resetAllDay.mutate();
                }}
              >
                {resetAllDay.isPending ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" aria-live="polite" className="toast">
          <span>{toast.msg}</span>
          {toast.undoId === "bulk-all-day" && lastReset ? (
            <button
              onClick={() => {
                restoreBulk.mutate(lastReset.ids);
                setToast(null);
              }}
            >
              Undo
            </button>
          ) : toast.undoId ? (
            <button onClick={() => { restore.mutate(toast.undoId!); setToast(null); }}>Undo</button>
          ) : null}
        </div>
      )}
    </div>
  );
}
