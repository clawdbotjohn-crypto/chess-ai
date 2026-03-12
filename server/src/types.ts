// ============================================================
// types.ts — Shared types for Chess AI Multiplayer Protocol
// ============================================================

// --- Core domain types ---

export interface Player {
  id: string;
  name: string;
  connectedAt: number;
  rating?: number;
}

export interface TimeControl {
  initialMs: number;
  incrementMs: number;
}

export interface MoveRecord {
  from: string;
  to: string;
  san: string;
  fen: string;
  timestamp: number;
  promotion?: string;
}

export type GameStatus = "waiting" | "active" | "completed" | "abandoned";
export type GameResult = "1-0" | "0-1" | "1/2-1/2" | null;
export type GameEndReason =
  | "checkmate"
  | "stalemate"
  | "resignation"
  | "timeout"
  | "draw_agreement"
  | "insufficient_material"
  | "threefold_repetition"
  | "fifty_move_rule"
  | "abandonment";

export type PlayerColor = "white" | "black";

export interface GameRoom {
  id: string;
  status: GameStatus;

  white: Player | null;
  black: Player | null;
  spectators: Player[];

  fen: string;
  pgn: string;
  moves: MoveRecord[];
  result: GameResult;
  endReason: GameEndReason | null;

  timeControl: TimeControl | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: number;

  createdAt: number;
  createdBy: string;
  isPrivate: boolean;
}

// --- WebSocket message types ---

// Client → Server messages

export interface JoinMessage {
  type: "join";
  name: string;
  playerId?: string; // reconnect with existing ID
}

export interface LeaveMessage {
  type: "leave";
}

export interface MoveMessage {
  type: "move";
  from: string;
  to: string;
  promotion?: string;
}

export interface ResignMessage {
  type: "resign";
}

export interface OfferDrawMessage {
  type: "offer_draw";
}

export interface AcceptDrawMessage {
  type: "accept_draw";
}

export interface DeclineDrawMessage {
  type: "decline_draw";
}

export interface RematchMessage {
  type: "rematch";
}

export interface ChatMessage {
  type: "chat";
  text: string;
}

export type ClientMessage =
  | JoinMessage
  | LeaveMessage
  | MoveMessage
  | ResignMessage
  | OfferDrawMessage
  | AcceptDrawMessage
  | DeclineDrawMessage
  | RematchMessage
  | ChatMessage;

// Server → Client messages

export interface WelcomeMessage {
  type: "welcome";
  playerId: string;
  color: PlayerColor | "spectator";
  gameState: GameRoom;
}

export interface ErrorMessage {
  type: "error";
  message: string;
  code: string;
}

export interface GameStartMessage {
  type: "game_start";
  white: Player;
  black: Player;
  fen: string;
}

export interface GameEndMessage {
  type: "game_end";
  result: string;
  reason: GameEndReason;
  fen: string;
  pgn: string;
}

export interface MoveMadeMessage {
  type: "move_made";
  move: MoveRecord;
  fen: string;
  pgn: string;
  whiteTimeMs: number;
  blackTimeMs: number;
}

export interface InvalidMoveMessage {
  type: "invalid_move";
  reason: string;
}

export interface StateSyncMessage {
  type: "state_sync";
  gameState: GameRoom;
}

export interface DrawOfferedMessage {
  type: "draw_offered";
  by: PlayerColor;
}

export interface DrawDeclinedMessage {
  type: "draw_declined";
}

export interface OpponentConnectedMessage {
  type: "opponent_connected";
}

export interface OpponentDisconnectedMessage {
  type: "opponent_disconnected";
  reconnectTimeoutSec: number;
}

export interface OpponentReconnectedMessage {
  type: "opponent_reconnected";
}

export interface SpectatorCountMessage {
  type: "spectator_count";
  count: number;
}

export interface ChatBroadcastMessage {
  type: "chat_message";
  from: string;
  text: string;
  timestamp: number;
}

export type ServerMessage =
  | WelcomeMessage
  | ErrorMessage
  | GameStartMessage
  | GameEndMessage
  | MoveMadeMessage
  | InvalidMoveMessage
  | StateSyncMessage
  | DrawOfferedMessage
  | DrawDeclinedMessage
  | OpponentConnectedMessage
  | OpponentDisconnectedMessage
  | OpponentReconnectedMessage
  | SpectatorCountMessage
  | ChatBroadcastMessage;

// --- Lobby types (Phase 2, defined here for completeness) ---

export interface GameListing {
  roomId: string;
  host: { id: string; name: string };
  timeControl: TimeControl | null;
  createdAt: number;
}

export interface LobbyState {
  openGames: GameListing[];
  activeGames: number;
}
