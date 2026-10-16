# Community Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve curated tournament/event recaps, credited photos and VOD links with stable public URLs and recoverable media.

**Architecture:** Add editorial archive entries linked optionally to Phase 2 events and existing tournaments. Use a private Supabase media bucket with publication-aware reads; extend existing backups to include object bytes and a checksum manifest.

**Tech Stack:** Existing Next.js/React JavaScript, Supabase DB/Storage, GitHub Actions and Playwright.

**Spec:** [Design basis, Phase 6](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

Run after Phase 5. Apply the design basis and [phase checks](2026-10-16-community-growth-roadmap.md). Admin publishing only, no public uploads/comments or hosted video. Do not delete archive entries when their linked tournament/event is removed. Draft content/media must stay private. Existing database backups and keep-alive remain operational.

## Review Focus

Draft media exposure, malicious/oversized files, broken historical links, asset-budget exhaustion and a DB-only restore that omits photos. Cover these in Tasks 1–2.

### Task 1: Archive records, media and recoverability

**Files**

- Create: `src/lib/archive.js`, `src/lib/archiveMedia.js`, `src/app/api/admin/archivo/route.js`, `src/app/api/admin/archivo/[id]/route.js`, `src/app/api/admin/archivo/[id]/media/route.js`, `scripts/backup-archive-media.js`, `.github/workflows/backup-archive-media.yml`.
- Modify: `src/lib/data/{index,mockDb,supabaseDb}.js`, fixture setup/cleanup; retain the existing DB backup workflow's behavior.
- Generate: additive migration for `archive_entries` (UUID, slug/title/plain-text recap, season/date, draft/published, nullable event/tournament FK with SET NULL, timestamps), `archive_assets` (entry FK, generated path, MIME, bytes, caption/credit, order), Storage bucket/policies and indexes.
- Test: `tests/unit/archive.test.js`, `tests/integration/archive.test.js`, `tests/integration/archiveStorage.test.js`.

**Interfaces**

- `getArchiveEntries({season?,eventId?,tournamentId?}) -> Promise<ArchiveSummary[]>`; `getArchiveEntry(slug) -> Promise<ArchiveEntryPublic|null>` exposes published data only.
- `validateArchiveAsset({bytes,mime,size}) -> {valid,reason}` checks signature/decoder content, not filename alone. Maximum is 2 MiB per file; JPEG/PNG/WebP only. Initial aggregate media budget is 100 MiB; reject overflow before accepting an upload, accounting for concurrent reservations/orphan cleanup.
- `getPublishedArchiveMedia(entryId,assetId) -> Promise<{url,expiresAt}|null>` signs a read only after verifying publication and asset membership. TTL is 900 seconds; cache pages/URLs less than the remaining TTL. Retraction prevents issuing new URLs immediately; already issued signed URLs remain valid for at most that TTL, a limitation to document in the editor.
- Backup script writes object bytes plus `{path,size,sha256,entryId}` manifest and a paired metadata/DB snapshot identified by backup run ID. Workflow runs weekly and on demand, with 14-day artifact retention; verify total account artifact budget before enabling it. Use immutable object paths and defer physical deletion while a backup is collecting its referenced objects. Keep the established DB dump/retention; older DB-only snapshots cannot promise restoration of media beyond the media window. Restore tests use the paired snapshot and manifest, not whichever independent DB artifact happens to be newest.

- [ ] Write red tests for anonymous draft entry/object access, `liga` upload denial, extension/MIME spoof, SVG/HTML, 2 MiB boundary, aggregate-budget race, dangling reference and deleted parent SET NULL. Test signed-URL expiry/retraction behavior and a missing/corrupt object detected by the checksum manifest.
- [ ] Run `npx playwright test tests/unit/archive.test.js tests/integration/archive.test.js tests/integration/archiveStorage.test.js --project=unit` and confirm the new contracts fail.
- [ ] Implement the records, least-privilege RLS/Storage policies, safe generated paths, upload/finalize/cleanup workflow and explicit media budget. Only published-entry assets may receive anonymous read access/signatures. Never expose credentials or use a public bucket for drafts. Backups must recover media outside the primary Storage project, not merely copy metadata into that same project.
- [ ] Repeat tests and follow local schema/advisor/reconstruction steps. Restore a temporary local DB plus the media archive, verify all published assets against checksums and confirm captions/entry associations survive. Do not reset the development DB or treat a successful upload as proof of a backup.
- [ ] Commit: `feat: store and back up community archive content`.

### Task 2: Editorial and public archive pages

**Files**

- Create: `src/app/admin/archivo/page.js`, `src/app/admin/archivo/Archivo.js`, `src/app/archivo/page.js`, `src/app/archivo/[slug]/page.js`, `src/components/archive/ArchiveGallery.js`.
- Modify: `src/components/admin/AdminShell.js`, `src/components/navbar.js`, `src/app/sitemap.js`, `src/app/eventos/[slug]/page.js`, `src/app/torneo-resultado/[slug]/page.js` to link relevant recaps.
- Test: `tests/e2e/admin/archivo.spec.js`, `tests/e2e/publico/archivo.spec.js`, role suite and fixtures.

**Interfaces:** Editor uses draft/save/publish/retract with caption, credit, media ordering and ordinary HTTPS VOD links. Public listing filters by season; detail resolves stable slug and optional event/result links. Published slug is immutable in v1 to keep shared URLs stable. Only allowlisted video providers can be embedded; otherwise use safe links, never raw iframe HTML.

- [ ] Write red browser cases for draft save/reload and exclusion from public listing/sitemap, publish/retract, media credit/alt text, season filtering, linked result removed, failed media load and escaped plain-text content. Assert a previously cached page stops exposing the entry on retraction within the documented cache window and no fresh media URL is issued.
- [ ] Run the new public/admin specs under their proper projects and confirm new assertions fail.
- [ ] Implement the editorial workflow and responsive gallery. Invalidate entry/list/event/result/sitemap data on edits, publication and retraction; align cached-page TTL with signed media TTL. Include captions/credits and a clear fallback for unavailable third-party videos. No autoplay requirement or public contributions in v1.
- [ ] Repeat targeted specs, inspect a real gallery on mobile/desktop, complete common phase checks and document restore instructions plus current asset/artifact usage.
- [ ] Commit: `feat: publish the community archive`.
