# Chess AI — Architecture Decisions

**Created:** 2026-02-25
**Last Updated:** 2026-02-25

---

## ADR-001: Tech Stack

**Status:** Decided | **Date:** 2026-02-25

### Context
We need a web-based chess game with an AI opponent. Requirements specify:
- React preferred
- $0/month budget
- AI response <3 seconds
- No user accounts needed
- Should work entirely client-side

### Decision
- **Frontend:** React 19 + Vite (TypeScript)
- **Chess Logic:** chess.js v1.0+
- **Chess Board UI:** react-chessboard v5.8+
- **AI Engine:** Stockfish.js (lite, single-threaded, WASM)
- **Styling:** Tailwind CSS v4
- **Icons:** Heroicons (already included with Tailwind ecosystem)

### Rationale
- React + Vite: John's preference, fastest build times, great DX for "vibe coding"
- chess.js: Industry standard, handles all move validation and game rules
- react-chessboard: Designed to pair with chess.js, has drag-drop + highlighting + animation
- Stockfish.js lite: Superhuman engine scaled down via depth limits, runs client-side in Web Worker
- Tailwind: Fast iteration, no context-switching, responsive out of the box

### Alternatives Considered
| Option | Why Not |
|--------|---------|
| Custom minimax AI | Weeks of work for inferior result — use Stockfish, optionally add minimax as educational post-MVP feature |
| Next.js | Overkill — no SSR/SSG needed for a pure client-side game |
| Custom board UI | 500+ lines of code for what react-chessboard provides free |

---

## ADR-002: Hosting & Deployment

**Status:** Decided | **Date:** 2026-02-25

### Context
Need free hosting for a static web app (~15MB including Stockfish WASM).

### Decision
**Azure Static Web Apps (Free Tier)**
- GitHub integration for CI/CD
- Auto-deploys on push to main
- Free SSL + custom domain support

### Rationale
- John's stated preference for Azure
- Free tier: 250MB storage, 100GB bandwidth — well within our needs
- Built-in GitHub Actions deployment
- Global CDN included

### Cost Estimate
| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Azure Static Web Apps | Free | $0 |
| GitHub | Free | $0 |
| Domain (optional) | N/A | $0 (use azure domain) |
| **Total** | | **$0** |

---

## ADR-003: Project Structure

**Status:** Decided | **Date:** 2026-02-25

### Context
Need a clean, maintainable project structure for a React SPA.

### Decision
```
chess-ai/
├── src/
│   ├── components/
│   │   ├── Board.tsx           # Wraps react-chessboard
│   │   ├── MoveHistory.tsx     # Sidebar with move list
│   │   ├── GameControls.tsx    # New Game, Resign buttons
│   │   └── GameStatus.tsx      # Turn indicator, game result
│   ├── hooks/
│   │   ├── useChess.ts         # Game state management
│   │   └── useStockfish.ts     # Web Worker communication
│   ├── workers/
│   │   └── stockfish.worker.ts # Web Worker wrapper
│   ├── utils/
│   │   └── stockfish.ts        # UCI command helpers
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # Tailwind directives
├── public/
│   └── stockfish/              # WASM files
│       ├── stockfish-18-lite-single.js
│       └── stockfish-18-lite-single.wasm
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── staticwebapp.config.json    # Azure SWA headers
```

### Rationale
- Standard Vite + React structure
- Components are small and focused (single responsibility)
- Custom hooks encapsulate chess.js and Stockfish logic
- WASM files in `public/` for direct loading

---

## ADR-004: AI Integration Strategy

**Status:** Decided | **Date:** 2026-02-25

### Context
Need a chess AI that:
- Responds in <3 seconds
- Is adjustable in difficulty
- Doesn't block the UI thread

### Decision
- **Engine:** Stockfish.js lite, single-threaded (WASM)
- **Execution:** Web Worker (non-blocking)
- **Communication:** UCI protocol via postMessage
- **Difficulty levels:**
  - Easy: `go depth 3` (~800 Elo)
  - Medium: `go depth 8` (~1800 Elo)
  - Hard: `go depth 15` (~2400 Elo)

### Rationale
- Web Worker keeps UI responsive during AI calculation
- UCI protocol is simple: `position fen [FEN]` + `go depth N` + read `bestmove`
- Depth-based difficulty is intuitive and covers beginner to advanced
- Lite single-threaded version: ~7MB, no CORS headers needed

### Gotchas
- Stockfish is GPL — fine for personal web app (no source distribution)
- First load will fetch ~7MB WASM — cache aggressively
- Wrap UCI communication in async helper for clean API

---

## ADR-005: State Management

**Status:** Decided | **Date:** 2026-02-25

### Context
Need to manage chess game state: position, turn, move history, game status.

### Decision
- **Primary state:** `useChess` custom hook wrapping chess.js
- **No external state library** (Redux, Zustand, etc.)
- **State lives in App.tsx,** passed down to components

### Rationale
- Chess state is simple: one game, one position, one move list
- chess.js already manages the game — we just need to re-render when it changes
- Adding Redux/Zustand for a simple game is overkill
- React's built-in useState + useReducer handles this cleanly

### State shape
```typescript
interface GameState {
  game: Chess;           // chess.js instance
  fen: string;           // Current position (for react-chessboard)
  moves: string[];       // Move history in SAN
  status: 'playing' | 'checkmate' | 'stalemate' | 'draw';
  turn: 'w' | 'b';       // Whose turn
  isThinking: boolean;   // AI calculating
}
```
