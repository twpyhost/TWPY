# Upcoming Event Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish upcoming TWPY events with clear attendance/registration details and calendar updates.

**Architecture:** Add an editorial event store separate from `torneos`; expose published event DTOs through both data sources and reuse them on home, listing, detail and calendar routes.

**Tech Stack:** Existing Next.js/React JavaScript, Supabase and Playwright.

**Spec:** [Design basis, Phase 2](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

Run after Phase 1. Apply the design basis and [common release cycle](2026-10-16-community-growth-roadmap.md). Event creation must not import a tournament or award points. Public pages are anonymous, all editorial writes require `admin`, and all instants display in `America/Asuncion`. No payment/registration engine.

Before promoting a paid-entry event, clear the commercial-hosting prerequisite in Phase 7 Task 1 even if sponsor features are still later. Local implementation/drafts do not require an early hosting move.

## Review Focus

Draft leaks, timezone/day boundaries, postponed dates, cancellation after calendar subscription, and linking an existing result without changing ranking data. Cover these in both tasks.

### Task 1: Editorial model and admin workflow

**Files**

- Create: `src/lib/events.js`, `src/app/admin/eventos/page.js`, `src/app/admin/eventos/Eventos.js`, `src/app/api/admin/eventos/route.js`, `src/app/api/admin/eventos/[id]/route.js`.
- Modify: `src/components/admin/AdminShell.js`, `src/lib/data/{index,mockDb,supabaseDb}.js`.
- Generate: additive migration for `eventos` (UUID ID, unique slug, title/description, venue/address/map URL, mode, nullable start/end/deadline, registration/stream links, integer fee_pyg, publication/event states, optional torneo_id, revision, timestamps). Tournament deletion sets its reference null.
- Test: `tests/unit/events.test.js`, `tests/integration/events.test.js`, `tests/e2e/admin/eventos.spec.js`; fixtures/cleanup and role suite.

**Interfaces**

- `getEvents({now, includePast:false}) -> Promise<EventPublic[]>`, `getEvent(slug) -> Promise<EventPublic|null>`, `getNextEvent(now) -> Promise<EventPublic|null>`.
- `validateEvent(input) -> {value, errors}`; `EventPublic` exposes only the public fields listed in the design, excluding author/internal notes. Drafts never leave public reads. Cancelled/postponed entries retain published URLs but are excluded from the next-event highlight.
- POST collection creates draft; PATCH item edits or changes publication/state; deletion of a published event is a cancellation/archival action preserving its slug/UID. Responses use 400/401/403/404 consistently.

- [ ] Add failing tests: draft inaccessible anonymously; `liga` write forbidden; non-HTTPS/javascript URLs rejected; negative/noninteger PYG fee rejected; end before start rejected; scheduled event without start rejected; postponed unknown-date event accepted; explicit torneo_id linking makes no result/snapshot writes.
- [ ] Run `npx playwright test tests/unit/events.test.js tests/integration/events.test.js --project=unit`; observe failures for the new contracts.
- [ ] Implement validation, indexed status/start lookups, FK/index, DB checks and RLS (published reads, admin writes), facade parity and admin form/list. Increment revision on public changes and invalidate `/`, `/eventos`, detail and calendar caches on publication/edit/cancellation. Use plain text for description in v1.
- [ ] Repeat tests and admin/role e2e specs. Verify editing a published event updates the public DTO without redeploying and drafts remain absent from sitemap. Follow local migration/advisor/reconstruction steps.
- [ ] Commit: `feat: manage upcoming community events`.

### Task 2: Event pages, home summary and calendar

**Files**

- Create: `src/app/eventos/page.js`, `src/app/eventos/[slug]/page.js`, `src/app/eventos/calendario/route.js`, `src/components/events/EventCard.js`, `src/components/events/NextEvent.js`, `src/lib/eventCalendar.js`.
- Modify: `src/app/page.js`, `src/components/navbar.js`, `src/app/sitemap.js`.
- Test: `tests/unit/eventCalendar.test.js`, `tests/e2e/publico/eventos.spec.js`.

**Interfaces:** `buildEventCalendar(events, {generatedAt}) -> string` emits ICS with stable `UID=eventId@twpy`, incremented SEQUENCE, DTSTAMP/LAST-MODIFIED, escaped text, CRLF/folded lines and UTC DTSTART/DTEND. Published cancellations remain in feeds for 90 days with STATUS:CANCELLED. Retain the prior calendar start/revision as necessary to retract a previously dated event that becomes postponed without a replacement date: same UID, higher sequence and cancellation in the feed, while the site continues to say postponed. Never announce a replacement date until supplied.

- [ ] Write red tests for a UTC instant falling on a different Asuncion date, equal start/deadline boundaries, free/to-confirm fee labels, cancelled update with the original UID and larger SEQUENCE, missing-date postponement and malformed slug 404. Assert calendar output contains no drafts or private data.
- [ ] Run the new calendar unit and public event specs and observe failures.
- [ ] Implement the routes, next-event summary, safe external links and calendar download/subscription. Represent cancelled/postponed states in text; do not rely on color. Use `America/Asuncion`, not a fixed offset. Ensure a cancelled event disappears from upcoming recommendations but its old detail URL explains cancellation.
- [ ] Repeat tests; inspect mobile attendance details and keyboard access. Complete the common phase checks and update docs/sitemap.
- [ ] Commit: `feat: publish event hub and calendar feed`.
