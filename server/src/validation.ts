// ============================================================
// validation.ts — chess.js move validation wrapper
// ============================================================

import { Chess, type Move } from "chess.js";

export interface ValidationResult {
  valid: true;
  move: Move;
  fen: string;
  pgn: string;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isCheck: boolean;
  isGameOver: boolean;
  isInsufficientMaterial: boolean;
  isThreefoldRepetition: boolean;
}

export interface ValidationError {
  valid: false;
  reason: string;
}

export type MoveValidation = ValidationResult | ValidationError;

/**
 * Validate a move against the given FEN position.
 * Returns the result including new FEN/PGN and game-end flags, or an error.
 */
export function validateMove(
  fen: string,
  from: string,
  to: string,
  promotion?: string,
): MoveValidation {
  const chess = new Chess(fen);

  try {
    const move = chess.move({ from, to, promotion });
    if (!move) {
      return { valid: false, reason: "Illegal move" };
    }

    return {
      valid: true,
      move,
      fen: chess.fen(),
      pgn: chess.pgn(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isCheck: chess.isCheck(),
      isGameOver: chess.isGameOver(),
      isInsufficientMaterial: chess.isInsufficientMaterial(),
      isThreefoldRepetition: chess.isThreefoldRepetition(),
    };
  } catch {
    return { valid: false, reason: "Invalid move format" };
  }
}

/**
 * Determine whose turn it is from a FEN string.
 * Returns "white" or "black".
 */
export function getTurnFromFen(fen: string): "white" | "black" {
  const parts = fen.split(" ");
  return parts[1] === "w" ? "white" : "black";
}

/**
 * Get the game-over reason from the current position.
 */
export function getGameEndReason(
  fen: string,
): "checkmate" | "stalemate" | "insufficient_material" | "threefold_repetition" | "fifty_move_rule" | null {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient_material";
  if (chess.isThreefoldRepetition()) return "threefold_repetition";

  // Fifty-move rule: half-move clock is in FEN field 5 (0-indexed: 4)
  const halfMoveClock = parseInt(fen.split(" ")[4] ?? "0", 10);
  if (halfMoveClock >= 100) return "fifty_move_rule";

  return null;
}
