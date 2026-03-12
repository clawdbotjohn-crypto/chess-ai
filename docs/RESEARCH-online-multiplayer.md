# Online Multiplayer — Architecture Research

**Created:** 2026-03-12
**Status:** Research Complete
**Author:** Clawdbot (research worker)

---

## Executive Summary

**Recommended approach: PartyKit** — a free, serverless WebSocket platform built on Cloudflare Durable Objects.

PartyKit is the best fit for Chess AI because:
- **Free tier** is generous enough for a hobby project (built on Cloudflare Workers free tier)
- **Zero infrastructure** — no servers to manage, no database to provision
- **Room-based by design** — each game is a "party" (Durable Object) with built-in WebSocket handling
- **TypeScript native** — matches the existing stack perfectly
- **Stateful** — each room persists its own state, ideal for chess game state
- **~1 day to basic prototype** — simplest path from zero-backend to working multiplayer

Alternatives considered (see detailed comparison below): Azure Web PubSub, Supabase Realtime, Firebase, self-hosted Node.js WebSocket server, WebRTC peer-to-peer.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (existing)                   │
│           Azure Static Web Apps (React/TS/Vite)          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │ Game UI  │  │  Lobby   │  │ Existing Features     │  │
│  │(board,   │  │(find/    │  │(vs AI, analysis,      │  │
│  │ moves,   │  │ create   │  │ bot arena, etc.)      │  │
│  │ chat)    │  │ games)   │  │                       │  │
│  └────┬─────┘  └────┬─────┘  └───────────────────────┘  │
│       │              │                                    │
│       └──────┬───────┘                                    │
│              │ WebSocket (PartySocket client)              │
└──────────────┼────────────────────────────────────────────┘
               │
               │ wss://chess-ai.{user}.partykit.dev
               │
