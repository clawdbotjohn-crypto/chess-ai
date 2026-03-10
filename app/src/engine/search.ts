/**
 * Minimax Search with Alpha-Beta Pruning (chess-movegen-js version)
 *
 * Uses chess-movegen-js Board for fast move generation and board manipulation.
 * chess.js is only used once at root to convert the best move to SAN.
 *
 * Performance optimizations:
 * - chess-movegen-js: ~700K NPS vs chess.js ~500 NPS
 * - Zobrist hashing for transposition table (adapted for 0x88)
 * - Iterative deepening (warms TT for deeper searches)
 * - Late Move Reductions (LMR)
 * - MVV-LVA move ordering
 */

import { Chess } from 'chess.js';
import BoardModule from 'chess-movegen-js';
import type { CMMove } from 'chess-movegen-js';
import { evaluate } from './evaluate';
import type { EvaluationConfig } from './types';

const { Board } = BoardModule;

const DEFAULT_DEPTH = 4;
const MAX_QUIESCE_DEPTH = 8;
const TT_MAX_ENTRIES = 1_000_000;

// ── Zobrist Hashing (0x88 adapted) ────────────────────────

function makeRng(seed: number) {
  let s = BigInt(seed) | 1n;
  return (): [number, number] => {
    s ^= s >> 12n;
    s ^= s << 25n;
    s ^= s >> 27n;
    const v = BigInt.asUintN(64, s * 0x2545F4914F6CDD1Dn);
    return [Number(v >> 32n) >>> 0, Number(v & 0xFFFFFFFFn) >>> 0];
  };
}

const rng = makeRng(0xDEADBEEF);

// pieceKeys[color][pieceType 0-5][0x88_square]
const pieceKeys: [number, number][][][] = [];
for (let c = 0; c < 2; c++) {
  pieceKeys[c] = [];
  for (let pt = 0; pt < 6; pt++) {
    pieceKeys[c][pt] = [];
    for (let sq = 0; sq < 128; sq++) {
      pieceKeys[c][pt][sq] = rng();
    }
  }
}

const sideKey = rng();
const castlingKeys: [number, number][] = [];
for (let i = 0; i < 4; i++) castlingKeys.push(rng());
const epKeys: [number, number][] = [];
for (let i = 0; i < 8; i++) epKeys.push(rng());

function xor(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] ^ b[0]) >>> 0, (a[1] ^ b[1]) >>> 0];
}

/** Compute full Zobrist hash from a Board position */
function computeHash(board: InstanceType<typeof Board>): [number, number] {
  let h: [number, number] = [0, 0];

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const piece = board.pieceat[sq];
    if (piece === 0) continue;
    const color = (piece & 8) >>> 3;
    const type = (piece & 7) - 1; // 0-5 index
    h = xor(h, pieceKeys[color][type][sq]);
  }

  if (board.stm === 1) h = xor(h, sideKey);

  const cr = board.castlingRights;
  if (cr & 1) h = xor(h, castlingKeys[0]);
  if (cr & 2) h = xor(h, castlingKeys[1]);
  if (cr & 4) h = xor(h, castlingKeys[2]);
  if (cr & 8) h = xor(h, castlingKeys[3]);

  if (board.enpassantSquare >= 0) {
    h = xor(h, epKeys[board.enpassantSquare & 7]);
  }

  return h;
}

// ── Transposition Table ────────────────────────────────────

interface TTEntry {
  depth: number;
  eval: number;
  flag: 'exact' | 'lower' | 'upper';
  bestFrom?: number;
  bestTo?: number;
  bestPromo?: number;
}

let transpositionTable = new Map<string, TTEntry>();

function ttKey(h: [number, number]): string {
  return `${h[0].toString(16)}_${h[1].toString(16)}`;
}

function ttStore(key: string, entry: TTEntry): void {
  if (transpositionTable.size >= TT_MAX_ENTRIES && !transpositionTable.has(key)) {
    const entries = [...transpositionTable.entries()];
    transpositionTable.clear();
    entries.sort((a, b) => b[1].depth - a[1].depth);
    const keep = entries.slice(0, entries.length >> 1);
    for (const [k, v] of keep) transpositionTable.set(k, v);
  }
  transpositionTable.set(key, entry);
}

// ── Search State ───────────────────────────────────────────

interface SearchResult {
  move: string;
  evaluation: number;
  nodes: number;
  timeMs: number;
}

let nodesSearched = 0;

