# Chess AI — Progress Log

**Status:** V1_DEPLOYED — BUG FIXES + IMPROVEMENTS
**Current Phase:** Fix engine bugs, implement unused eval weights, UI polish
**Live URL:** https://nice-desert-0df9bdf1e.4.azurestaticapps.net

## Priority Tasks

### Feature Requests (John)
- [x] **Blindfold Mode (Phase 1 — Visual)** — Eye/EyeOff toggle on mobile action row + desktop sidebar. Board pieces become invisible (custom piece renderers), squares darken to near-black with faint grid. Move announcement log shows last 6 half-moves in algebraic notation. Player can still make moves via click/drag or text input. Toggles on/off (peek mode). Resets on new game. Works in human-vs-AI mode. Phase 2 (TTS + voice input) remains for future. (Apr 28)

### QA Findings — 2026-05-11

- [x] **BUG: Game state lost on navigation** ✅ FIXED 2026-05-12 — Game state now persisted to sessionStorage (PGN, moveHistory, mode, playerColor, AI settings). Navigating away and back restores the in-progress game. Cleared on game end or new game. Browser QA verified: played e4, AI responded d5, navigated to History, came back — game fully restored with opening name, move count, and turn state intact.
- [x] **BUG: Settings "Your Stats" shows 0 games** ✅ FIXED 2026-05-12 — Stats now derived from game history (getGames()) instead of separate localStorage counter. Eliminated sync discrepancy. Removed redundant "Reset Stats" button. Browser QA verified on local build.

### QA Findings — 2026-05-07
- [ ] **UX: Date format inconsistency on History page** — Recent games show "X days ago" (relative) but older games (30+ days) show DD/MM/YYYY European format (e.g., "06/04/2026"). US users would read this as June 4th, not April 6th. Should use MM/DD/YYYY or consistent relative dates.

### QA Findings — 2026-05-04
- [x] **BUG: Settings "Your Stats" shows 0 games despite History showing 18** ✅ FIXED 2026-05-12 — See QA Findings 2026-05-11 entry.

### QA Findings — 2026-05-02
- [x] **BUG: Game state lost on navigation** ✅ FIXED 2026-05-12 — See QA Findings 2026-05-11 entry.
- [x] **BUG: `__editor_temp__` visible in AI Personality Editor** ⚠️ QA REOPEN 2026-05-02, confirmed still broken 2026-05-04 — A debug entry named `__editor_temp__` appears in the "Saved" section of the personality editor. Previously fixed for Arena leaderboard (Apr 4) but the filter doesn't apply to the editor's saved list. ✅ QA VERIFIED FIXED 2026-05-10
- [x] **UX: Analysis result text contradiction** — After importing a PGN with result "1-0", the analysis footer shows "0-1 White wins" — the result code and text description conflict with each other. ⚠️ QA STILL BROKEN 2026-05-13 ✅ QA VERIFIED FIXED 2026-05-14 ⚠️ QA REGRESSION 2026-05-15 (imported PGNs lacked playerColor) ✅ RE-FIXED 2026-05-15
- [ ] **UX: Invalid move gives no feedback** — Typing an invalid algebraic move (e.g., "Qx99") and clicking Submit does nothing. No error toast, no visual indicator. User has no idea why their move wasn't accepted. ⚠️ QA STILL BROKEN 2026-05-14 ⚠️ QA STILL BROKEN 2026-05-15 ⚠️ QA STILL BROKEN 2026-05-16

### QA Findings — 2026-04-21
- [ ] **UX: Web Worker accumulation during navigation** — After navigating through multiple pages/game modes, 8 aiWorker instances and 6 stockfish worker instances accumulate. They clean up on tab close but could cause memory pressure during long sessions, especially on mobile. Consider terminating unused workers when navigating away from the play page.
- [ ] **UX: "Report Issue" link points to "#"** — In Settings → About section, the "Report Issue" link href is just `"#"` — should point to the GitHub issues page. ⚠️ QA STILL BROKEN 2026-05-14 ⚠️ QA STILL BROKEN 2026-05-15 ⚠️ QA STILL BROKEN 2026-05-16
- [x] **UX: Stats discrepancy between Settings and History** ✅ FIXED 2026-05-12 — Stats now derived from game history. See QA Findings 2026-05-11.
- [ ] **UX: No difficulty selector on custom AI** — When starting "Play vs AI" (non-Stockfish), there's no upfront difficulty/depth selection — user must know to go to Editor or Settings to adjust. A pre-game difficulty picker would improve first-time experience.

### QA Findings — 2026-04-20
- [ ] **UX: Board squares lack accessible labels** — Chessboard square buttons only show positional refs (e.g. `e2`) without piece information. Screen readers can't convey what piece is on each square. Previous a11y pass covered icon buttons but missed board squares.

### QA Findings — 2026-04-19
- [x] **BUG: Game History stats show 0-0-0 W-L-D despite having wins** — Root cause: stats useMemo only counted `human-vs-ai` games, not `human-vs-human` (Local 2P). Fix: changed to include both modes in W/L/D calculation, matching filter button logic. (Apr 19)