┌──────────────┼────────────────────────────────────────────┐
│              │        PARTYKIT (Cloudflare Edge)           │
│              ▼                                             │
│  ┌─────────────────────┐   ┌─────────────────────────┐   │
│  │   Lobby Server       │   │   Game Server            │   │
│  │   (party: "lobby")   │   │   (party: "game")        │   │
│  │                      │   │                           │   │
│  │ • List open games    │   │ • One instance per game   │   │
│  │ • Create/join rooms  │   │ • Move validation         │   │
│  │ • Player presence    │   │ • Game state (FEN + PGN)  │   │
│  │ • Quick match        │   │ • Turn enforcement        │   │
│  └─────────────────────┘   │ • Time control            │   │
│                             │ • Reconnection            │   │
│                             │ • Spectator broadcast     │   │
│                             └─────────────────────────┘   │
│                                                            │
│  Storage: Durable Object storage (key-value, per room)     │
│  No external database needed                               │
└────────────────────────────────────────────────────────────┘
```

---

## Backend Options Comparison

### 1. PartyKit ⭐ RECOMMENDED

| Aspect | Details |
|--------|---------|
| **What** | Serverless WebSocket platform on Cloudflare Durable Objects |
| **Free tier** | Generous — uses Cloudflare Workers free tier (100K requests/day, 10ms CPU/request). Can also deploy to own CF account for free |
| **Statefulness** | Each "party" (room) has its own persistent key-value storage |
| **Complexity** | Very low — `npm install partykit`, write a Party.Server class, `npx partykit deploy` |
| **Pros** | Purpose-built for multiplayer; rooms are first-class; TypeScript; global edge deployment; zero ops |
| **Cons** | Relatively new platform (acquired by Cloudflare 2024); 10ms CPU limit per message (plenty for chess); vendor lock-in to CF edge model |
| **Effort** | 🟢 Low (~2-3 days for full implementation) |

### 2. Supabase Realtime

| Aspect | Details |
|--------|---------|
| **What** | Realtime channels (Broadcast + Presence) on top of Supabase |
| **Free tier** | 200 concurrent connections, 2M messages/month, 100 msg/sec |
| **Complexity** | Medium — need Supabase project, use Broadcast for moves, Presence for player status |
| **Pros** | Also gives you Postgres DB, Auth, edge functions; generous free tier; good docs |
| **Cons** | Heavier than needed (full BaaS for a WebSocket feature); Realtime is pub/sub only — no server-side logic in the channel (validation must go through Edge Functions); 200 connection limit could be tight |
| **Effort** | 🟡 Medium (~4-5 days) |

### 3. Azure Web PubSub

| Aspect | Details |
|--------|---------|
| **What** | Managed WebSocket service on Azure |
| **Free tier** | 20 concurrent connections, 20K messages/day |
| **Complexity** | Medium-High — need Azure Functions for server-side logic, PubSub for transport |
| **Pros** | Already on Azure; Microsoft ecosystem; production-grade |
| **Cons** | Free tier is tiny (20 connections!); needs Azure Functions for game logic; more infra to manage; Azure-heavy developer experience |
| **Effort** | 🔴 High (~5-7 days) |

### 4. Firebase Realtime Database

| Aspect | Details |
|--------|---------|
| **What** | Real-time synced JSON database |
| **Free tier** | 100 simultaneous connections, 1GB storage, 10GB/mo transfer |
| **Complexity** | Medium — write game state to paths, listen for changes |
| **Pros** | Battle-tested; good free tier; built-in auth; offline support |
| **Cons** | Not WebSocket-native (it's a database with real-time sync); game logic must be in Security Rules or Cloud Functions; data model is JSON tree (awkward for chess); Google ecosystem |
| **Effort** | 🟡 Medium (~4-5 days) |

### 5. Self-hosted Node.js + ws/Socket.IO

| Aspect | Details |
|--------|---------|
| **What** | Roll your own WebSocket server |
| **Free hosting** | Fly.io free tier (3 shared VMs), Railway ($5 credit/mo), Render (750 hrs/mo free) |
| **Complexity** | High — build everything: connection management, rooms, reconnection, deployment, monitoring |
| **Pros** | Full control; no vendor lock-in; can run anywhere |
| **Cons** | Must manage server, scaling, deployment, health checks; free tiers have cold starts / sleep after inactivity; more code to write and maintain |
| **Effort** | 🔴 High (~7-10 days) |

### 6. WebRTC (Peer-to-Peer)

| Aspect | Details |
|--------|---------|
| **What** | Direct browser-to-browser connection |
| **Free tier** | Free (P2P) — but need a signaling server |
| **Complexity** | Very high — NAT traversal, STUN/TURN servers, connection reliability |
| **Pros** | Lowest latency; no server costs for data transfer |
| **Cons** | Still needs signaling server; NAT issues cause ~10-15% connection failures; no authoritative server for anti-cheat; terrible for spectating; massive complexity |
| **Effort** | 🔴🔴 Very High (~10+ days, fragile) |

---

## Tech Stack Recommendation

| Layer | Technology |
|-------|-----------|
| **Frontend** | Existing React/TS/Vite app + `partysocket` client package |
| **Multiplayer backend** | PartyKit (TypeScript Party.Server) |
| **Game logic** | `chess.js` (already in use) — shared between client and server |
| **State storage** | PartyKit Durable Object storage (per-room key-value) |
| **Auth** | Anonymous guest IDs (Phase 1), optional OAuth later |
| **Deployment** | `npx partykit deploy` (separate from Azure Static Web Apps) |

### Key Dependency: chess.js on Server

The same `chess.js` library used client-side can run in PartyKit's runtime. This means:
- Server validates every move using the same engine
- No need to reimplement chess rules
- FEN/PGN handling is consistent

---

## Data Model

### Player

```typescript
interface Player {
  id: string;          // Generated guest ID (uuid)
  name: string;        // Display name (user-chosen or "Guest-XXXX")
  connectedAt: number; // Timestamp
  rating?: number;     // Future: ELO rating
}
```

### Game Room

```typescript
interface GameRoom {
  id: string;              // Room ID (short, shareable: "abc123")
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  
  // Players
  white: Player | null;
  black: Player | null;
  spectators: Player[];
  
