"use client";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, TrashIcon } from "@/lib/icons";
import type { CalendarSummary, EventDraft } from "@/features/calendar/types";
import { dayKey, toInstant } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";

function toDateInput(iso: string, tz: string): string {
  try { return dayKey(iso, tz); } catch { return iso.slice(0, 10); }
}
function toTimeInput(iso: string, tz: string): string {
  try { return formatInTimeZone(new Date(iso), tz, "HH:mm"); } catch { return "09:00"; }
}

export function EventDialog({
  open, draft, calendars, isNew, onClose, onSave, onDelete,
}: {
  open: boolean;
  draft: EventDraft | null;
  calendars: CalendarSummary[];
  isNew: boolean;
  onClose: () => void;
  onSave: (draft: EventDraft) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<EventDraft | null>(draft);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm(draft); setError(""); }, [draft]);
  useEffect(() => { if (open) titleRef.current?.focus(); }, [open]);

  if (!open || !form) return null;

  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function setDateTime(field: "startAt" | "endAt", dateVal: string, timeVal: string) {
    // Civil date/time in event timezone -> UTC instant (Notebook v2 §25).
    const [h, m] = timeVal.split(":").map(Number);
    const minutes = (h ?? 0) * 60 + (m ?? 0);
    setForm((f) => (f ? { ...f, [field]: toInstant(dateVal, minutes, f.timezone) } : f));
  }

  function submit() {
    if (!form) return;
    if (!form.allDay && new Date(form.endAt) <= new Date(form.startAt)) {
      setError("End time must be after the start time.");
      return;
    }
    onSave({ ...form, title: form.title.trim() || "(No title)" });
  }

  const startDate = toDateInput(form.startAt, form.timezone);
  const startTime = toTimeInput(form.startAt, form.timezone);
  const endDate = toDateInput(form.endAt, form.timezone);
  const endTime = toTimeInput(form.endAt, form.timezone);

  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label="Event details">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            ref={titleRef}
            className="ttl"
            placeholder="Add title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <button className="icon" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="fld">
          <span className="k">Calendar</span>
          <div className="picks" role="radiogroup" aria-label="Calendar">
            {calendars.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pick"
                role="radio"
                aria-checked={form.calendarId === c.id}
                style={{ ["--c" as string]: c.color }}
                onClick={() => set("calendarId", c.id)}
              >
                <i />{c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="fld">
          <span className="k">Date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              const v = e.target.value;
              setDateTime("startAt", v, startTime);
              // Keep end on same civil day if it was same before.
              if (startDate === endDate) setDateTime("endAt", v, endTime);
            }}
          />
          {!form.allDay && (
            <>
              <span className="k" style={{ width: 44 }}>Start</span>
              <input type="time" value={startTime} onChange={(e) => setDateTime("startAt", startDate, e.target.value)} />
              <span className="k" style={{ width: 44 }}>End</span>
              <input type="time" value={endTime} onChange={(e) => setDateTime("endAt", endDate, e.target.value)} />
            </>
          )}
        </div>
        {!form.allDay && (
          <div className="fld">
            <span className="k">End date</span>
            <input type="date" value={endDate} onChange={(e) => setDateTime("endAt", e.target.value, endTime)} />
            <span className="k" style={{ width: 48 }}>Timezone</span>
            <input type="text" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="America/Toronto" style={{ flex: 1 }} />
          </div>
        )}
        {form.allDay && (
          <div className="fld">
            <span className="k">Timezone</span>
            <input type="text" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="America/Toronto" />
          </div>
        )}
        <div className="fld">
          <span className="k">All day</span>
          <input type="checkbox" checked={form.allDay} onChange={(e) => set("allDay", e.target.checked)} />
        </div>
        <div className="fld">
          <span className="k">Location</span>
          <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Add location" />
        </div>
        <div className="fld">
          <span className="k">Notes</span>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Add notes" />
        </div>

        {error && <p className="err" role="alert">{error}</p>}

        <div className="acts">
          {!isNew && (
            <button className="btn danger" onClick={onDelete}>
              <TrashIcon size={16} /> Delete event
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Save event</button>
        </div>
      </div>
    </div>
  );
}
