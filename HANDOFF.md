# Chess AI — Handoff

## Last Session
- **Date:** 2026-03-19
- **Mode:** Orchestrator (2 workers)
- **Duration:** 7 min

## What Was Done
- **Fixed P0 bug: AI name shows "Custom"** — Added `aiDisplayName` state in `useGameLogic.ts` set from `newSettings.aiPresetName`. GamePage now uses this instead of deriving from `personality.activePreset` (which gets cleared to null for custom AIs).
- **Fixed P0 bug: Analysis Next button scroll jitter** — Replaced `scrollIntoView({ block: 'nearest' })` with container-relative scroll calculation using `getBoundingClientRect()`, so only the move list div scrolls, not the page.

## Files Changed
- `app/src/hooks/useGameLogic.ts` — Added `aiDisplayName` state, set from `newSettings.aiPresetName`, exposed in return
- `app/src/pages/GamePage.tsx` — Uses `aiDisplayName` from useGameLogic for player bar name
- `app/src/pages/AnalysisPage.tsx` — Container-relative scroll instead of scrollIntoView

## Build
- ✅ `npm run build` passes (0 errors)
- ✅ Pushed to remote

## Next
- All P0 bugs resolved
- Project is feature-complete — ready for John's production launch review
- `docs/PRODUCTION-PLAN.md` awaiting John's review

## Blockers
- None
