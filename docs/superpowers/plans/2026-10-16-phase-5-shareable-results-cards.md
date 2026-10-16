# Shareable Results Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate downloadable tournament podium and player-season PNGs that accurately represent public TWPY records.

**Architecture:** Project card data from the same public facade as the pages and render bounded templates with `ImageResponse` from `next/og`. Provide download/copy-link controls and optional user-initiated native sharing.

**Tech Stack:** Existing Next.js/React JavaScript, local OTF fonts/assets and Playwright. [ImageResponse reference](https://nextjs.org/docs/app/api-reference/functions/image-response).

**Spec:** [Design basis, Phase 5](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

Run after Phase 4. Apply the design basis and [release checks](2026-10-16-community-growth-roadmap.md). Use public records only; no automatic messages/posts, no live EWGF fetch and no new paid image service. Preserve tied placements and missing-data meaning. Stable output routes must survive Phase 7 hosting migration.

## Review Focus

Tied/sparse podiums, long Unicode names, unranked players, source changes versus stale cards, and remote URL/image abuse. Tasks 1–2 cover these plus host/font rendering.

### Task 1: Shared projections and PNG endpoints

**Files**

- Create: `src/lib/shareCards.js`, `src/components/share/TournamentCard.js`, `src/components/share/PlayerSeasonCard.js`, `src/app/api/cards/torneos/[id]/route.js`, `src/app/api/cards/jugadores/[id]/route.js`.
- Reuse: Phase 1 profile and Phase 3 history data, existing public tournament results, verified bundled logo and `public/fonts/WarsawGothicExtObl.otf` (confirm licensing and renderer support before use).
- Create optimized/subset card-only assets under `public/images/share/` and `public/fonts/share/` if the original assets do not fit the renderer budget; do not import full-size marketing art by default.
- Test: `tests/unit/shareCards.test.js`, `tests/e2e/publico/shareCards.spec.js`.

**Interfaces**

- `buildTournamentCardData({tournament,results}) -> {title,date,season,podium,participantCount,sourceVersion}`. Podium contains every actual placement <=3, preserving ties; a 1/2/3 template must adapt to sparse/tied records rather than changing placements.
- `buildPlayerSeasonCardData(profile, history) -> {playerId,name,season,position,points,titles,podiums,tournamentCount,sourceVersion}`. Unranked position is null.
- `getCardDimensions(format)` accepts only `landscape` (1200×630) or `portrait` (1080×1350).
- GET routes accept only valid IDs, an existing season for player cards, the bounded format and an optional source-version hint. Return `image/png`, safe filename/Content-Disposition, 404 for unknown resource/season and 400 for unsupported format. No arbitrary text, HTML, remote URL or sponsor query parameters.

- [ ] Add red projection tests for one/two competitors, tied third places, zero results, Unicode/long names, absent season snapshot and correct season labels. Route tests assert PNG signature, exact dimensions, status/content headers and bounded request parameters; inject a remote-avatar URL and assert it is never fetched.
- [ ] Run `npx playwright test tests/unit/shareCards.test.js --project=unit` and the new public spec; observe the expected failures.
- [ ] Implement templates using supported flexbox/layout primitives and bundled assets, with a text/logo fallback if a font cannot render the required glyph. Keep JSX/CSS/fonts/images within ImageResponse's documented 500KB bundle limit; target <=400KB for initial templates to reserve room for sponsor attribution. Generate only from known public IDs. Use shared public cache/version metadata and invalidate on import/reimport, identity/profile edits, snapshot recalculation and later sponsor changes. Do not accept a caller's arbitrary version as authoritative data or as a way to generate unbounded cache keys.
- [ ] Repeat tests and export all four template/format combinations with sparse/tied/long-name fixtures. Visually inspect every export for clipping, overlapping text, correct accents/numbers and safe margins. Confirm `next/og` runs in the current Node build; Phase 7 repeats this against Netlify. Complete common phase checks.
- [ ] Commit: `feat: render accurate public results cards`.

### Task 2: Download and share controls

**Files:** Create `src/components/share/ShareResults.js`. Modify `src/app/torneo-resultado/[slug]/page.js`, `src/app/competidores/[id]/page.js` and relevant generated metadata; extend `tests/e2e/publico/shareCards.spec.js`.

**Interfaces:** `ShareResults({resourceType,resourceId,year,sourceVersion})` builds only the supported same-origin image/page URLs. `resourceType` is `torneo` or `jugador`; no caller-supplied rendering URL. Native file sharing requires a user click and capability detection; unsupported browsers keep working download/copy-link actions.

- [ ] Write failing browser cases for PNG download filename, copied canonical page link, absent native-share support, rejected/cancelled native share and image-generation failure. Verify a cancelled share never reports success or posts a message.
- [ ] Run the public card spec and confirm the new controls fail before implementation.
- [ ] Implement accessible format selection/download/copy controls. Use a clear progress/error label and permit retry; avoid blocking the public result/profile itself when card rendering is unavailable. User review of the template precedes publication of its final design.
- [ ] Repeat tests and manually inspect mobile/browser share behavior; record actual supported fallback behavior in QA documentation.
- [ ] Commit: `feat: download and share public results cards`.
