# Tempo

Production scaffold built from `tempo-construction-notebook.md`, on top of the
original single-file prototype (kept in this chat's earlier turn as
`tempo-agenda.html` — the UX baseline this repo ports from).

## What's actually implemented here

This is **Phase 1 (refactor without changing UX) plus the Phase 3/4 groundwork**
from the notebook's migration plan (§28) — not a finished, deployed SaaS app.
Concretely:

- `prisma/schema.prisma` — the full §7 model (UserProfile, Workspace,
  Membership, Calendar, Event, RecurrenceRule, Attendee, Reminder, AuditLog),
  with `startAt`/`endAt` as `timestamptz` and soft-delete on `Event` so Undo
  restores a row instead of re-creating it.
- `src/server/services` + `src/server/repositories` — the
  `UI -> service -> repository -> Prisma` boundary from §6/§9. Every service
  call asserts workspace membership before touching data; the repository
  itself never makes an authorization decision.
- `src/app/api/events` — REST-ish route handlers matching §12, backed by a
  Supabase-session-aware server client (`src/lib/supabase/server.ts`).
- `src/features/calendar` and `src/features/events` — the component/hook
  split from §9, with the prototype's interactions ported over:
  - `layoutDay()` (`features/calendar/lib/layout-events.ts`) is the old
    `layout()` function, now pure and unit-tested (`tests/unit`).
  - `useEventDrag` reimplements drag-to-move/resize on Pointer Events with
    15-minute snapping (§2). A keyboard alternative for the same action is
    flagged as a follow-up in that file's comment, not yet built.
  - `useCalendarEvents` / `useEventMutations` replace `localStorage` with
    TanStack Query against `/api/events`, including optimistic move/resize
    and delete with rollback on failure.
  - `EventDialog` is the old modal, now a controlled form with the same
    validation message ("End time must be after the start time").
- `src/lib/icons` — every glyph in the UI (menu, chevrons, plus, search, the
  four view icons, pin, trash, close) is a plain inline SVG component. The
  browser-tab icon is an SVG data URI (`FAVICON_SVG_DATA_URI`), not an emoji.

## What's intentionally not done yet

Per the notebook's own §31 ("things not to build yet") and §28 phase order,
this scaffold stops short of:

- Auth screens (sign up/in/out) and session bootstrapping — `src/lib/supabase`
  has both client factories, but no `/login` route yet.
- Row Level Security policies (`supabase/migrations`, `supabase/tests` are
  empty placeholders) — service-layer membership checks exist, but the DB
  itself doesn't yet enforce them for direct client access.
- Month and Agenda view components (`TimeGrid` for Day/Week is ported;
  `MonthView`/`AgendaView` are listed in the target structure but not written).
- Recurrence, attendees, reminders, sharing — modeled in Prisma, no service
  logic yet.
- Calendars as real database rows — `CalendarShell` still uses a hardcoded
  `DEMO_CALENDARS` array as a placeholder for the future `/api/calendars`
  fetch, per notebook §3.3.

## Running it

This needs a Supabase project and real env vars (`.env.example`) before
`npm run dev` will do anything useful — it isn't runnable in this sandbox.

```bash
npm install
cp .env.example .env        # fill in Supabase + DATABASE_URL/DIRECT_URL
npm run prisma:migrate
npm run dev
```

## Next steps, in the notebook's order

1. Wire `src/lib/supabase` into real sign-in/sign-up routes (§28 Phase 2).
2. Write the Supabase migrations + RLS policies for `events`, `calendars`,
   `memberships` (§28 Phase 4) and the allowed/denied tests it calls for (§27).
3. Build `MonthView` and `AgendaView` alongside `TimeGrid`, both reading from
   the same `useCalendarEvents` hook (§1: "one event query/domain model").
4. Replace `DEMO_CALENDARS` with `/api/calendars`, backed by the `Calendar`
   model that already exists in Prisma.
