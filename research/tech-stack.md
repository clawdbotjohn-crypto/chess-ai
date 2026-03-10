# Chess AI — Tech Stack Research

**Date:** 2026-02-25
**Status:** Complete

---

## Summary

This project is a client-side-only web chess game with an AI opponent. The recommended stack is **React + Vite + chess.js + Stockfish.js (lite) + react-chessboard**, hosted on **Azure Static Web Apps (free tier)**. Zero backend required. Zero monthly cost.

---

## 1. Frontend Framework

### ✅ Recommendation: **React + Vite**

| Option | Verdict |
|--------|---------|
| React + Vite | ✅ **Winner** — Fast builds, great DX, aligns with John's preference |
| React + CRA | ❌ Deprecated/unmaintained, slow builds |
| Next.js | ❌ Overkill — SSR/SSG not needed for a client-side game |
| Vue/Svelte | ❌ Good frameworks, but John prefers React |

**Why React + Vite:**
- John's stated preference is React (see BRIEF.md)
- Vite provides instant HMR, fast builds (~1s), and native ESM support
- Massive ecosystem for chess-related libraries (all best chess libs are React-first)
- TypeScript support out of the box
- Perfect for "vibe coding" — fast iteration, minimal config

**Cost:** Free (MIT license)

**Gotchas:**
- None significant. Vite is the modern standard for React SPAs.

---

## 2. Chess Logic Library

### ✅ Recommendation: **chess.js**

