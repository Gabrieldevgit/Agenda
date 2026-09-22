# Tempo

Production calendar built from `tempo-construction-notebook` + `tempo-agenda.html` prototype.

**Stack:** Next.js 15 + TypeScript + Supabase Auth/Postgres + Prisma (server-only) + TanStack Query + Zod.

## What's implemented

**Auth & tenancy (Notebook v3 §2.1):**
* Supabase Auth (`src/lib/supabase/{server,browser}.ts`, `middleware.ts` token refresh, `src/app/auth/callback/route.ts`)
* `/login` (email/password + Google OAuth `signInWithOAuth`)
* Server resolver `src/app/page.tsx` → `resolveDefaultWorkspace` / `ensureDefaultWorkspaceForUser` (`src/server/services/workspace-service.ts`) — never trusts client `workspaceId`; auto-creates `UserProfile` + `Workspace` + `Membership owner` + 4 calendars (`Work`/`Personal`/`Study`/`Health`) idempotently inside a transaction
* Demo mode is explicit only: `TEMPO_DEMO_MODE=true && NODE_ENV !== "production"` (`src/lib/supabase/server.ts`); otherwise missing env fails closed (`500`)

**Domain:**
* `prisma/schema.prisma` — `UserProfile`, `Workspace` (`slug` unique), `Membership` (`owner|admin|member|viewer`, `@@unique(workspace,member)`), `Calendar` (`is_default` partial unique index), `Event` (`timestamptz` + `timezone` + `allDay` + `deletedAt` soft-delete), `RecurrenceRule`, `Attendee`, `Reminder`, `AuditLog`
* `src/server/services` + `repositories` — `UI → hooks/API → route → service (authz) → repository → Prisma` boundary; every service asserts `assertWorkspaceMember` / `assertCanWriteWorkspace` / `assertCanManageCalendar(s)`

**Calendar product (prototype parity):**
* `src/features/calendar/components/CalendarShell.tsx` — Day/Week/Month/Agenda (same `useCalendarEvents` query), debounced search `q`, calendar filter with correct empty handling, keyboard shortcuts `t/d/w/m/a/c/j/k/Arrow` + `/`
* `TimeGrid` — `layoutDay` overlap, civil-day segmentation (`src/features/calendar/lib/event-segmentation.ts` `segmentEventsForDays` + `layoutSegments` — no fake `EventRecord` timezone bug), `tg-all` all-day chips (multi-day aware), `col today` + `now` line, drag column move (horizontal `startX` → target `data-day`) + vertical snap 15m, cross-midnight duration via `durationMs`, **resize disabled when `startK !== endK`**
* `MonthView` / `AgendaView` — `Mon-Sun` grid 42 cells, `chip` 3 + `more` + `dots` (mobile), `empty` state, agenda `Next 30 days` from anchor
* `MiniCalendar` + `UpNext` — `mgrid` 42 days `md today/sel/in` + dots per `eventsByDate`, tomorrow via `addDays(..., timeZone)` + `minutesOfDay(..., timeZone)`
* `EventDialog` — Calendar picks, Date/Start/End/End-date/Timezone, All-day, Location, Notes, `isSaving` keeps dialog open until success
* Mobile — `side` drawer + `backdrop`, `tabs` 4-col, `fab`, responsive `@media 760px`

**Security:**
* `supabase/migrations/0001_enable_rls.sql` — RLS enabled on 8 tables + policies for `user_profiles`, `workspaces`, `memberships`, `calendars`, `events`, `attendees`, `reminders`, `audit_logs`, `recurrence_rules` (viewer read-only, member write, `owner|admin` manage calendars); `REVOKE anon`, partial unique `calendars_one_default_per_workspace`
* `src/lib/dates/date-utils.ts` — civil `addDays(date, n, timeZone)`, `mondayOf`, `addMonths`, `toInstant` (no dead DST round-trip), `titleForView` agenda `Next 30 days`, half-open `[start,end)` in `event-repository.ts`

**Running:**
```bash
npm install
cp .env.example .env  # fill NEXT_PUBLIC_SUPABASE_URL (+PUBLISHABLE_KEY), SUPABASE_SECRET_KEY, DATABASE_URL (6543 pgbouncer), DIRECT_URL (5432)
# set TEMPO_DEMO_MODE=true for local mock without DB, otherwise leave false
npx prisma migrate dev --name init  # or npx prisma db push
npm run prisma:seed   # 19 prototype events for current monday
npm run dev
```

## Next (intentionally deferred per §31)

Recurrence `RRULE` expansion + exceptions, Reminder delivery (background queue), Attendee invite flow, Realtime `supabase Realtime` for shared calendars, external sync (`IntegrationAccount`), billing (`Plan/Subscription`).

See `tempo-construction-notebook-v3.md` for the hardening → RLS → recurrence → collaboration sequence.