  // Game state
  fen: string;             // Current position (FEN string)
  pgn: string;             // Full move history (PGN)
  moves: Move[];           // Structured move list
  result: string | null;   // "1-0", "0-1", "1/2-1/2", null
  
  // Time control
  timeControl: TimeControl | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: number;      // Timestamp for clock calculation
  
  // Settings
  createdAt: number;
  createdBy: string;       // Player ID
  isPrivate: boolean;      // Listed in lobby or invite-only
}

interface TimeControl {
  initialMs: number;    // e.g., 600000 (10 min)
  incrementMs: number;  // e.g., 0 or 5000
}

interface Move {
  from: string;     // "e2"
  to: string;       // "e4"
  san: string;      // "e4"
  fen: string;      // FEN after move
  timestamp: number;
}
```

### Lobby State

```typescript
interface LobbyState {
  openGames: GameListing[];  // Games waiting for opponent
  activeGames: number;       // Count of in-progress games
}

interface GameListing {
  roomId: string;
  host: { id: string; name: string };
  timeControl: TimeControl | null;
  createdAt: number;
}
```

---

## Protocol Design (WebSocket Messages)

All messages are JSON. Format: `{ type: string, ...payload }`.

### Client → Server

```typescript
// Join/leave
{ type: "join", name: string }
{ type: "leave" }

// Lobby actions
{ type: "create_game", timeControl?: TimeControl, isPrivate?: boolean }
{ type: "join_game", roomId: string }
{ type: "quick_match" }

// Game actions
{ type: "move", from: string, to: string, promotion?: string }
{ type: "resign" }
{ type: "offer_draw" }
{ type: "accept_draw" }
{ type: "decline_draw" }
{ type: "rematch" }

// Chat
{ type: "chat", text: string }
```

### Server → Client

```typescript
// Connection
{ type: "welcome", playerId: string, gameState?: GameRoom }
{ type: "error", message: string, code: string }

// Lobby updates
{ type: "lobby_update", openGames: GameListing[] }

// Game lifecycle
{ type: "game_created", roomId: string }
{ type: "game_start", white: Player, black: Player, fen: string }
{ type: "game_end", result: string, reason: string }

// Moves
{ type: "move_made", move: Move, fen: string, whiteTimeMs: number, blackTimeMs: number }
{ type: "invalid_move", reason: string }

// Draw offers
{ type: "draw_offered", by: string }
{ type: "draw_declined" }

// Player status
{ type: "opponent_connected" }
{ type: "opponent_disconnected", reconnectTimeoutSec: number }
{ type: "opponent_reconnected" }
{ type: "spectator_count", count: number }

// Chat
{ type: "chat_message", from: string, text: string, timestamp: number }
```

### Message Flow: Making a Move

```
Client A                    PartyKit Server              Client B
   │                              │                          │
   │  { type: "move",            │                          │
   │    from: "e2", to: "e4" }   │                          │
   │─────────────────────────────>│                          │
   │                              │ 1. Validate with chess.js│
   │                              │ 2. Update FEN/PGN        │
   │                              │ 3. Update clock          │
   │                              │ 4. Check game end        │
   │                              │ 5. Persist to storage    │
   │                              │                          │
   │  { type: "move_made",       │  { type: "move_made",   │
   │    move: {...},              │    move: {...},          │
   │    fen: "...",               │    fen: "...",           │
   │    whiteTimeMs: 594000,      │    whiteTimeMs: 594000,  │
   │    blackTimeMs: 600000 }     │    blackTimeMs: 600000 } │
   │<─────────────────────────────│─────────────────────────>│