### QA Findings — 2026-04-15
- [ ] **PERF: Play vs AI crashes tab on low-memory devices** — The play page crashes headless Chromium on Pi repeatedly (3 attempts). WASM/Stockfish + 7+ web workers too memory-intensive. May only affect constrained environments, but worth investigating worker count limits.
- [ ] **UX: Service worker aggressively respawns pages and spawns 7+ workers** — Chess AI SW detected respawning even when not actively testing. Causes memory leaks on shared browser environments. Consider more conservative SW lifecycle.

### QA Findings — 2026-04-03
- [x] **BUG: "Play vs AI" card on Home page navigates to Settings instead of Play** — Could not reproduce (Apr 3). Code shows correct href `/play?mode=human-vs-ai`, browser test confirmed correct navigation. Likely was a transient/caching issue.

### QA Findings — 2026-03-31
- [x] **UX: Light/System theme buttons disabled in Settings** — ROOT CAUSE: Service worker (sw.js) used cache-first strategy with static cache name `chess-ai-v1`, serving stale JS forever. Code fix from Apr 3 was correct but never reached users. Fix: Rewrote sw.js with network-first for HTML/navigation, cache-first only for hashed assets (immutable filenames). Bumped cache to v2 to purge stale entries. Added 30-min update check interval. (Apr 4)
- [x] **UX: `__editor_temp__` bot visible in Arena leaderboard** — Same root cause as theme buttons: stale service worker cache. The `getBots()` filter was deployed correctly but the old cached JS didn't have it. Fixed by service worker rewrite. (Apr 4) ⚠️ QA REOPEN 2026-05-02: Still visible in AI Personality Editor "Saved" section — filter only applied to Arena, not editor. ✅ QA VERIFIED FIXED 2026-05-10 (both Arena and Editor now filtered)

### P0 — Bugs (John's Testing — Mar 19)
- [x] **BUG: AI name shows "Custom" instead of personality name FIXED** — Root cause: `personality.setConfig()` cleared `activePreset` to null, and GamePage derived AI name from `activePreset`. Fix: Added `aiDisplayName` state in `useGameLogic` set from `newSettings.aiPresetName`, used in GamePage's `getPlayerBar()`. (Mar 19)
- [x] **BUG: Analyze game — Next button scrolls page down FIXED** — Root cause: `scrollIntoView({ block: 'nearest' })` could scroll the page viewport. Fix: Replaced with container-relative scroll calculation using `getBoundingClientRect()` to only scroll the move list div. (Mar 19)

### P0 — Critical Bugs (John's Testing — Mar 13)
- [x] **BUG: History tab crashes on client-side navigation FIXED** — Root cause: ErrorBoundary was outside BrowserRouter, couldn't reset on route changes. Fix: Route-aware ErrorBoundary with resetKey prop + defensive getGames() try/catch. (Mar 15)
- [x] **BUG: Tab bar changes after reload FIXED** — Root cause: 7 navLinks overflowed mobile bottom nav. Fix: Separate mobileNavLinks array with 5 core tabs (Home, Create, Play, History, Settings). Desktop nav unchanged. (Mar 15)

### P0 — Critical Bugs (Resolved)
- [x] **Mate-in-1 detection FIXED** — Added bulletproof mate-in-1 pre-check in findBestMove() that scans all legal moves before search. Also added hasMateIn1() guard in aiWorker to skip opening book when mate exists. Verified with scholar's mate, fool's mate, back-rank mate, smothered mate positions. (Mar 9)
- [x] **Click-to-move broken on diagonal moves FIXED** — Root cause: react-chessboard v5 fires both onPieceClick and onSquareClick; on diagonal moves sub-pixel drift triggered dnd-kit drag sensor suppressing Piece onClick. Fix: consolidated all click logic in onSquareClick, checks legal moves first before piece selection. Added isDraggingRef to suppress post-drag clicks. (Mar 9)
- [x] **Pre-moves not working FIXED** — Root cause: chess.js's game.moves({square}) only returns legal moves for side-to-move; during AI's turn it returned empty array making pre-move queuing unreachable. Fix: bypass legality check when it's AI's turn, queue pre-move immediately, validate at execution time. (Mar 9)

### P1 — Core Features (before production)
- [x] **Position Analyzer / Game Review engine selection** — AI personality picker dropdown in AnalysisPage. Lists all presets + saved personalities. Disabled when Stockfish active. Changes trigger re-evaluation. (Mar 9)
- [x] **PGN import** — Import PGN modal on HistoryPage. Paste PGN, saves as game record, opens in analysis. (Completed T13, Mar 8)
- [x] **Position setup** — New `/setup` page: piece palette, place/remove pieces, clear/starting position, FEN paste/copy, side-to-move, play or analyze from position. GamePage accepts `?fen=` param. (Mar 9)
- [x] **Pre-moves** — Queue a move while AI is thinking. Cyan highlight on pre-move squares, auto-executes if legal after AI moves, Escape to cancel. Human-vs-AI mode only. (Mar 9)
- [x] **Consistent AI options across modes** — Added Stockfish as selectable AI for both White and Black in AI-vs-AI mode, with per-side skill/depth settings. Two separate useStockfish() instances for simultaneous Stockfish play. (Mar 9)
- [x] **Remove redundant "AI Personalities" section** — Removed the extra PersonalitySelector section below play area that didn't match selected AI. (Mar 9)

