// ============================================================
// game-server.ts — PartyKit Game Server (Phase 1)
// ============================================================
//
// Each PartyKit "room" is one chess game. This server handles:
// - Player assignment (white/black/spectator)
// - Move validation via chess.js
// - Game state broadcast
// - Disconnect/reconnect with 60s grace period
// - Persistence to Durable Object storage
//

import type * as Party from "partykit/server";
import { Chess } from "chess.js";
import { validateMove, getTurnFromFen } from "./validation";
import type {
  ClientMessage,
  GameRoom,
  MoveRecord,
  Player,
  PlayerColor,
  GameEndReason,
  ServerMessage,
} from "./types";

// ---- Constants ----

const RECONNECT_TIMEOUT_SEC = 60;
const STORAGE_KEY = "gameState";

// ---- Helpers ----

function send(conn: Party.Connection, msg: ServerMessage): void {
  conn.send(JSON.stringify(msg));
}

function generatePlayerId(): string {
  return crypto.randomUUID();
}

function createInitialGameRoom(roomId: string): GameRoom {
  return {
    id: roomId,
    status: "waiting",
    white: null,
    black: null,
    spectators: [],
    fen: new Chess().fen(),
    pgn: "",
    moves: [],
    result: null,
    endReason: null,
    timeControl: null,
    whiteTimeMs: 0,
    blackTimeMs: 0,
    lastMoveAt: 0,
    createdAt: Date.now(),
    createdBy: "",
    isPrivate: false,
  };
}

// ---- Server ----

export default class GameServer implements Party.Server {
  private chess: Chess;
  private gameState: GameRoom;

  // Map connectionId → playerId
  private connectionPlayerMap: Map<string, string> = new Map();
  // Map playerId → connectionId (for reconnection lookup)
  private playerConnectionMap: Map<string, string> = new Map();
  // Disconnect timers: playerId → timer handle
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Pending draw offer: color that offered, or null
  private pendingDrawOffer: PlayerColor | null = null;

  constructor(readonly room: Party.Room) {
    this.chess = new Chess();
    this.gameState = createInitialGameRoom(room.id);
  }

  // ---- Lifecycle ----

  async onStart(): Promise<void> {
    const stored = await this.room.storage.get<GameRoom>(STORAGE_KEY);
    if (stored) {
      this.gameState = stored;
      this.chess = new Chess(stored.fen);
      // Replay PGN headers aren't needed — FEN is sufficient for validation
    }
  }

  async onConnect(conn: Party.Connection): Promise<void> {
    // We don't assign a player until they send a "join" message with their name.
    // This allows reconnection with a known playerId.
    // For now, send a minimal ack — full state comes on "join".
  }