// Victim values for MVV-LVA ordering by piece type (index = piece & 7)
const CAPTURE_VICTIM_VALUE = [0, 1, 3, 3, 5, 9, 0]; // empty, p, n, b, r, q, k

// ── Move Ordering ──────────────────────────────────────────

function orderMoves(moves: CMMove[], ttEntry?: TTEntry): void {
  const ttFrom = ttEntry?.bestFrom;
  const ttTo = ttEntry?.bestTo;
  const ttPromo = ttEntry?.bestPromo;

  moves.sort((a, b) => {
    // PV move first
    if (ttFrom !== undefined && ttTo !== undefined) {
      const aIsPV = a.from === ttFrom && a.to === ttTo && (ttPromo === undefined || a.promotedpiece === ttPromo);
      const bIsPV = b.from === ttFrom && b.to === ttTo && (ttPromo === undefined || b.promotedpiece === ttPromo);
      if (aIsPV) return -1;
      if (bIsPV) return 1;
    }

    let sa = 0, sb = 0;
    if (a.captured) sa += 10 * CAPTURE_VICTIM_VALUE[a.captured & 7];
    if (b.captured) sb += 10 * CAPTURE_VICTIM_VALUE[b.captured & 7];
    if (a.promotedpiece) sa += 8;
    if (b.promotedpiece) sb += 8;
    return sb - sa;
  });
}

// ── Quiescence Search ──────────────────────────────────────
// board.generateMoves() has ALREADY been called for the current position.
// We must call it again after each makemove.

function quiesce(
  board: InstanceType<typeof Board>,
  _hash: [number, number],
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  config: EvaluationConfig,
  ply: number,
  depth: number = 0,
): number {
  nodesSearched++;

  // CRITICAL: Check terminal positions FIRST, before standPat cutoffs.
  // Without this, a checkmate position can return a wrong standPat value
  // (normal material eval instead of mate score) via an early cutoff,
  // causing the engine to miss forced mates.
  const allMoves = board.moves;

  if (allMoves.length === 0) {
    return evaluate(board, config, { legalMoveCount: 0, isTerminal: true, ply });
  }

  const standPat = evaluate(board, config, { skipMobility: true, ply });

  if (depth >= MAX_QUIESCE_DEPTH) return standPat;

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  // Filter and sort captures
  const captures: CMMove[] = [];
  for (let i = 0; i < allMoves.length; i++) {
    if (allMoves[i].captured) captures.push(allMoves[i]);
  }
  if (captures.length === 0) return isMaximizing ? alpha : beta;

  captures.sort((a, b) => {
    return CAPTURE_VICTIM_VALUE[b.captured & 7] - CAPTURE_VICTIM_VALUE[a.captured & 7];
  });

  if (isMaximizing) {
    for (let i = 0; i < captures.length; i++) {
      board.makemove(captures[i]);
      board.generateMoves();
      const childHash = computeHash(board);
      const eval_ = quiesce(board, childHash, alpha, beta, false, config, ply + 1, depth + 1);
      board.undomove();
      if (eval_ > alpha) alpha = eval_;
      if (beta <= alpha) break;
    }
    return alpha;
  } else {
    for (let i = 0; i < captures.length; i++) {
      board.makemove(captures[i]);
      board.generateMoves();
      const childHash = computeHash(board);
      const eval_ = quiesce(board, childHash, alpha, beta, true, config, ply + 1, depth + 1);
      board.undomove();
      if (eval_ < beta) beta = eval_;
      if (beta <= alpha) break;
    }
    return beta;
  }
}

// ── Minimax ────────────────────────────────────────────────
// Contract: board.generateMoves() has ALREADY been called for the current position.
// The hash for the current position is passed as a parameter.