### P1.5 — UX Issues (before production)
- [x] **Play page: no-scroll fullscreen layout** — Fullscreen viewport layout using 100dvh, flexbox column with board flex-1, compact Layout chrome on play page, move history hidden on mobile (collapsible overlay), desktop sidebar. (Mar 9)
- [x] **Eval bar: progressive/streaming evaluation** — Added onProgress callback to findBestMove() that emits intermediate results after each iterative deepening level. Worker posts 'progress' messages with eval/depth/bestMove/nodes. useChessAI handles progress to update eval incrementally. Thinking indicator shows "Thinking d3/5" format. (Mar 10)
- [x] **Analysis engine selector UX FIXED** — Engine list now works like radio buttons; clicking any engine (including Stockfish) selects it directly. No lock-out behavior. (Mar 9)
- [x] **Opening book toggle: per-AI setting DONE** — Added `openingBookEnabled` to EvaluationConfig, toggle in AIEditorPanel, useChessAI checks per-personality setting first then falls back to global. Fully backward compatible. (Mar 9)
- [x] **Position setup page discoverability FIXED** — Added "Setup Position" button on GamePage (desktop sidebar + mobile action row). HomePage already had quick action. (Mar 9)

### P1 — John's Feedback (Mar 10)
- [x] **AI avatar picker UX** — Replaced messy emoji grid with a clean native `<select>` dropdown. Shows selected avatar in trigger, "No Avatar" option, consistent dark theme styling. (Mar 10)
- [x] **Best move: progressive/streaming calculation** — AnalysisPage now updates best move arrow + "Best: Nf3" text at each iterative deepening depth during search. Arrow appears near-instantly at depth 1 and refines as deeper searches complete. Same progressive pattern as eval bar. (Mar 10)
- [x] **Mobility analysis rethink** — New `computeMobility()` in evaluate.ts: excludes pawn moves (structural, not mobility), weights quiet moves (1.0) higher than captures (0.4, since captures are already rewarded by material eval), adds centrality bonus for central destination squares. Fast path preserved for quiescence search. (Mar 10)
- [x] **Pre-move behavior: match Lichess** — New `pseudoLegalMoves.ts` utility generates all theoretically reachable squares per piece type (ignoring board state). Pre-moves now use pseudo-legal validation when queuing (any square the piece type could reach), with legality checked only at execution time. Click-to-premove captures, castling pre-moves, and pawn pre-moves all work. Silently discards illegal pre-moves on execution. (Mar 10)

### P2 — Important Features
- [x] **Share game link with position** — "Copy analysis link" now encodes the full PGN as base64 in URL params (`/analysis/shared?pgn=<base64>&w=<white>&b=<black>`). Recipients can view the full game without needing localStorage. Existing localStorage-based analysis URLs still work. (Apr 6)
- [x] **Bot icons/avatars** — Added emoji avatar picker (16 options) in AIEditorPanel. Avatars stored in localStorage, shown in gameplay player bars, history cards, and NewGameModal personality selector. Backward compatible. (Mar 10)
- [x] **Opening book toggle** — Added openingBookEnabled setting in Settings page. Passes through to aiWorker. Default: enabled. Backward compatible. (Mar 9)
- [x] **Piece value slider range → 0-1000** — All piece value sliders now max at 1000. (Mar 9)
- [x] **Export bots to Lichess** — Full Lichess Bot MVP at `bot/`. Research doc at `docs/RESEARCH-bot-export.md`. Bot connects to Lichess streaming API, plays with custom personality presets, supports opening book, multiple concurrent games. Chess.com has no public bot API (dead end). Needs: Lichess BOT account + token to go live. (Mar 12)

### P0 — John's Priority
- [x] **Online multiplayer — Phase 1 (room-based play)** — Play against other people online. Architecture research complete (`docs/RESEARCH-online-multiplayer.md`) — recommends PartyKit. **Phase 1 built:** Server (`server/` — game-server, types, validation) + Client (`OnlinePlayPage`, `useMultiplayer` hook, shared types, `/online` route, nav + HomePage card). **PartyKit deployed:** `chess-ai-multiplayer.JohnWattenbarger.partykit.dev`. **Fixed Mar 18:** PartyKit config was missing `parties.game` mapping — added to `partykit.json` and redeployed. **E2E tested:** 2-tab test confirmed: room creation, joining via code, WebSocket connection, player assignment (White/Black), board orientation, turn indicators, game controls (Offer Draw, Resign, Leave) all working. Piece interaction is correct (active player's pieces clickable, opponent's disabled). (Mar 18)
- [x] **Production readiness plan** — Comprehensive plan at `docs/PRODUCTION-PLAN.md` covering hosting, domain, performance, SEO, marketing, legal, and step-by-step launch checklist. Cost estimates at multiple traffic tiers. (Mar 19)
- [x] **Bot vs Bot matchmaking + Elo system** — New `/arena` page (BotArenaPage.tsx) with round-robin tournaments, quick matches, Elo rating system (K=32 new, K=16 established), live game viewer, fast simulation mode. Ratings persist in localStorage. Leaderboard sorted by Elo. Trophy nav icon. (Mar 12)
- [x] **Stockfish in AI-vs-AI mode** — Completed as part of "Consistent AI options" above. (Mar 9)