**Package:** [`chess.js`](https://github.com/jhlywa/chess.js/) (npm: `chess.js`)
**Version:** Latest (TypeScript rewrite, actively maintained)
**Weekly downloads:** ~100K+

**What it does:**
- Move generation and validation (all legal moves for a position)
- Special moves: castling, en passant, pawn promotion
- Check, checkmate, stalemate, draw detection (threefold repetition, 50-move rule, insufficient material)
- FEN/PGN import/export
- Algebraic notation

**Why this over alternatives:**
- **Industry standard** — used by Chess.com, Lichess frontends, and virtually every JS chess project
- **Complete rules engine** — handles every edge case (you don't want to implement en passant yourself)
- **TypeScript native** — great type safety
- **Lightweight** — ~30KB, no dependencies
- **Pairs perfectly** with react-chessboard (designed to work together)

**Alternatives considered:**
- Custom implementation → ❌ 1000+ lines of code just for move validation, guaranteed bugs
- `chessops` (Lichess) → Good but less ecosystem support, more complex API

**Cost:** Free (BSD license)

**Gotchas:**
- chess.js handles rules only, NOT AI — that's intentional (separation of concerns)
- v1.0+ is ESM-only — make sure your bundler handles this (Vite does natively)

---

## 3. AI / Engine Approach

### ✅ Recommendation: **Stockfish.js (lite, single-threaded) + optional custom minimax for learning**

This is the most important decision. Here's the full analysis:

### Option A: Stockfish.js (WASM)
| Aspect | Details |
|--------|---------|
| Strength | Superhuman (Elo ~3650 native, ~2500+ even in browser lite mode) |
| Size | Lite: ~7MB, Full: ~100MB |
| Speed | Responds in <1s for casual depths |
| Difficulty control | Yes — limit search depth or time (`go depth 5`, `go movetime 1000`) |
| Implementation effort | Low — send UCI commands, get best move back |
| Runs client-side | Yes, via Web Workers (WASM) |

### Option B: Custom Minimax with Alpha-Beta Pruning
| Aspect | Details |
|--------|---------|
| Strength | Moderate (~1200-1800 Elo depending on evaluation function) |
| Size | ~5-15KB of code |
| Speed | Depends on depth — depth 4-5 is <3s, depth 6+ gets slow |
| Difficulty control | Yes — vary search depth |
| Implementation effort | Medium-High — need evaluation function, move ordering, etc. |
| Runs client-side | Yes, pure JS |

### 🏆 The Verdict: **Use Both (Phased Approach)**

**MVP (Phase 1): Stockfish.js lite, single-threaded**
- Get a working, polished game fast
- Use `stockfish-18-lite-single.js` (~7MB) — no CORS headers needed
- Control difficulty by limiting search depth:
  - Easy: `go depth 3` (~800 Elo)
  - Medium: `go depth 8` (~1800 Elo)
  - Hard: `go depth 15` (~2400 Elo)
- Runs in a Web Worker — won't block the UI thread
- This is what Chess.com uses in their browser analysis

**Post-MVP (Phase 2): Add custom minimax as "learning mode"**
- Educational value — show the AI's thinking process
- Visualize the search tree
- Fun "vibe coding" challenge

**Why not custom minimax first?**
- Writing a competent evaluation function is hard and time-consuming
- Piece-square tables, king safety, pawn structure — weeks of tuning
- Stockfish gives you a polished, strong opponent in ~30 minutes of integration
- The requirements say "competent enough to challenge casual players" — Stockfish delivers this trivially

**Cost:** Free (GPL for Stockfish — fine for a personal project)

**Gotchas:**
- **GPL License:** Stockfish is GPL. If you ever distribute the source code, derivative works must also be GPL. For a personal web app, this is fine — you're serving compiled assets, not distributing source.
- **WASM file size:** The lite engine is ~7MB. First load will take a moment on slow connections. Cache it aggressively.
- **Multi-threaded variant requires CORS headers:** `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`. Azure Static Web Apps supports custom headers, but the single-threaded lite variant works without this.
- **UCI protocol:** You communicate via text commands (`position fen ...`, `go depth 10`). It's simple but string-based — wrap it in a clean async API.

---

## 4. Chess Board UI Component

### ✅ Recommendation: **react-chessboard**

**Package:** [`react-chessboard`](https://github.com/Clariity/react-chessboard) (v5.8.6, published Dec 2025)
**Weekly downloads:** ~25K

**What it provides:**
- Beautiful, responsive SVG chess board
- Drag-and-drop piece movement (mouse + touch)
- Click-to-move support
- Move highlighting (legal moves, last move, check squares)
- Custom piece styles and board colors
- Animated piece movement
- Arrow drawing on the board
- Board orientation (flip board)
- Premove support

**Why this over alternatives:**
- **Designed for chess.js** — takes a FEN position string directly, fires callbacks with move objects
- **Active maintenance** — regular releases through 2025-2026
- **Best DX** — 10 lines of code to get a working interactive board
- **Feature-rich** — covers all requirements: drag-drop, highlighting, animation, responsive
- **Storybook docs** — great examples at react-chessboard.vercel.app

**Alternatives considered:**
- `chessboard.jsx` → ❌ Unmaintained (react-chessboard is its spiritual successor)
- `@chrisoakman/chessboardjs` → ❌ jQuery-based, not React-native
- Custom SVG board → ❌ 500+ lines of code for what react-chessboard gives you free
- `kokopu-react` → Less popular, fewer features

**Cost:** Free (MIT license)

**Gotchas:**
- Depends on `react-dnd` for drag-and-drop — adds ~50KB to bundle (acceptable)
- Touch support works but occasionally needs `touch-action: none` CSS fix on mobile
- Custom piece images require SVG format for best results

---

## 5. Hosting Platform

### ✅ Recommendation: **Azure Static Web Apps (Free Tier)**

| Feature | Free Tier |
|---------|-----------|
| Storage | 250 MB per app |
| Bandwidth | 100 GB/month |
| Custom domains | 2 |
| SSL | ✅ Auto-provisioned |
| Global CDN | ✅ |
| GitHub CI/CD | ✅ Built-in |
| Staging environments | 3 |
| Cost | **$0/month** |

**Why Azure SWA:**
- John's stated preference (see BRIEF.md)
- Free tier is generous — 250MB easily covers our app (~15MB with Stockfish WASM)
- 100GB bandwidth is plenty for a personal project
- Built-in GitHub Actions deployment — push to main = auto deploy
- Global CDN out of the box — fast loads worldwide
- Custom domain + free SSL

**Alternatives evaluated:**

| Platform | Free Tier | Verdict |
|----------|-----------|---------|
| Azure Static Web Apps | 250MB, 100GB BW | ✅ **Winner** — John's preference, great free tier |
| Vercel | 100GB BW, generous limits | Good, but no Azure preference alignment |
| Netlify | 100GB BW, 300 build min/month | Good, similar to Vercel |
| GitHub Pages | Unlimited static hosting | No custom build pipeline, basic |
| Cloudflare Pages | Unlimited BW | Excellent, but John prefers Azure |

**Cost:** $0/month

**Gotchas:**
- Max app size 250MB (free tier) — Stockfish full engine is 100MB, but we're using lite (~7MB) so this is fine
- Custom headers config needs `staticwebapp.config.json` — for WASM MIME types and optional CORS headers
- Build: need to configure the GitHub Action to use Vite's build output directory (`dist/`)

---

## 6. Additional Tooling

### Build & Dev
| Tool | Purpose | Cost |
|------|---------|------|
| **Vite** | Build tool, dev server, HMR | Free |
| **TypeScript** | Type safety | Free |
| **ESLint + Prettier** | Code quality | Free |

### Styling
| Tool | Purpose | Cost |
|------|---------|------|
| **Tailwind CSS** | Utility-first styling for the UI shell (sidebar, controls) | Free |

**Why Tailwind:** Fast iteration for "vibe coding", no context-switching to CSS files, great for responsive design. The chess board itself is styled by react-chessboard — Tailwind handles everything around it (layout, move history panel, buttons, modals).

### Testing (Post-MVP)
| Tool | Purpose | Cost |
|------|---------|------|
| **Vitest** | Unit tests (chess logic integration) | Free |
| **Playwright** | E2E testing (optional, post-MVP) | Free |

---

## 7. Key Questions Answered

### Q1: Should we use Stockfish.js or build our own minimax?

**Use Stockfish.js for MVP.** It's what Chess.com uses in-browser. A custom minimax takes weeks to get right and still plays worse than Stockfish at depth 3. Stockfish gives you adjustable difficulty from beginner to superhuman with one parameter (search depth).

Building a custom minimax is a great *post-MVP educational exercise* but a terrible MVP strategy — it front-loads the hardest, most time-consuming work for an inferior result.

### Q2: What's the best React chess board library?

**react-chessboard**, no contest. It's the actively maintained successor to chessboard.jsx, designed to pair with chess.js, has drag-and-drop + click-to-move + highlighting + animation, and has the largest community. The Storybook demos show it handles every requirement in REQUIREMENTS.md.

### Q3: Can this run entirely client-side (no backend)?

**Yes, 100%.** The entire stack runs in the browser:
- chess.js → move validation, game state (pure JS)
- Stockfish.js → AI engine (WASM, runs in Web Worker)
- react-chessboard → UI rendering (React)
- Azure SWA → serves static files only

No server, no API, no database, no authentication. A user opens the URL and plays. This keeps costs at $0 and complexity minimal.

---

## 8. Recommended Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                      │
│                                               │
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │   React App   │  │    Web Worker         │  │
│  │               │  │                      │  │
│  │ react-        │  │  Stockfish.js        │  │
│  │ chessboard    │◄─┤  (WASM, lite)        │  │
│  │               │  │                      │  │
│  │ chess.js      │  │  UCI protocol:       │  │
│  │ (validation)  │──►│  "go depth 8"       │  │
│  │               │  │  "bestmove e2e4"     │  │
│  └──────────────┘  └──────────────────────┘  │
│                                               │
└─────────────────────────────────────────────┘
                     │
              Static files served by
              Azure Static Web Apps
              (CDN, free tier)
```

**Data flow:**
1. User drags a piece → react-chessboard fires `onPieceDrop`
2. chess.js validates the move → updates game state (FEN)
3. New FEN sent to Stockfish Web Worker → `position fen ... \n go depth 8`
4. Stockfish responds with `bestmove` → chess.js applies it
5. react-chessboard re-renders with new position

---

## 9. Package Summary

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-chessboard": "^5.8.0",
    "chess.js": "^1.0.0-beta.8"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^6.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "eslint": "^9.0.0"
  }
}
```

Stockfish.js WASM files are loaded at runtime (not npm-installed) — download the lite single-threaded build from the [GitHub releases](https://github.com/nmrugg/stockfish.js/releases) and place in `public/`.

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stockfish WASM too large for free tier | Low | High | Using lite build (~7MB), well within 250MB limit |
| WASM not supported on old browsers | Low | Med | All modern browsers support WASM; fallback: ASM.js build exists |
| react-chessboard becomes unmaintained | Low | Med | Fork it; it's MIT licensed and self-contained |
| AI too strong/weak for casual players | Med | Low | Tune search depth; Easy=3, Medium=8, Hard=15 |
| Touch/mobile drag-drop issues | Med | Med | react-chessboard supports touch; test on real devices |