```

---

## Authentication Strategy

### Phase 1: Anonymous Guest Play (MVP)

- Generate a UUID on first visit, store in `localStorage`
- Player picks a display name (or gets "Guest-XXXX")
- No accounts, no passwords
- Guest ID persists across browser sessions (same device)

### Phase 2: Optional Accounts (Future)

- "Link account" with GitHub/Google OAuth (nice-to-have)
- Enables: persistent rating, game history across devices
- Still allow anonymous play — accounts are never required

**Why start anonymous:** Zero friction. Nobody wants to create an account to play a casual chess game. The existing app has no auth — adding mandatory auth would change the entire UX.

---

## Cost Estimate

### PartyKit (Recommended)

| Component | Cost |
|-----------|------|
| PartyKit hosting | **$0** (free tier / deploy to own Cloudflare account) |
| Azure Static Web Apps (existing frontend) | **$0** (already deployed, free tier) |
| Custom domain (optional) | **$0** (use partykit.dev subdomain) |
| **Total monthly** | **$0** |

**What "free" actually means:**
- Cloudflare Workers free tier: 100,000 requests/day
- Durable Objects: 1M requests/month free, 1GB storage free
- For context: a 40-move chess game ≈ 80 WebSocket messages. At 100 games/day = 8,000 messages. Well within limits.

**When you'd pay:** Sustained 1,000+ concurrent games (very unlikely for a hobby project). Standard tier is ~$5/mo.

### Alternatives Cost

| Service | Free Tier | First Paid Tier |
|---------|-----------|-----------------|
| Azure Web PubSub | 20 connections (unusable) | ~$1.61/unit/day ($49/mo) |
| Supabase | 200 connections, 2M msg/mo | $25/mo (Pro) |
| Firebase | 100 connections | Pay-as-you-go (~$0 for low usage) |
| Self-hosted (Fly.io) | 3 VMs (sleep after inactivity) | $1.94/mo per VM |

---

## Implementation Roadmap

### Phase 1: Foundation (2-3 days)

**Goal:** Two players can play a full chess game via shared link.

- [ ] Set up PartyKit project (`partykit init` in `/server` or separate repo)
- [ ] Implement `GameServer` party:
  - Accept WebSocket connections
  - Validate moves with `chess.js`
  - Broadcast moves to both players
  - Detect game end (checkmate, stalemate, draw)
- [ ] Add `partysocket` client to React app
- [ ] Create "Online Play" route with:
  - "Create Game" → generates room ID → shareable link
  - "Join Game" → enter room ID or use link
- [ ] Basic game UI (reuse existing board component)
- [ ] Guest ID generation (`localStorage`)
- [ ] Deploy PartyKit server

**Deliverable:** Share a link → friend joins → play chess.

### Phase 2: Lobby & Matchmaking (2-3 days)

**Goal:** Find opponents without sharing links.

- [ ] Implement `LobbyServer` party:
  - List open games (public)
  - Player presence (who's online)
  - Quick match (auto-pair two seekers)
- [ ] Lobby UI:
  - See available games
  - Create game with time control options
  - "Quick Match" button
- [ ] Time controls:
  - Bullet (1+0), Blitz (3+2, 5+0), Rapid (10+0, 15+10)
  - Server-side clock enforcement
  - Flag (timeout) detection
- [ ] Player names (choose on first visit)

**Deliverable:** Full lobby experience with time controls.

### Phase 3: Polish & Resilience (2-3 days)

**Goal:** Production-quality multiplayer experience.

- [ ] Reconnection handling:
  - Detect disconnect, show "Opponent disconnected" with countdown
  - Auto-reconnect with state sync
  - Forfeit after 60s disconnect
- [ ] Spectating:
  - Join game as spectator via link
  - Spectator count display
  - Spectators see live moves but can't interact
- [ ] In-game features:
  - Resign button
  - Draw offer/accept/decline
  - Rematch proposal
  - Simple chat (optional, low priority)
- [ ] Game over improvements:
  - Result display with PGN download
  - Rematch flow

**Deliverable:** Robust multiplayer with spectating and reconnection.

### Phase 4: Future Enhancements (Optional)

- [ ] ELO rating system (stored in Durable Object storage)
- [ ] Game history (list of past games per guest ID)
- [ ] OAuth accounts (GitHub/Google) for cross-device rating
- [ ] Tournaments (bracket-style)
- [ ] Analysis board integration (review completed online games)
- [ ] Challenge-a-friend by name

---

## PartyKit Server Structure

```
server/
├── package.json
├── partykit.json          # PartyKit config
├── src/
│   ├── game-server.ts     # Game room logic
│   ├── lobby-server.ts    # Lobby/matchmaking logic
│   ├── types.ts           # Shared types
│   └── validation.ts      # chess.js wrapper for move validation
└── tsconfig.json
```

**partykit.json:**
```json
{
  "name": "chess-ai-multiplayer",
  "main": "src/game-server.ts",
  "parties": {
    "lobby": "src/lobby-server.ts"
  }
}
```

**Game Server skeleton:**
```typescript
import type * as Party from "partykit/server";
import { Chess } from "chess.js";