### P3 — AI Discovered
- [x] Lichess bot: Add retry/reconnect logic with exponential backoff when event stream drops (Mar 12)
- [x] Lichess bot: Add rate limit (429) detection and backoff in API calls (Mar 12)
- [x] Lichess bot: Handle `res.text()` secondary errors in error paths (catch and mask) (Mar 12)
- [x] Lichess bot: Fix `handleGameState` to use actual `initialFen` from `gameFull` instead of hardcoding `'startpos'` (Mar 12)
- [x] GamePage.tsx component extraction — Extracted 4 modules: useGameLogic (491 lines), useKeyboardShortcuts (50 lines), useBoardConfig (131 lines), GameSidebar (182 lines). GamePage.tsx: 1009 → 453 lines. (Mar 13)
- [x] Openings database compression — Deflate-compressed trie into base64, decoded at runtime via DecompressionStream. Pruned lines deeper than 20 moves. Openings chunk: 232KB → 62KB (73% reduction). (Mar 13)

### QA Findings — 2026-03-30
- [x] **Light and System app themes disabled** — Fixed by service worker rewrite (Apr 4). See QA Findings 2026-03-31.

### Design Principles
- **Mobile-first** — All UI must work on touch/mobile as the primary input. Keyboard shortcuts are OK as extras but NEVER the only way to do something. Every action needs a visible, tappable control.
- Current violations: GamePage keyboard shortcuts (F=flip, N=new game, U=undo) and AnalysisPage arrow key navigation need touch equivalents if not already present.

### Process
- [x] Auto-rebuild after work sessions — Created `scripts/rebuild.sh` that runs `npm run build` + `systemctl --user restart chess-ai`. Workers should call this at session end. (Mar 12)

---

## 2026-03-07: Analysis Page + Best Move Arrows (12:00)

### Session Summary
**Time budget:** 30 min
**Mode:** Orchestrator with workers

### Completed

#### 1. Game Replay / Analysis Page ✅
- **New `AnalysisPage.tsx`** — Full Lichess-style game review page
- Board with last-move highlighting (yellow/green)
- Clickable move list in paired rows (1. e4 e5 format)
- Current move highlighted with blue pill
- Keyboard navigation: Arrow keys, Home/End
- Transport controls: |<, <, >, >|
- Eval bar alongside board (reuses EvalBar component)
- PGN export (copy to clipboard with feedback)
- "Game not found" fallback for invalid IDs
- Responsive: board left + panel right on desktop, stacked on mobile
- Route: `/analysis/:gameId`

#### 2. Best Move Arrow Overlay ✅
- Engine computes best move for each position (full search, not just static eval)
- Green arrow drawn on board showing engine's recommended move
- Arrow clears and recomputes when navigating to different positions
- Best move shown in text below eval (e.g., "Best: Nf3")
- Search info displayed (node count + time)

#### 3. History Page → Analysis Link ✅
- Game cards in History are now clickable
- Click navigates to `/analysis/:gameId`
- Hover effect added to cards

#### 4. Auto-Play ✅
- Play/Pause button in transport controls (blue accent)
- Auto-advances moves every 1.5s
- Stops at last move; manual nav stops auto-play

#### 5. Flip Board ✅
- Flip button in header (RotateCw icon)
- Toggles board orientation; eval bar flips correctly

#### 6. Play Again Button ✅
- "Play Again" button at bottom of analysis panel
- Navigates to /play with same mode/personality settings

### Build
- ✅ `npm run build` passes cleanly (0 errors)
- ✅ All routes verified
- ✅ Commit: 366188a

### Files Changed
- `src/pages/AnalysisPage.tsx` — NEW: Full analysis/replay page (380+ lines)
- `src/App.tsx` — Added /analysis/:gameId route
- `src/pages/HistoryPage.tsx` — Made game cards clickable with navigation

---

## 2026-03-07: Hide Library + History AI Name/Filter (03:00)

### Session Summary
**Time budget:** 30 min
**Elapsed:** ~10 min
**Mode:** Direct (worker self-executed changes)

### Completed

#### 1. Hide Library Page from Navigation ✅
- Removed Library from Layout nav (desktop top nav + mobile bottom tabs)
- Removed "My Library" quick action card from HomePage
- Route still exists at `/library` for direct access — just hidden from nav
- Cleaned up unused `Folder` icon import from both files

#### 2. Show AI Personality Name on History Items ✅
- Each game card now shows the AI personality name (e.g., "Classical", "Aggressive") with a Bot icon in amber
- Displayed between the game title and result detail for human-vs-AI games
- AI vs AI games show both personality names in the title