  async onMessage(message: string, sender: Party.Connection): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message as string) as ClientMessage;
    } catch {
      send(sender, { type: "error", message: "Invalid JSON", code: "PARSE_ERROR" });
      return;
    }

    switch (msg.type) {
      case "join":
        await this.handleJoin(msg.name, msg.playerId, sender);
        break;
      case "move":
        await this.handleMove(msg.from, msg.to, msg.promotion, sender);
        break;
      case "resign":
        await this.handleResign(sender);
        break;
      case "offer_draw":
        this.handleOfferDraw(sender);
        break;
      case "accept_draw":
        await this.handleAcceptDraw(sender);
        break;
      case "decline_draw":
        this.handleDeclineDraw(sender);
        break;
      case "chat":
        this.handleChat(msg.text, sender);
        break;
      default:
        send(sender, { type: "error", message: `Unknown message type`, code: "UNKNOWN_TYPE" });
    }
  }

  async onClose(conn: Party.Connection): Promise<void> {
    const playerId = this.connectionPlayerMap.get(conn.id);
    if (!playerId) return;

    // Clean up connection maps
    this.connectionPlayerMap.delete(conn.id);
    this.playerConnectionMap.delete(playerId);

    const color = this.getPlayerColor(playerId);
    if (!color) {
      // Spectator disconnected — update spectator list
      this.gameState.spectators = this.gameState.spectators.filter(s => s.id !== playerId);
      this.broadcastSpectatorCount();
      return;
    }

    // Player disconnected during an active game — start reconnect timer
    if (this.gameState.status === "active") {
      this.broadcastToAll({
        type: "opponent_disconnected",
        reconnectTimeoutSec: RECONNECT_TIMEOUT_SEC,
      }, playerId);

      const timer = setTimeout(async () => {
        this.disconnectTimers.delete(playerId);
        // Auto-forfeit: the disconnected player loses
        const result = color === "white" ? "0-1" : "1-0";
        this.gameState.status = "completed";
        this.gameState.result = result;
        this.gameState.endReason = "abandonment";
        this.broadcastToAll({
          type: "game_end",
          result,
          reason: "abandonment",
          fen: this.gameState.fen,
          pgn: this.gameState.pgn,
        });
        await this.persist();
      }, RECONNECT_TIMEOUT_SEC * 1000);

      this.disconnectTimers.set(playerId, timer);
    }
  }

  // ---- Join / Reconnection ----

  private async handleJoin(
    name: string,
    existingPlayerId: string | undefined,
    conn: Party.Connection,
  ): Promise<void> {
    // Check for reconnection
    if (existingPlayerId && this.isKnownPlayer(existingPlayerId)) {
      return this.handleReconnect(existingPlayerId, conn);
    }

    const playerId = existingPlayerId ?? generatePlayerId();

    // Register connection
    this.connectionPlayerMap.set(conn.id, playerId);
    this.playerConnectionMap.set(playerId, conn.id);

    const player: Player = {
      id: playerId,
      name,
      connectedAt: Date.now(),
    };

    // Assign role: first = white, second = black, rest = spectator
    let color: PlayerColor | "spectator";

    if (!this.gameState.white) {
      this.gameState.white = player;
      this.gameState.createdBy = playerId;
      color = "white";
    } else if (!this.gameState.black) {
      this.gameState.black = player;
      color = "black";

      // Both players present — start the game
      this.gameState.status = "active";
      this.gameState.lastMoveAt = Date.now();

      // Broadcast game start to everyone
      this.broadcastToAll({
        type: "game_start",
        white: this.gameState.white,
        black: this.gameState.black,
        fen: this.gameState.fen,
      });
    } else {
      this.gameState.spectators.push(player);
      color = "spectator";
      this.broadcastSpectatorCount();
    }

    // Send welcome with full state
    send(conn, {
      type: "welcome",
      playerId,
      color,
      gameState: this.gameState,
    });

    await this.persist();
  }

  private handleReconnect(playerId: string, conn: Party.Connection): void {
    // Cancel disconnect timer
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    // Update connection maps
    this.connectionPlayerMap.set(conn.id, playerId);
    this.playerConnectionMap.set(playerId, conn.id);

    const color = this.getPlayerColor(playerId) ?? "spectator";

    // Send full state sync
    send(conn, {
      type: "welcome",
      playerId,
      color,
      gameState: this.gameState,
    });

    // Notify others that opponent reconnected
    if (color !== "spectator") {
      this.broadcastToAll({ type: "opponent_reconnected" }, playerId);
    }
  }

  // ---- Move handling ----

  private async handleMove(
    from: string,
    to: string,
    promotion: string | undefined,
    sender: Party.Connection,
  ): Promise<void> {
    if (this.gameState.status !== "active") {
      send(sender, { type: "invalid_move", reason: "Game is not active" });
      return;
    }

    const playerId = this.connectionPlayerMap.get(sender.id);
    if (!playerId) {
      send(sender, { type: "error", message: "Not registered", code: "NOT_REGISTERED" });
      return;
    }

    const color = this.getPlayerColor(playerId);
    if (!color) {
      send(sender, { type: "invalid_move", reason: "Spectators cannot make moves" });
      return;
    }

    // Verify it's this player's turn
    const turn = getTurnFromFen(this.gameState.fen);
    if (turn !== color) {
      send(sender, { type: "invalid_move", reason: "Not your turn" });
      return;
    }

    // Validate the move
    const result = validateMove(this.gameState.fen, from, to, promotion);
    if (!result.valid) {
      send(sender, { type: "invalid_move", reason: result.reason });
      return;
    }

    // Update game state
    const now = Date.now();
    const moveRecord: MoveRecord = {
      from,
      to,
      san: result.move.san,
      fen: result.fen,
      timestamp: now,
      promotion,
    };

    this.gameState.fen = result.fen;
    this.gameState.pgn = result.pgn;
    this.gameState.moves.push(moveRecord);
    this.gameState.lastMoveAt = now;

    // Update the chess instance
    this.chess = new Chess(result.fen);

    // Clear any pending draw offer on a new move
    this.pendingDrawOffer = null;

    // Broadcast the move
    this.broadcastToAll({
      type: "move_made",
      move: moveRecord,
      fen: result.fen,
      pgn: result.pgn,
      whiteTimeMs: this.gameState.whiteTimeMs,
      blackTimeMs: this.gameState.blackTimeMs,
    });

    // Check for game end
    if (result.isGameOver) {
      let gameResult: "1-0" | "0-1" | "1/2-1/2";
      let reason: GameEndReason;

      if (result.isCheckmate) {
        // The player who just moved wins
        gameResult = color === "white" ? "1-0" : "0-1";
        reason = "checkmate";
      } else if (result.isStalemate) {
        gameResult = "1/2-1/2";
        reason = "stalemate";
      } else if (result.isInsufficientMaterial) {
        gameResult = "1/2-1/2";
        reason = "insufficient_material";
      } else if (result.isThreefoldRepetition) {
        gameResult = "1/2-1/2";
        reason = "threefold_repetition";
      } else {
        // Fifty-move rule or other draw
        gameResult = "1/2-1/2";
        reason = "fifty_move_rule";
      }

      this.gameState.status = "completed";
      this.gameState.result = gameResult;
      this.gameState.endReason = reason;

      this.broadcastToAll({
        type: "game_end",
        result: gameResult,
        reason,
        fen: this.gameState.fen,
        pgn: this.gameState.pgn,
      });
    }

    await this.persist();
  }

  // ---- Resign ----

  private async handleResign(sender: Party.Connection): Promise<void> {
    if (this.gameState.status !== "active") return;

    const playerId = this.connectionPlayerMap.get(sender.id);
    if (!playerId) return;

    const color = this.getPlayerColor(playerId);
    if (!color) return;

    const result = color === "white" ? "0-1" : "1-0";
    this.gameState.status = "completed";
    this.gameState.result = result;
    this.gameState.endReason = "resignation";

    this.broadcastToAll({
      type: "game_end",
      result,
      reason: "resignation",
      fen: this.gameState.fen,
      pgn: this.gameState.pgn,
    });

    await this.persist();
  }

  // ---- Draw ----

  private handleOfferDraw(sender: Party.Connection): void {
    if (this.gameState.status !== "active") return;

    const playerId = this.connectionPlayerMap.get(sender.id);
    if (!playerId) return;

    const color = this.getPlayerColor(playerId);
    if (!color) return;

    this.pendingDrawOffer = color;
    this.broadcastToAll({ type: "draw_offered", by: color }, playerId);
  }

  private async handleAcceptDraw(sender: Party.Connection): Promise<void> {
    if (!this.pendingDrawOffer) return;
    if (this.gameState.status !== "active") return;

    const playerId = this.connectionPlayerMap.get(sender.id);
    if (!playerId) return;

    const color = this.getPlayerColor(playerId);
    if (!color) return;

    // Can't accept your own draw offer
    if (color === this.pendingDrawOffer) return;

    this.gameState.status = "completed";
    this.gameState.result = "1/2-1/2";
    this.gameState.endReason = "draw_agreement";
    this.pendingDrawOffer = null;

    this.broadcastToAll({
      type: "game_end",
      result: "1/2-1/2",
      reason: "draw_agreement",
      fen: this.gameState.fen,
      pgn: this.gameState.pgn,
    });

    await this.persist();
  }

  private handleDeclineDraw(sender: Party.Connection): void {
    if (!this.pendingDrawOffer) return;

    const playerId = this.connectionPlayerMap.get(sender.id);
    if (!playerId) return;

    const color = this.getPlayerColor(playerId);
    if (!color || color === this.pendingDrawOffer) return;

    this.pendingDrawOffer = null;
    this.broadcastToAll({ type: "draw_declined" });
  }

  // ---- Chat ----

  private handleChat(text: string, sender: Party.Connection): void {
    const playerId = this.connectionPlayerMap.get(sender.id);
    if (!playerId) return;

    const player = this.findPlayer(playerId);
    if (!player) return;

    // Basic sanitization: trim and limit length
    const sanitized = text.trim().slice(0, 500);
    if (!sanitized) return;

    this.broadcastToAll({
      type: "chat_message",
      from: player.name,
      text: sanitized,
      timestamp: Date.now(),
    });
  }

  // ---- Helpers ----

  private getPlayerColor(playerId: string): PlayerColor | null {
    if (this.gameState.white?.id === playerId) return "white";
    if (this.gameState.black?.id === playerId) return "black";
    return null;
  }

  private isKnownPlayer(playerId: string): boolean {
    return (
      this.gameState.white?.id === playerId ||
      this.gameState.black?.id === playerId ||
      this.gameState.spectators.some(s => s.id === playerId)
    );
  }

  private findPlayer(playerId: string): Player | null {
    if (this.gameState.white?.id === playerId) return this.gameState.white;
    if (this.gameState.black?.id === playerId) return this.gameState.black;
    return this.gameState.spectators.find(s => s.id === playerId) ?? null;
  }

  /**
   * Broadcast a message to all connected clients.
   * If excludePlayerId is set, skip that player.
   */
  private broadcastToAll(msg: ServerMessage, excludePlayerId?: string): void {
    const data = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      const connPlayerId = this.connectionPlayerMap.get(conn.id);
      if (excludePlayerId && connPlayerId === excludePlayerId) continue;
      conn.send(data);
    }
  }

  private broadcastSpectatorCount(): void {
    this.broadcastToAll({
      type: "spectator_count",
      count: this.gameState.spectators.length,
    });
  }

  private async persist(): Promise<void> {
    await this.room.storage.put(STORAGE_KEY, this.gameState);
  }
}