function minimax(
  board: InstanceType<typeof Board>,
  hash: [number, number],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  config: EvaluationConfig,
  ply: number,
): number {
  nodesSearched++;

  if (depth === 0) {
    return quiesce(board, hash, alpha, beta, isMaximizing, config, ply);
  }

  // TT lookup
  const posKey = ttKey(hash);
  const ttEntry = transpositionTable.get(posKey);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') return ttEntry.eval;
    if (ttEntry.flag === 'lower' && ttEntry.eval >= beta) return beta;
    if (ttEntry.flag === 'upper' && ttEntry.eval <= alpha) return alpha;
  }

  const origAlpha = alpha;
  const origBeta = beta;
  const inCheck = board.inCheck;

  // Copy moves since makemove+generateMoves overwrites board.moves
  const moves = board.moves.slice();

  if (moves.length === 0) {
    return evaluate(board, config, { legalMoveCount: 0, isTerminal: true, ply });
  }

  orderMoves(moves, ttEntry);

  if (isMaximizing) {
    let maxEval = -Infinity;
    let bestFrom = moves[0].from;
    let bestTo = moves[0].to;
    let bestPromo = moves[0].promotedpiece;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      board.makemove(move);
      board.generateMoves();
      const childHash = computeHash(board);

      let eval_: number;

      // LMR
      if (i >= 3 && depth >= 3 && !move.captured && !move.promotedpiece && !inCheck) {
        eval_ = minimax(board, childHash, depth - 2, alpha, beta, false, config, ply + 1);
        if (eval_ > alpha) {
          // Re-search at full depth — must regenerate moves since recursion left them stale
          board.generateMoves();
          eval_ = minimax(board, childHash, depth - 1, alpha, beta, false, config, ply + 1);
        }
      } else {
        eval_ = minimax(board, childHash, depth - 1, alpha, beta, false, config, ply + 1);
      }

      board.undomove();

      if (eval_ > maxEval) {
        maxEval = eval_;
        bestFrom = move.from;
        bestTo = move.to;
        bestPromo = move.promotedpiece;
      }
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }

    let flag: TTEntry['flag'];
    if (maxEval <= origAlpha) flag = 'upper';
    else if (maxEval >= beta) flag = 'lower';
    else flag = 'exact';
    ttStore(posKey, { depth, eval: maxEval, flag, bestFrom, bestTo, bestPromo });

    return maxEval;
  } else {
    let minEval = Infinity;
    let bestFrom = moves[0].from;
    let bestTo = moves[0].to;
    let bestPromo = moves[0].promotedpiece;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      board.makemove(move);
      board.generateMoves();
      const childHash = computeHash(board);

      let eval_: number;

      // LMR
      if (i >= 3 && depth >= 3 && !move.captured && !move.promotedpiece && !inCheck) {
        eval_ = minimax(board, childHash, depth - 2, alpha, beta, true, config, ply + 1);
        if (eval_ < beta) {
          board.generateMoves();
          eval_ = minimax(board, childHash, depth - 1, alpha, beta, true, config, ply + 1);
        }
      } else {
        eval_ = minimax(board, childHash, depth - 1, alpha, beta, true, config, ply + 1);
      }

      board.undomove();

      if (eval_ < minEval) {
        minEval = eval_;
        bestFrom = move.from;
        bestTo = move.to;
        bestPromo = move.promotedpiece;
      }
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }

    let flag: TTEntry['flag'];
    if (minEval >= origBeta) flag = 'lower';
    else if (minEval <= alpha) flag = 'upper';
    else flag = 'exact';
    ttStore(posKey, { depth, eval: minEval, flag, bestFrom, bestTo, bestPromo });

    return minEval;
  }
}

// ── Helper: convert 0x88 move to SAN via chess.js ──────────

function moveToSan(fen: string, move: CMMove): string {
  const game = new Chess(fen);
  const fromAlg = String.fromCharCode(97 + (move.from & 7)) + String(1 + (move.from >>> 4));
  const toAlg = String.fromCharCode(97 + (move.to & 7)) + String(1 + (move.to >>> 4));
  const promoMap = ['', 'p', 'n', 'b', 'r', 'q'];
  const promo = move.promotedpiece ? promoMap[move.promotedpiece & 7] : undefined;
  const result = game.move({ from: fromAlg, to: toAlg, promotion: promo });
  return result ? result.san : '';
}

// ── Public API ─────────────────────────────────────────────

/** Quick static evaluation of a FEN position (no search, just eval). Returns centipawns from white's perspective. */
export function quickEval(fen: string, config: EvaluationConfig): number {
  const board = new Board();
  board.loadFEN(fen);
  board.generateMoves();
  return evaluate(board, config, { legalMoveCount: board.moves.length });
}

/** Progress info emitted after each iterative deepening level */
export interface SearchProgress {
  depth: number;
  maxDepth: number;
  eval: number;
  bestMove: string;
  nodes: number;
  timeMs: number;
}