#### 3. AI Personality Filter Dropdown ✅
- New dropdown below the filter tabs: "All AI Personalities" or filter by specific AI name
- Collects unique personality names from all game records (human-vs-AI and AI-vs-AI)
- Cross-filters with existing mode/result tabs (e.g., "vs AI" + "Classical" shows only games against Classical)
- "Clear" button to reset AI filter
- Hidden when no AI personalities exist in history

### Build
- ✅ `npm run build` passes cleanly (0 errors)
- ✅ All pages verified (Home, Play, Editor, History, Settings)
- ✅ Committed: `8c60c51`

### Files Changed
- `src/components/Layout.tsx` — Removed Library from navLinks, removed Folder import
- `src/pages/HomePage.tsx` — Removed Library quick action, removed Folder import
- `src/pages/HistoryPage.tsx` — Added AI name display, AI personality filter dropdown, useMemo for unique names

---

## 2026-03-07: Critical Engine Bug Fix + Eval Bar Smoothing (02:00)

### Session Summary
**Time budget:** 45 min
**Elapsed:** ~15 min
**Mode:** Direct (worker self-executed changes)

### Completed

#### 1. Mate-in-1 Detection Bug Fix (P0 Critical) ✅
- **Root cause:** In `quiesce()`, standPat evaluation and alpha/beta cutoff checks ran BEFORE the terminal position check (`allMoves.length === 0`). When a position was checkmate, the standPat value (normal material eval) could satisfy the beta cutoff condition, causing the function to return a wrong value instead of the correct mate score. This meant the engine could see a checkmate-in-1 but evaluate it as just a normal material advantage, potentially missing the forced mate.
- **Fix:** Moved `allMoves = board.moves` and the `allMoves.length === 0` terminal check to the very top of `quiesce()`, before any standPat calculations or cutoff logic. Checkmate/stalemate are now always detected correctly regardless of material balance.

#### 2. Eval Bar Smooth Updates (UX Fix) ✅
- **Root cause:** `currentEval` only updated when the AI computed its move. After a human move, the eval bar showed the stale value until the AI responded, causing a visible jump.
- **Fix:** Added `quickEval()` to search.ts — a lightweight static evaluation without full minimax search. New `'eval'` message type in worker protocol. `getEval()` method in `useChessAI` hook. GamePage now requests a quick eval after every human move (both human-vs-AI and human-vs-human modes), so the eval bar updates smoothly.

#### 3. Tasks Verified Already Complete ✅
- Save overwrite confirmation — already implemented (confirm() dialog in AIEditorPanel)
- Slider maximums — already at target values (randomness=500, king safety=200, search depth=10)
- Saved vs Presets styling — already differentiated (blue vs green highlights, mutual exclusion)

### Build
- ✅ `npm run build` passes cleanly (0 errors)
- ✅ Committed: `8b0d369`

### Files Changed
- `src/engine/search.ts` — Reordered quiesce() terminal check + added quickEval() export
- `src/engine/aiWorker.ts` — Handle 'eval' message type
- `src/engine/types.ts` — Added 'eval' to WorkerRequest/WorkerResponse types
- `src/hooks/useChessAI.ts` — Added getEval() method + eval response handler
- `src/pages/GamePage.tsx` — requestQuickEval() after human moves + human-vs-human eval updates

---

## 2026-03-07: Daily Build — Orchestrator (15:00)

### Session Summary
**Time budget:** 30 min
**Elapsed:** 18 min (12 min remaining)
**Mode:** Orchestrator with workers

### What I did (this session)
- Started session timer and performed an assessment of PROGRESS.md and HANDOFF.md
- Spawned a QA reviewer worker to audit UI and code for accessibility, dead code, and obvious runtime issues
- Spawned a focused fix worker to address the QA findings
- Spawned additional workers to fix the AnalysisPage transport scroll bug and HistoryPage accessibility/AI-name display
- Verified all changes by running `npm run build` after each round of fixes
- Began Stockfish integration by spawning a worker to add Stockfish as a playable AI (in progress)

### Completed (verified)
- QA review completed: identified accessibility gaps, dead imports, duplicated move logic, missing aria attributes, console logging left in production, theme mismatch
- Implemented fixes (verified via build and quick checks):
  • `src/utils/boardThemes.ts` — new shared BOARD_THEMES constant; unified board theme values (dark theme now consistent)
  • HistoryPage accessibility: added `tabIndex`, `role="button"`, and `onKeyDown` handlers to game cards
  • Removed unused `Filter` icon import from HistoryPage
  • Wrapped `console.error` calls in GamePage with `if (import.meta.env.DEV)` guards
  • SettingsPage accessibility: added `disabled` + `aria-disabled` to non-functional theme buttons and `aria-label` to board swatches
  • Added `aria-pressed` to History filter buttons
  • AnalysisPage transport controls: set `type="button"` and call `e.preventDefault()` in handlers to stop button-click scroll
  • HistoryPage now displays AI personality names for AI-vs-AI games as well as human-vs-AI
- Verified build after each change: `npm run build` passes cleanly (0 errors)

