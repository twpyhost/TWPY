# Completed-phase improvements — 2026-10-18

The user requested pushing the completed branch, opening a PR and continuing development, then selected improvements to completed phases. Branch `feat/next-phases` was pushed and [PR #14](https://github.com/twpyhost/TWPY/pull/14) opened against `main`. Its initial Vercel checks passed. Phases 2 and 7 remain on standby; this follow-up does not resume either.

## Archive editor

Text saves previously serialized the whole editor record, including gallery metadata and signed photo URLs. A valid large gallery could push an ordinary text change over the API's 100,000-byte request limit. The editor now sends only the eight editable entry fields. Photo operations and the request-size limit retain their existing contracts.

The regression uses 150 synthetic metadata records, no additional files, and checks that a text change persists through the real local API. It first failed with the generic save error; after the fix both the large-gallery case and the existing draft/photo/credit/publish/retract flow passed (5/5 including setup/cleanup). The initially stopped Docker environment was restarted before reproducing the application failure; environment setup failures are not counted as the regression evidence.

## Ranking reader verification

The old backlog item about a missing same-day ID tiebreak was checked against the source and `git blame`: both legacy readers already include it from `d5f302a`. The stale backlog entry was corrected. The separate regression for adjacent tournament bigint IDs reproduced both legacy reads rejecting their snapshot queries; the ranking query had rounded the ID to `9223372036854776000`, outside PostgreSQL's bigint range.

Both latest-tournament queries now select `id::text` before querying snapshots, preserving exact current and previous cut IDs. The regression compares latest-ranking rows/points and count with the historical reader for the same cut, using different snapshot membership on two same-day tournaments. Ranking/history/count checks passed 5/5 after the fix. Public facade shapes and ranking calculations are unchanged. This does not claim to fix every legacy public link or player-ID producer listed in the backlog.

Final verification: **266/266 tests pass** (3.6m) against local Supabase; lint and production build pass. The archive fix was committed as 10c30cc; the ranking correction and regression evidence are included in this PR follow-up. No production database/configuration change or merge is part of this pass.
