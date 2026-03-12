# Research: Exporting Custom Chess AI Bots to Lichess & Chess.com

**Date:** 2026-03-12  
**Status:** Complete  
**Author:** Research Worker (automated)

---

## Table of Contents

1. [Lichess Bot API](#1-lichess-bot-api)
2. [Chess.com Bot API](#2-chesscom-bot-api)
3. [UCI Protocol Wrapper](#3-uci-protocol-wrapper)
4. [Personality Export Format](#4-personality-export-format)
5. [Hosting Requirements](#5-hosting-requirements)
6. [Feasibility Assessment](#6-feasibility-assessment)
7. [Recommended Implementation Plan](#7-recommended-implementation-plan)

---

## 1. Lichess Bot API

### How It Works

Lichess has a **first-class Bot API** — it's well-documented, free, and specifically designed for custom engines. The API is HTTP/NDJSON-based (not UCI directly). Your bot program talks to Lichess over HTTP, and *you* decide how to generate moves internally.

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bot/account/upgrade` | POST | Upgrade a fresh account to BOT type (irreversible) |
| `/api/stream/event` | GET (stream) | Stream incoming challenges & game starts |
| `/api/challenge/{challengeId}/accept` | POST | Accept a challenge |
| `/api/challenge/{challengeId}/decline` | POST | Decline a challenge |
| `/api/bot/game/stream/{gameId}` | GET (stream) | Stream game state (moves, clock, chat) |
| `/api/bot/game/{gameId}/move/{move}` | POST | Make a move (UCI format, e.g., `e2e4`) |
| `/api/bot/game/{gameId}/abort` | POST | Abort a game |
| `/api/bot/game/{gameId}/resign` | POST | Resign a game |
| `/api/bot/game/{gameId}/chat` | POST | Send a chat message |
| `/api/bot/game/{gameId}/draw/{accept}` | POST | Offer/accept/decline draw |

### Authentication

- **Personal Access Token** with `bot:play` scope
- Created at: `https://lichess.org/account/oauth/token`
- Passed as: `Authorization: Bearer {token}` header

### Account Requirements

1. Create a **new** Lichess account (cannot have played any games)
2. Upgrade to BOT account via API call (one-time, irreversible)
3. BOT accounts are clearly labeled — no deception

### Protocol

**Lichess does NOT require UCI.** The API speaks HTTP + NDJSON streaming. Moves are in UCI long algebraic format (`e2e4`, `e7e8q`). The flow is:

```
1. Connect to /api/stream/event (long-poll NDJSON stream)
2. Receive challenge → accept/decline
3. Receive gameStart → connect to /api/bot/game/stream/{gameId}
4. Receive game state with moves list
5. Compute your move → POST /api/bot/game/{gameId}/move/{move}
6. Repeat until game ends
```

### Can a Custom JS Engine Be Used? **YES — Absolutely.**

There are **two paths**:

#### Path A: Direct API Integration (Recommended ⭐)

Write a Node.js/TypeScript service that:
- Connects to Lichess streaming API
- Receives game state
- Runs your existing engine logic directly (no UCI needed)
- Posts moves back via HTTP

This is exactly what [bot-o-tron](https://github.com/tailuge/bot-o-tron) does. It's a Node.js project where you implement one method:

```typescript
// This is ALL you need to implement
getNextMove(moves: string[]): string {
  // moves = ["e2e4", "b8c6", "f2f4"] (UCI format)
  // return a UCI move string like "d7d5"
}
```

#### Path B: lichess-bot Bridge (Python)

The official [lichess-bot](https://github.com/lichess-bot-devs/lichess-bot) Python bridge supports a "homemade engine" mode. You extend `MinimalEngine` and implement `search()`:

```python
class MyEngine(MinimalEngine):
    def search(self, board, time_limit, ponder, draw_offered, root_moves):
        # board is a python-chess Board object
        # return chess.Move object
        return chess.Move.from_uci("e2e4")
```

This would require wrapping your TS engine as a subprocess or using a Python↔Node bridge, which adds complexity. **Path A is simpler for a JS/TS engine.**

### Restrictions

- Bots can only play challenge games (no matchmaking pools or tournaments... except bot tournaments)
- No UltraBullet (¼+0) — too many requests
- Must follow Lichess ToS (no sandbagging, constant aborting)
- Bots play with a BOT badge (transparent)

---

## 2. Chess.com Bot API

### Short Answer: **No public bot API exists.**

Chess.com does **not** offer a public API for running custom bot accounts. Their bots (Hikaru Bot, Magnus Bot, etc.) are internal features.

### What Chess.com Does Offer

- **Published Data API** (`api.chess.com/pub/...`): Read-only access to player stats, game archives, clubs, tournaments. No play functionality.
- **No play API**: Cannot make moves, accept challenges, or run automated accounts.
- **Internal bots only**: Chess.com's personality bots are proprietary, running Komodo with custom tuning.

### Alternatives for Chess.com

1. **Browser Extension / Overlay (Not Recommended)**: Some projects automate the browser to play moves on Chess.com. This violates ToS and can get accounts banned.
2. **Partner Program**: Chess.com may have internal partnerships for bot accounts, but this isn't publicly accessible.
3. **Just Don't**: Focus on Lichess, which actively supports and encourages community bots.

### Conclusion: **Chess.com is not a viable target for custom bot export.**

---

## 3. UCI Protocol Wrapper

### Do We Need UCI?

**For Lichess: No.** The Lichess Bot API is HTTP-based. You send moves as strings. No UCI protocol needed.

**For other platforms or standalone use: Maybe.** If we wanted our engine to work with GUIs like Arena, CuteChess, or the lichess-bot Python bridge, UCI would be useful.

### Minimum Viable UCI Implementation

UCI (Universal Chess Interface) is a text-based protocol over stdin/stdout. The minimum commands to support:

```
// Engine receives:
uci              → respond with engine info + "uciok"
isready          → respond with "readyok"
ucinewgame       → reset engine state
position fen ... → set board position
position startpos moves e2e4 d7d5 → set position from moves
go depth N       → search to depth N, respond with "bestmove e2e4"
go wtime X btime Y → search with time management
quit             → exit

// Engine sends:
id name ChessAI
id author YourName
uciok
readyok
bestmove e2e4
info depth 4 score cp 35 nodes 12345 pv e2e4 d7d5
```

### TypeScript UCI Wrapper Pseudocode

```typescript
// uci-wrapper.ts - Wraps our engine as a UCI-speaking process
import * as readline from 'readline';
import { evaluate } from './engine/evaluate';
import { search } from './engine/search';
import { EvaluationConfig } from './engine/types';
import { Chess } from 'chess.js';

const personality: EvaluationConfig = /* load from JSON */;
const game = new Chess();

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line: string) => {
  const parts = line.trim().split(/\s+/);
  const cmd = parts[0];

  switch (cmd) {
    case 'uci':
      console.log('id name ChessAI-Personality');
      console.log('id author John');
      console.log('uciok');
      break;

    case 'isready':
      console.log('readyok');
      break;

    case 'ucinewgame':
      game.reset();
      break;

    case 'position':
      if (parts[1] === 'startpos') {
        game.reset();
        const movesIdx = parts.indexOf('moves');
        if (movesIdx > -1) {
          for (const m of parts.slice(movesIdx + 1)) {
            game.move(m, { sloppy: true });
          }
        }
      } else if (parts[1] === 'fen') {
        const fenParts = parts.slice(2);
        const movesIdx = fenParts.indexOf('moves');
        const fen = movesIdx > -1
          ? fenParts.slice(0, movesIdx).join(' ')
          : fenParts.join(' ');
        game.load(fen);
        if (movesIdx > -1) {
          for (const m of fenParts.slice(movesIdx + 1)) {
            game.move(m, { sloppy: true });
          }
        }
      }
      break;

    case 'go':
      const depth = personality.search.depth;
      const bestMove = search(game.fen(), personality, depth);
      console.log(`bestmove ${bestMove}`);
      break;

    case 'quit':
      process.exit(0);
  }
});
```

### Effort Estimate for UCI Wrapper

- **~2-4 hours** for a working UCI wrapper
- Main challenge: porting the web worker engine to run in Node.js (removing browser/web worker dependencies)
- chess.js works in both environments, so move generation is portable

---

## 4. Personality Export Format

### Current Format (Our Engine)

Our personalities are `EvaluationConfig` JSON objects:

```typescript
interface EvaluationConfig {
  pieceValues: { pawn, knight, bishop, rook, queen }
  positional: { centerControl, pawnAdvancement, mobility, pawnStructure }
  kingSafety: { castleBonus, pawnShield, exposurePenalty }
  tactical: { attackWeight, defenseWeight, aggression }
  search: { depth }
  randomness: { threshold }
  phases?: { opening?: {...}, endgame?: {...} }
  openingBookEnabled?: boolean
}
```

### For Lichess Bot Export: **No conversion needed.**

Since we're running our own engine (not UCI-wrapping Stockfish), we use our JSON configs directly. The Lichess bot just loads the personality JSON and passes it to our engine.

### Suggested Export Format

For distributing personalities or letting users load them:

```json
{
  "format": "chess-ai-personality-v1",
  "name": "Aggressive",
  "description": "High aggression, low defense, prefers attacks",
  "author": "John",
  "version": "1.0.0",
  "elo_estimate": 1200,
  "config": {
    // Full EvaluationConfig object
  }
}
```

### For UCI-Compatible External Use

If we wanted to make personalities work with other engines (e.g., Stockfish-based), we'd need to map our weights to UCI options. This is **not recommended** — our eval function is custom and doesn't map cleanly to Stockfish's parameters.

---

## 5. Hosting Requirements

### Lichess Bot Hosting

| Aspect | Requirement |
|--------|-------------|
| **Uptime** | Only needs to run when you want the bot online. No 24/7 requirement. |
| **Latency** | Must respond within the game's time control. For bullet (1+0), <1s per move. For rapid, <5s is fine. |
| **Bandwidth** | Minimal — NDJSON streaming is tiny. Maybe 1KB/move. |
| **CPU** | Depends on search depth. Depth 4-5 on our engine should be <500ms on any modern hardware. |
| **Memory** | <100MB for a Node.js process with our engine. |

### Can It Run on a Raspberry Pi? **YES.**

Our engine is lightweight JavaScript with depth 4-5 search. A Raspberry Pi 4/5 can handle this easily:
- Node.js runs fine on ARM64
- Search at depth 4 should complete in <1s even on Pi
- Can run multiple simultaneous games
- John's existing `clawdbot-pi` could host it

### Hosting Options

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| **Raspberry Pi** (clawdbot-pi) | Free | Already available, always-on | Shared with OpenClaw |
| **Render.com** (free tier) | Free | Zero setup, bot-o-tron deploys directly | Sleeps after inactivity, cold start lag |
| **Fly.io** (free tier) | Free | Good free tier, always-on option | Slightly more setup |
| **VPS** ($5/mo) | $5/mo | Full control, reliable | Monthly cost |
| **Run locally** | Free | Zero cost, easy development | Only online when your machine is on |

### Recommendation: **Start on clawdbot-pi**, consider Render.com for always-on.

---

## 6. Feasibility Assessment

### Lichess Bot

| Aspect | Rating | Notes |
|--------|--------|-------|
| **API Availability** | ✅ Easy | Well-documented, free, open |
| **Engine Integration** | ✅ Easy | JS/TS engine works directly via HTTP API |
| **Account Setup** | ✅ Easy | Create account, one API call to upgrade |
| **Personality Support** | ✅ Easy | Our JSON configs work as-is |
| **Hosting** | ✅ Easy | Can run on Pi or free cloud |
| **Overall Feasibility** | **EASY** | 1-2 days of development |

**Estimated Effort: 8-16 hours (1-2 focused days)**

Breakdown:
- Port engine to Node.js (remove web worker deps): 2-4h
- Lichess API client (stream events, make moves): 3-4h
- Personality loading & selection: 1-2h
- Challenge acceptance logic & config: 1-2h
- Testing & deployment: 2-4h

### Chess.com Bot

| Aspect | Rating | Notes |
|--------|--------|-------|
| **API Availability** | ❌ None | No public bot/play API |
| **Alternatives** | ❌ ToS violation | Browser automation = ban risk |
| **Overall Feasibility** | **NOT FEASIBLE** | No legitimate path |

**Estimated Effort: N/A — Do not pursue.**

### UCI Protocol Wrapper (Optional Bonus)

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Implementation** | 🟡 Medium | stdin/stdout text protocol |
| **Value** | 🟡 Medium | Enables use in chess GUIs, Arena, CuteChess |
| **Overall Feasibility** | **MEDIUM** | Half a day of work |

**Estimated Effort: 2-4 hours**

---

## 7. Recommended Implementation Plan

### Phase 1: Lichess Bot MVP (Priority ⭐)

**Goal:** Get one personality playing on Lichess.

**Architecture:**
```
┌─────────────────────────┐
│   Lichess Bot Service   │  (Node.js/TypeScript)
│                         │
│  ┌───────────────────┐  │
│  │ Lichess API Client│  │  ← HTTP/NDJSON streaming
│  │  - Stream events  │  │
│  │  - Accept games   │  │
│  │  - Send moves     │  │
│  └────────┬──────────┘  │
│           │              │
│  ┌────────▼──────────┐  │
│  │  Engine (ported)  │  │  ← Our existing search + eval
│  │  - evaluate()     │  │
│  │  - search()       │  │
│  │  - openingBook    │  │
│  └────────┬──────────┘  │
│           │              │
│  ┌────────▼──────────┐  │
│  │  Personality      │  │  ← JSON config loaded at startup
│  │  Loader           │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Steps:**
1. Create `projects/chess-ai/bot/` directory
2. Port engine files (`evaluate.ts`, `search.ts`, `openingBook.ts`, `types.ts`, `presets.ts`) to Node.js (strip web worker messaging, use direct function calls)
3. Write `lichessClient.ts` — handles streaming API, challenge acceptance
4. Write `bot.ts` — main entry point, loads personality, connects to Lichess
5. Create Lichess BOT account, generate token
6. Test locally, then deploy to clawdbot-pi

**Key Code — Lichess Streaming Client:**

```typescript
// lichessClient.ts (pseudocode)
import fetch from 'node-fetch';

const BASE = 'https://lichess.org';
const TOKEN = process.env.LICHESS_TOKEN;

const headers = { Authorization: `Bearer ${TOKEN}` };

// Stream incoming events (challenges, game starts)
async function* streamEvents() {
  const res = await fetch(`${BASE}/api/stream/event`, { headers });
  for await (const line of parseNDJSON(res.body)) {
    yield line;
  }
}

// Stream a game's state
async function* streamGame(gameId: string) {
  const res = await fetch(`${BASE}/api/bot/game/stream/${gameId}`, { headers });
  for await (const line of parseNDJSON(res.body)) {
    yield line;
  }
}

// Make a move
async function makeMove(gameId: string, move: string) {
  await fetch(`${BASE}/api/bot/game/${gameId}/move/${move}`, {
    method: 'POST', headers
  });
}
```

### Phase 2: Multi-Personality Support

- Let users challenge the bot with a specific personality via chat command
- Or run multiple bot accounts, each with a different personality
- Add personality selection in Lichess chat: "!personality aggressive"

### Phase 3: UCI Wrapper (Optional)

- Create `uci-adapter.ts` for CLI/GUI compatibility
- Enables testing with CuteChess, Arena, etc.
- Useful for benchmarking against other engines

---

## Key Takeaways

1. **Lichess is the clear (and only) target.** Excellent bot API, JS-friendly, free, well-supported.
2. **No UCI needed for Lichess.** Direct HTTP API is simpler.
3. **Our engine ports easily.** It's pure TypeScript logic — just strip web worker messaging.
4. **Personalities work as-is.** JSON configs load directly into the ported engine.
5. **Can run on the Pi.** Lightweight enough for clawdbot-pi.
6. **Chess.com is a dead end.** No public bot API, no legitimate path.
7. **Total effort: ~2 days** from zero to a working Lichess bot with personality support.

---

## References

- [Lichess Bot API Docs](https://lichess.org/api#tag/Bot)
- [lichess-bot (Python bridge)](https://github.com/lichess-bot-devs/lichess-bot)
- [bot-o-tron (JS reference)](https://github.com/tailuge/bot-o-tron)
- [LichessBots (Node.js library)](https://github.com/MarquisdeGeek/LichessBots)
- [Lichess API OAuth Tokens](https://lichess.org/account/oauth/token)
- [Chess.com Published Data API](https://www.chess.com/news/view/published-data-api) (read-only, no play)