### Files changed (high-level)
- `src/utils/boardThemes.ts` (NEW)
- `src/pages/HistoryPage.tsx` (accessibility + AI-name display)
- `src/pages/AnalysisPage.tsx` (transport button fixes)
- `src/pages/GamePage.tsx` (console guards)
- `src/pages/SettingsPage.tsx` (accessibility attributes)
- Various small tidies across components (removed unused imports, aria-attrs)

### In progress
- Stockfish integration: worker spawned to add Stockfish WASM as a playable AI preset (hook + worker wrapper + New Game modal UI). Worker running; initial approach attempts to install `stockfish` npm package and wire a web worker wrapper.

### Blockers
- GitHub Actions/workflow push is still blocked by GitHub auth scopes (`gh auth refresh -s workflow`) — noted in earlier logs — remains unresolved
- Stockfish integration may require copying WASM/JS assets to `public/` or adjusting Vite config to serve WASM from node_modules. The worker is exploring simple `public/stockfish` copy-first approach if necessary.

### Build status
- ✅ `npm run build` passes cleanly (0 errors) — verified after fixes

### Next steps (if time remains)
1. Wait for Stockfish worker callback; on callback, verify Stockfish can return moves in the browser (run a short game vs Stockfish at low depth)
2. If Stockfish integration is complete and verified: add Stockfish to New Game modal as selectable AI preset with Strength slider (maps to UCI skill/depth)
3. If Stockfish worker is blocked on WASM serving, spawn a follow-up worker to copy stockfish assets to `public/stockfish` and wire loader as a fallback
4. Triage any further QA items found during browser verification (keyboard navigation, focus traps) and add them to PROGRESS.md if needed

---

*Notes:* I ran a memory lookup for relevant past notes (memory/2026-03-01.md, memory/2026-02-28.md) to ensure P0 bugs and performance guidance were respected during prioritization.

---

(End of entry)

---

## 2026-03-08: Morning Session — Polish & Analysis Improvements (03:00)

### Session Summary
**Time budget:** 45 min
**Mode:** Orchestrator with workers

### Tasks

- [x] **T1: AnalysisPage board theme consistency** — AnalysisPage has hardcoded green board theme (`#779952`/`#edeed1`). Should respect user's board theme setting from `getSettings()` just like GamePage does. Also import `BOARD_THEME_COLORS`.
- [x] **T2: AnalysisPage move sounds** — Add sound effects when navigating through moves in AnalysisPage (move, capture, check, castle, game-over sounds). Use existing `playSoundForMove` from `utils/sounds`. Sound should play on goTo/goNext/goPrev but NOT during auto-play rapid advance.
- [x] **T3: Analysis page Stockfish eval toggle** — Add toggle button to switch between custom engine eval and Stockfish eval on the Analysis page. Use existing `useStockfish` hook. When Stockfish mode is on, request `stockfish.getMove(fen, 20, 18)` and show its eval + best move arrow instead of the custom engine's.
- [x] **T4: Game result indicator in move list** — Show the game result (1-0, 0-1, ½-½, *) at the end of the move list in AnalysisPage, styled as a subtle badge after the last move.
- [x] **T5: Opening name display** — Show the ECO opening name (e.g., "Sicilian Defense: Najdorf") in the AnalysisPage header based on the moves played. Use a lightweight ECO opening book (JSON lookup by move sequence). Show below the game title.
- [x] **T6: Opening name on GamePage** — Show the current opening name in the GamePage while playing, updating as moves are made. Use the same `lookupOpening` utility. Display below the player info or in the status area.
- [x] **T7: Bundle optimization — lazy load openings data** — The openings.json is already split into a separate chunk, but the `lookupOpening` utility imports it statically. Convert to dynamic import so it's only loaded when AnalysisPage or GamePage are active.
- [x] **T8: Stockfish integration in GamePage** — Complete the Stockfish opponent integration in GamePage. The NewGameModal already has the Stockfish option with skill level/depth controls. Wire up the GamePage to use Stockfish for AI moves when `useStockfish` mode is active instead of the custom engine.
- [x] **T9: Add "Play Stockfish" quick action to HomePage** — Add a quick action card on the home page for "Play Stockfish" that links to `/play?mode=human-vs-ai&stockfish=1`, with a Cpu icon and orange color scheme.
- [x] **T10: Opening name display in HistoryPage** — Show the opening name for each game in the game history list. Use the game's PGN to look up the opening.
- [x] **T11: Keyboard shortcut tooltip** — Add a small "Keyboard shortcuts: ←→ navigate, Home/End jump" hint at the bottom of the AnalysisPage, styled as a subtle text.
- [x] **T12: Game statistics in HistoryPage** — Add a statistics summary card at the top of the HistoryPage showing: total games, win/loss/draw record, win rate %, most common opening, and average game length (in moves). Use existing game data from `getGames()`.
- [x] **T13: PGN import for Analysis** — Add a "Paste PGN" button to the AnalysisPage or a new entry point from the HistoryPage that accepts pasted PGN text, saves it as a game record, and opens it in analysis. This allows analyzing games from other sources.
- [x] **T14: PGN export from AnalysisPage** — Add a "Download PGN" button to the AnalysisPage that downloads the current game as a .pgn file. Include headers (Event, Date, White, Black, Result).
- [x] **T15: Dark/light mode toggle for EvalBar** — The EvalBar should show a smooth gradient with numbers. Improve the EvalBar component to show the actual eval score number overlaid on the bar, with white text on the dark side and dark text on the light side.
- [x] **T16: Copy FEN button in AnalysisPage** — Add a "Copy FEN" button that copies the current position's FEN string to clipboard. Place it next to the existing "Copy PGN" button.
- [x] **T17: Move classification colors** — Color-code moves in the move list based on eval change: green for good moves, red for blunders (>200cp loss), orange for mistakes (100-200cp loss), gray for neutral.

