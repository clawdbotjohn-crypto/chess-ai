/**
 * Engine Wrapper for Node.js
 * 
 * Wraps the existing chess engine for use without web workers.
 * Handles move format conversion between SAN/chess.js and UCI (Lichess format).
 * 
 * Source engine files are imported from: ../app/src/engine/
 */

import { Chess } from 'chess.js';
import { findBestMove } from '../../app/src/engine/search.js';
import { getBookMove } from '../../app/src/engine/openingBook.js';
import type { EvaluationConfig } from '../../app/src/engine/types.js';

export interface EngineResult {
  /** UCI move string (e.g., "e2e4", "e7e8q") */
  uciMove: string;
  /** SAN move string (e.g., "e4", "Nf3") */
  sanMove: string;
  /** Evaluation in centipawns from white's perspective */
  evaluation: number;
  /** Number of nodes searched */
  nodes: number;
  /** Time spent in milliseconds */
  timeMs: number;
  /** Whether this was a book move */
  isBookMove: boolean;
}

/**
 * Convert a SAN move to UCI long algebraic format.
 * Uses chess.js to parse the SAN move and extract from/to squares.
 */
function sanToUci(fen: string, san: string): string {
  const game = new Chess(fen);
  const move = game.move(san);
  if (!move) {
    throw new Error(`Invalid SAN move "${san}" for position ${fen}`);
  }
  let uci = move.from + move.to;
  if (move.promotion) {
    uci += move.promotion;
  }
  return uci;
}

/**
 * Apply a list of UCI moves to get the resulting FEN.
 */
export function uciMovesToFen(initialFen: string, uciMoves: string[]): string {
  const game = new Chess(initialFen === 'startpos' ? undefined : initialFen);
  for (const uci of uciMoves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const result = game.move({ from, to, promotion });
    if (!result) {
      throw new Error(`Failed to apply UCI move "${uci}" to position ${game.fen()}`);
    }
  }
  return game.fen();
}

/**
 * Get the best move for a position.
 * Checks opening book first, then falls back to search.
 */
export function getBestMove(
  fen: string,
  config: EvaluationConfig,
  openingBookEnabled: boolean = true,
): EngineResult {
  const t0 = performance.now();

  // Try opening book first
  if (openingBookEnabled && config.openingBookEnabled !== false) {
    const bookMove = getBookMove(fen, config.randomness.threshold);
    if (bookMove) {
      const uci = sanToUci(fen, bookMove);
      return {
        uciMove: uci,
        sanMove: bookMove,
        evaluation: 0,
        nodes: 0,
        timeMs: performance.now() - t0,
        isBookMove: true,
      };
    }
  }

  // Run the engine search
  const result = findBestMove(fen, config, (progress) => {
    // Log search progress
    process.stdout.write(
      `\r  depth ${progress.depth}/${progress.maxDepth} | ` +
      `eval ${(progress.eval / 100).toFixed(2)} | ` +
      `${progress.bestMove} | ` +
      `${progress.nodes} nodes | ` +
      `${progress.timeMs.toFixed(0)}ms`
    );
  });

  process.stdout.write('\n');

  if (!result.move) {
    throw new Error(`Engine returned no move for position ${fen}`);
  }

  const uci = sanToUci(fen, result.move);

  return {
    uciMove: uci,
    sanMove: result.move,
    evaluation: result.evaluation,
    nodes: result.nodes,
    timeMs: result.timeMs,
    isBookMove: false,
  };
}