export function findBestMove(
  fen: string,
  config: EvaluationConfig,
  onProgress?: (info: SearchProgress) => void,
): SearchResult {
  const t0 = performance.now();
  nodesSearched = 0;
  transpositionTable.clear();

  const board = new Board();
  board.loadFEN(fen);
  board.generateMoves();

  const isWhite = board.stm === 0;
  const rootHash = computeHash(board);
  void rootHash; // used conceptually; root iterative deepening computes child hashes
  const rootMoves = board.moves.slice();

  if (rootMoves.length === 0) {
    return { move: '', evaluation: 0, nodes: 0, timeMs: performance.now() - t0 };
  }

  // Mate-in-1 pre-check: scan all moves for immediate checkmate
  // This is a safety net to guarantee mate-in-1 is never missed
  const mateMoves: CMMove[] = [];
  for (const move of rootMoves) {
    board.makemove(move);
    board.generateMoves();
    if (board.moves.length === 0 && board.inCheck) {
      mateMoves.push(move);
    }
    board.undomove();
  }
  // Regenerate moves after undo loop
  board.generateMoves();

  if (mateMoves.length > 0) {
    // Found checkmate(s) — pick one (use randomness threshold if multiple)
    const chosen = mateMoves.length === 1 ? mateMoves[0] :
      mateMoves[Math.floor(Math.random() * mateMoves.length)];
    const mateEval = isWhite ? 99999 : -99999;
    const san = moveToSan(fen, chosen);
    return { move: san, evaluation: mateEval, nodes: nodesSearched, timeMs: performance.now() - t0 };
  }

  if (rootMoves.length === 1) {
    board.makemove(rootMoves[0]);
    board.generateMoves();
    const eval_ = evaluate(board, config);
    board.undomove();
    const san = moveToSan(fen, rootMoves[0]);
    return { move: san, evaluation: eval_, nodes: nodesSearched, timeMs: performance.now() - t0 };
  }

  const maxDepth = config.search?.depth ?? DEFAULT_DEPTH;

  let bestMoveFromPrev: CMMove | undefined;
  let finalScored: { move: CMMove; eval: number }[] = [];

  for (let d = 1; d <= maxDepth; d++) {
    const scored: { move: CMMove; eval: number }[] = [];

    // Re-generate root moves
    board.generateMoves();
    const moves = board.moves.slice();

    // Order with PV from previous iteration
    const pvEntry: TTEntry | undefined = bestMoveFromPrev
      ? { depth: 0, eval: 0, flag: 'exact', bestFrom: bestMoveFromPrev.from, bestTo: bestMoveFromPrev.to, bestPromo: bestMoveFromPrev.promotedpiece }
      : undefined;
    orderMoves(moves, pvEntry);

    for (const move of moves) {
      board.makemove(move);
      board.generateMoves();
      const childHash = computeHash(board);

      const eval_ = minimax(board, childHash, d - 1, -Infinity, Infinity, !isWhite, config, 1);

      board.undomove();

      scored.push({ move, eval: eval_ });
    }

    if (isWhite) {
      scored.sort((a, b) => b.eval - a.eval);
    } else {
      scored.sort((a, b) => a.eval - b.eval);
    }

    bestMoveFromPrev = scored[0].move;
    finalScored = scored;

    // Emit progress after each iterative deepening level
    if (onProgress) {
      const bestSan = moveToSan(fen, scored[0].move);
      onProgress({
        depth: d,
        maxDepth: maxDepth,
        eval: scored[0].eval,
        bestMove: bestSan,
        nodes: nodesSearched,
        timeMs: performance.now() - t0,
      });
    }
  }

  const bestEval = finalScored[0].eval;
  const threshold = config.randomness.threshold;
  const timeMs = performance.now() - t0;

  let chosen: { move: CMMove; eval: number };
  if (threshold > 0) {
    const candidates = finalScored.filter(
      s => Math.abs(s.eval - bestEval) <= threshold
    );
    chosen = candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    chosen = finalScored[0];
  }

  const san = moveToSan(fen, chosen.move);
  return { move: san, evaluation: chosen.eval, nodes: nodesSearched, timeMs };
}

/** Quick check: does the current side to move have a mate-in-1? */
export function hasMateIn1(fen: string): boolean {
  const board = new Board();
  board.loadFEN(fen);
  board.generateMoves();
  const moves = board.moves.slice();
  for (const move of moves) {
    board.makemove(move);
    board.generateMoves();
    if (board.moves.length === 0 && board.inCheck) {
      board.undomove();
      return true;
    }
    board.undomove();
    board.generateMoves(); // regenerate after undo
  }
  return false;
}