---

## 2026-03-08: Daily Build — Afternoon Session (15:00)

### Session Summary
**Time budget:** 30 min
**Mode:** Orchestrator with workers

### Completed

#### T17: Move Classification Colors ✅
- New `src/utils/moveClassification.ts` — Batch evaluates all positions using quickEval
- Classifies moves: brilliant (cyan), good (green), neutral (slate), inaccuracy (yellow), mistake (orange), blunder (red)
- Color-coded move list in AnalysisPage (non-selected moves show classification color)
- Classification legend below move list
- Loading state while analyzing
- Active/selected move retains blue highlight

#### T18: Stockfish Error Handling + Graceful Fallback ✅
- `useStockfish.ts` — Added error state, 10-second readyok timeout, onerror handler
- `GamePage.tsx` — Error banner with "Switch to built-in AI" fallback button
- `AnalysisPage.tsx` — Auto-fallback to custom engine eval on Stockfish failure, disabled toggle with tooltip

#### T19: Code-Split Pages with React.lazy ✅
- All 7 pages converted to lazy imports in App.tsx
- Suspense boundary with loading spinner
- **Index chunk: 238KB (down from 508KB — 53% reduction!)**
- No more Vite 500KB chunk warning

#### T20: Responsive Layout Improvements ✅
- AnalysisPage: mobile-friendly stacked layout, better move list sizing
- HistoryPage: responsive statistics card, touch-friendly buttons
- GamePage: Stockfish error banner wraps properly on mobile

#### T21: App Polish — Title, Meta, Favicon, Page Titles ✅
- index.html: proper title, meta description, theme-color
- Custom chess knight SVG favicon (replaces Vite default)
- Dynamic page titles via `usePageTitle` hook (e.g., "Play — Chess AI")

### Tasks
- [x] **T17: Move classification colors** — Implemented with batch quickEval analysis
- [x] **T18: Stockfish error handling** — Graceful fallback with error banner
- [x] **T19: Code-split pages** — React.lazy + Suspense (53% bundle reduction)
- [x] **T20: Responsive improvements** — Mobile layout fixes across pages
- [x] **T21: App polish** — Favicon, meta, dynamic page titles
- [x] **T22: Keyboard shortcuts on GamePage** — F=flip, N=new game, Ctrl+Z=undo, Escape=close modal, with help tooltip
- [x] **T23: Opening book for custom engine** — AI plays book moves in first 10 moves, with "📖 Book" indicator

### Build
- ✅ `npm run build` passes cleanly (0 errors, no warnings)
- Index chunk: 238KB (down from 508KB — 53% reduction via code splitting)
- 7 workers spawned, all completed successfully

### Files Changed
- `src/utils/moveClassification.ts` — NEW: batch eval + classification
- `src/engine/openingBook.ts` — NEW: opening book lookup
- `src/hooks/usePageTitle.ts` — NEW: dynamic page titles
- `src/pages/AnalysisPage.tsx` — Move classification colors, Stockfish error fallback, responsive fixes
- `src/pages/GamePage.tsx` — Stockfish error banner, keyboard shortcuts, opening indicator
- `src/pages/HistoryPage.tsx` — Responsive improvements
- `src/hooks/useStockfish.ts` — Error handling + 10s timeout
- `src/engine/aiWorker.ts` — Opening book integration
- `src/engine/types.ts` — isBookMove field
- `src/hooks/useChessAI.ts` — Book move status display
- `src/App.tsx` — React.lazy code splitting
- `index.html` — Title, meta, favicon, theme-color
- `public/favicon.svg` — NEW: chess knight favicon

## P1 — John's Feedback (Mar 9, evening)

- [x] **Move delay slider for Human vs AI** — Added AI Move Delay slider (0-3000ms, step 250) to NewGameModal for human-vs-ai mode. Default 500ms. Value passed through NewGameSettings and applied to GamePage minMoveTime state. Desktop sidebar slider still works for live mid-game adjustment. (Mar 10)
- [x] **Click-to-move hitbox is circular, should be square** — Added dragActivationDistance: 5 to Chessboard options. dnd-kit drag sensor now requires 5px movement before activating, so clicks (no/minimal movement) cleanly fire onSquareClick regardless of position within the square (corners, edges, center). (Mar 10)

## Session: Mar 11 Morning (02:00) — Polish, PWA, A11y, Stats

### Completed (8 workers)

#### PWA Support ✅
- manifest.json, service worker (sw.js), PWA icons (192/512px)
- Apple touch icon, mobile web app meta tags
- Service worker with cache-first strategy for offline use