export default class GameServer implements Party.Server {
  chess: Chess;
  gameState: GameRoom;

  constructor(readonly room: Party.Room) {
    this.chess = new Chess();
    this.gameState = this.initGameState();
  }

  async onConnect(conn: Party.Connection) {
    // Assign player color or spectator role
    // Send current game state
  }

  async onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message);
    switch (msg.type) {
      case "move":
        this.handleMove(msg, sender);
        break;
      case "resign":
        this.handleResign(sender);
        break;
      // ...
    }
  }

  handleMove(msg: MoveMessage, sender: Party.Connection) {
    // 1. Verify it's sender's turn
    // 2. Validate move with chess.js
    // 3. Update state
    // 4. Broadcast to all connections
    // 5. Persist to storage
    const result = this.chess.move({ from: msg.from, to: msg.to, promotion: msg.promotion });
    if (!result) {
      sender.send(JSON.stringify({ type: "invalid_move", reason: "Illegal move" }));
      return;
    }
    this.room.broadcast(JSON.stringify({
      type: "move_made",
      move: result,
      fen: this.chess.fen(),
      // ... clocks
    }));
  }

  async onClose(conn: Party.Connection) {
    // Handle disconnection, start reconnect timer
  }
}
```

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **PartyKit goes away / changes pricing** | Low | High | Can self-deploy to own Cloudflare account (PartyKit is open source and CF Durable Objects are stable). Migration path exists. |
| **Cheating (engine-assisted play)** | Medium | Medium | Server validates moves (prevents illegal moves). Engine cheating is hard to detect even on Lichess — out of scope for hobby project. Accept it. |
| **Clock desync** | Medium | Low | Server is authoritative for clocks. Client displays are cosmetic. Server timestamps every move. |
| **Reconnection edge cases** | Medium | Medium | 60-second grace period. On reconnect, server sends full game state. If both disconnect, game is abandoned after 5 min. |
| **CORS / mixed content** | Low | Low | PartyKit serves over WSS by default. Configure CORS in Party server. |
| **Free tier limits exceeded** | Very Low | Low | 100K req/day supports ~1,250 games/day. If hit, either pay ($5/mo) or deploy to own CF account. |
| **Durable Object cold starts** | Low | Low | First connection to a room may have ~50-100ms cold start. Negligible for chess. |
| **Lobby stale state** | Medium | Low | Use PartyKit's `onClose` to clean up disconnected players. Periodic cleanup of abandoned games. |

---

## Key Design Decisions

1. **Server-side move validation (not client-only):** Prevents cheating and state desync. The server is the source of truth.

2. **Separate lobby and game servers:** Clean separation of concerns. Lobby handles discovery; game handles gameplay. Different scaling characteristics.

3. **Anonymous-first auth:** Matches the existing app's zero-friction philosophy. No accounts required ever.

4. **PartyKit over Supabase:** While Supabase offers more features (DB, auth), it's overkill. PartyKit is purpose-built for exactly this use case — real-time multiplayer rooms.

5. **Shareable links as primary invite mechanism:** `https://chess-ai.app/play/abc123` — simple, works everywhere, no friend system needed.

6. **Time controls on server:** Server tracks and enforces clocks to prevent client-side manipulation. Client shows a ticking display synced from server timestamps.

---

## References

- [PartyKit Docs](https://docs.partykit.io/)
- [PartyKit GitHub](https://github.com/partykit/partykit)
- [chess.js](https://github.com/jhlywa/chess.js) — already used in the project
- [Cloudflare Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Azure Web PubSub pricing](https://azure.microsoft.com/en-us/pricing/details/web-pubsub/)