#### Social Sharing + SEO ✅
- Open Graph meta tags (og:title, og:description, og:url)
- Twitter Card meta tags
- JSON-LD structured data (WebApplication schema)
- robots.txt + sitemap.xml
- 404 Not Found page (chess-themed "♞ Position Not Found")

#### Accessibility Improvements ✅
- Skip navigation link (sr-only, visible on focus)
- Focus management on route changes
- 50+ icon-only buttons now have aria-labels (GamePage, AnalysisPage, PositionSetupPage)
- aria-live region for game status announcements
- Modal accessibility: role="dialog", aria-modal, focus trapping, Escape-to-close
- NewGameModal: click-outside-to-close added

#### Keyboard Help Modal ✅
- Global `?` key opens keyboard shortcuts overlay
- Shortcuts grouped by context (Global, Play, Analysis)
- Help button (CircleHelp icon) in nav bar
- About section in Settings page

#### What's New Banner ✅
- Dismissible feature highlights on HomePage
- Version-gated (won't reshow until version bump)
- 4 highlighted features (PWA, Pre-moves, Position Setup, Progressive Eval)

#### Performance Optimizations ✅
- EvalBar wrapped in React.memo
- Memoized boardOptions object in GamePage
- Openings lookup early exit after move 20

#### UX Polish ✅
- Swipe navigation on Analysis page (mobile touch)
- Copy FEN button on GamePage desktop sidebar
- AI Move Delay persisted to localStorage
- Game statistics tracking (wins/losses/draws/streaks)
- Stats display on Settings page with reset option
- Improved Suspense fallback + ErrorBoundary UI

### Build
- ✅ `npm run build` — 0 errors (17.5s)
- ✅ `npx tsc --noEmit` — 0 errors
- 9 new files, 14 modified files, +376 lines

### New Files
- `public/manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`
- `public/robots.txt`, `public/sitemap.xml`
- `src/components/KeyboardHelpModal.tsx`
- `src/components/WhatsNew.tsx`
- `src/pages/NotFoundPage.tsx`
- `src/utils/gameStats.ts`

---

## Session: Mar 10 Morning (02:00) — 12 Workers, 10 Features

### Completed
- [x] **Progressive eval bar** — onProgress callback in search.ts emits depth-by-depth results. Thinking indicator shows "Thinking d3/5". Eval bar moves incrementally during AI search. (Mar 10)
- [x] **Click-to-move hitbox fix** — dragActivationDistance: 5 in Chessboard options. (Mar 10)
- [x] **AI Move Delay in NewGameModal** — Slider 0-3000ms for human-vs-ai mode. (Mar 10)
- [x] **Bot avatars/icons** — 16-emoji avatar picker in AIEditorPanel. Shown in player bars, history, NewGameModal. (Mar 10)
- [x] **QA audit** — Error boundary added to App.tsx. 13 icon-only buttons got aria-labels. Console statements verified clean. No unused imports. (Mar 10)
- [x] **Mobile undo button** — Undo2 icon in mobile action row for human-vs-ai. Undoes 2 half-moves. Disabled when no moves/AI thinking/game over. (Mar 10)
- [x] **Clock polish** — Improved formatTime (MM:SS → SS.s under 10s). Orange pulse <30s, red pulse <10s with ring border. (Mar 10)
- [x] **Game-over summary modal** — Overlay with result, move count, duration, opening. Buttons: New Game, Analyze, Copy PGN. Fade-in animation. Dismiss with Escape/click outside. (Mar 10)
- [x] **Resign button** — Flag icon on mobile + desktop. Confirmation dialog. Saves resignation to history. Disabled during AI thinking. (Mar 10)
- [x] **Draw detection & claim** — Checks threefold repetition and 50-move rule after each move. Amber notification + Handshake button when claimable. Stalemate/insufficient material auto-detected. (Mar 10)
- [x] **Share game link** — Copy Link button on AnalysisPage + GameResultModal. Copies analysis URL to clipboard with "Copied!" feedback. (Mar 10)
- [x] **HomePage feature highlights** — Hero section + 4-card feature grid (Custom AI, Deep Analysis, Multiple Engines, Opening Book). (Mar 10)

---

## Core Flows

Test these at the live URL: `https://nice-desert-0df9bdf1e.4.azurestaticapps.net`

1. **Start new game** — Home → select AI, click Play → board renders, can make moves
2. **Play a game** — Make 3-4 moves → AI responds each time, no crashes, eval bar updates
3. **Tab navigation** — Visit every tab (Home, Create, Play, History, Settings) → no errors, tabs stay consistent
4. **History** — Navigate to History from another tab → loads without "Something went wrong", shows past games
5. **Create AI personality** — Create → fill in name/settings → save → use in a game → works
6. **Position setup** — Go to /setup → place pieces → start game from position → board shows custom position
7. **Arena** — Open /arena → start a quick match → game runs and completes
8. **Analysis** — Open analysis → import a PGN → analysis loads, can navigate moves
9. **PGN import** — History → Import PGN → paste valid PGN → saves as game, opens in analysis
10. **Settings** — Settings page loads, toggles work (theme, sounds, opening book)
