/**
 * Chess Position Evaluation Function (chess-movegen-js version)
 *
 * Evaluates a chess position from white's perspective in centipawns.
 * Uses 0x88 board representation from chess-movegen-js Board.
 *
 * Factors: material, positional (center control, pawn advancement, mobility),
 * king safety, and tactical considerations.
 */

import type { Board } from 'chess-movegen-js';
import type { EvaluationConfig, PositionalWeights, KingSafetyWeights, TacticalWeights } from './types';

export interface EvaluateOptions {
  /** Pre-computed legal move count (from board.moves.length after generateMoves) */
  legalMoveCount?: number;
  /** Whether the position is terminal (no legal moves) */
  isTerminal?: boolean;
  /** Skip mobility calculation entirely (saves overhead in quiescence) */
  skipMobility?: boolean;
  /** Distance from search root in plies (for distance-to-mate scoring) */
  ply?: number;
}

// Piece-square tables (from white's perspective, rank 8 = index 0, rank 1 = index 56)
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDDLEGAME_TABLE = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20,
];

const KING_ENDGAME_TABLE = [
 -50,-40,-30,-20,-20,-30,-40,-50,
 -30,-20,-10,  0,  0,-10,-20,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-30,  0,  0,  0,  0,-30,-30,
 -50,-30,-30,-30,-30,-30,-30,-50,
];

// Piece type constants matching chess-movegen-js
const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;

// PST indexed by piece type (1-6)
const PST_BY_TYPE: (number[] | null)[] = [
  null,               // 0 = empty
  PAWN_TABLE,         // 1 = pawn
  KNIGHT_TABLE,       // 2 = knight
  BISHOP_TABLE,       // 3 = bishop
  ROOK_TABLE,         // 4 = rook
  QUEEN_TABLE,        // 5 = queen
  KING_MIDDLEGAME_TABLE, // 6 = king
];

// Center squares in 0x88: d4=0x33, d5=0x43, e4=0x34, e5=0x44
const CENTER_0x88 = new Set([0x33, 0x43, 0x34, 0x44]);

// Pre-computed centrality bonus for mobility weighting.
// Inner center (d4,d5,e4,e5) = 3, extended center (c3-f6) = 1, else 0.
// Indexed by 0x88 square. Off-board squares are 0 (never accessed).
const CENTRALITY_BONUS = new Int8Array(128);
{
  // Inner center: d4(0x33), e4(0x34), d5(0x43), e5(0x44)
  CENTRALITY_BONUS[0x33] = 3;
  CENTRALITY_BONUS[0x34] = 3;
  CENTRALITY_BONUS[0x43] = 3;
  CENTRALITY_BONUS[0x44] = 3;
  // Extended center: c3-f6 minus inner center
  const extendedCenter = [
    0x22, 0x23, 0x24, 0x25, // c3,d3,e3,f3
    0x32, 0x35,             // c4,f4 (d4,e4 already inner)
    0x42, 0x45,             // c5,f5 (d5,e5 already inner)
    0x52, 0x53, 0x54, 0x55, // c6,d6,e6,f6
  ];
  for (const sq of extendedCenter) {
    CENTRALITY_BONUS[sq] = 1;
  }
}

// --- Attack/Defense computation using 0x88 geometry ---
const KNIGHT_OFFSETS = [-33, -31, -18, -14, 14, 18, 31, 33];
const BISHOP_DIRS = [-17, -15, 15, 17];
const ROOK_DIRS = [-16, -1, 1, 16];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

/**
 * Compute attack and defense scores for both sides.
 * Attack: sum of (targetValue * 0.05 * attackWeight) for each enemy piece attacked
 * Defense: sum of (defendedValue * 0.03 * defenseWeight) for each friendly piece defended
 * Returns net score from white's perspective.
 */
function computeAttackDefense(board: Board, config: EvaluationConfig): number {
  const aw = config.tactical.attackWeight;
  const dw = config.tactical.defenseWeight;
  if (aw === 0 && dw === 0) return 0;

  let netScore = 0;

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const piece = board.pieceat[sq];
    if (piece === 0) continue;

    const color = (piece & 8) >>> 3; // 0=white, 1=black
    const type = piece & 7;
    const sign = color === 0 ? 1 : -1;

    // Get squares this piece attacks
    const targets = getAttackedSquares(board, sq, type, color);

    for (const tSq of targets) {
      const target = board.pieceat[tSq];
      if (target === 0) continue;
      const tColor = (target & 8) >>> 3;
      const tType = target & 7;
      const tValue = getPieceValue(tType, config);

      if (tColor !== color && aw > 0) {
        // Attacking enemy piece: 5% of target value * weight
        netScore += sign * tValue * 0.05 * (aw / 10);
      } else if (tColor === color && dw > 0 && tType !== K) {
        // Defending friendly piece: 3% of defended value * weight
        netScore += sign * tValue * 0.03 * (dw / 10);
      }
    }
  }

  return netScore;
}

function getAttackedSquares(board: Board, sq: number, type: number, _color: number): number[] {
  const results: number[] = [];

  if (type === P) {
    // Pawns attack diagonally forward
    const dir = _color === 0 ? 1 : -1;
    const left = sq + dir * 16 - 1;
    const right = sq + dir * 16 + 1;
    if (!(left & 0x88)) results.push(left);
    if (!(right & 0x88)) results.push(right);
  } else if (type === N) {
    for (const off of KNIGHT_OFFSETS) {
      const to = sq + off;
      if (!(to & 0x88)) results.push(to);
    }
  } else if (type === B) {
    for (const dir of BISHOP_DIRS) {
      for (let to = sq + dir; !(to & 0x88); to += dir) {
        results.push(to);
        if (board.pieceat[to] !== 0) break;
      }
    }
  } else if (type === R) {
    for (const dir of ROOK_DIRS) {
      for (let to = sq + dir; !(to & 0x88); to += dir) {
        results.push(to);
        if (board.pieceat[to] !== 0) break;
      }
    }
  } else if (type === Q) {
    for (const dir of QUEEN_DIRS) {
      for (let to = sq + dir; !(to & 0x88); to += dir) {
        results.push(to);
        if (board.pieceat[to] !== 0) break;
      }
    }
  } else if (type === K) {
    for (const dir of QUEEN_DIRS) {
      const to = sq + dir;
      if (!(to & 0x88)) results.push(to);
    }
  }

  return results;
}

function getPieceValue(pieceType: number, config: EvaluationConfig): number {
  switch (pieceType) {
    case P: return config.pieceValues.pawn;
    case N: return config.pieceValues.knight;
    case B: return config.pieceValues.bishop;
    case R: return config.pieceValues.rook;
    case Q: return config.pieceValues.queen;
    default: return 0;
  }
}

/**
 * Resolve phase-blended evaluation config.
 * phase: 1.0 = all pieces (opening), 0.0 = bare kings (endgame).
 * Opening blend ramps from 0→1 as phase goes 0.5→0.8.
 * Endgame blend ramps from 0→1 as phase goes 0.5→0.2.
 * Middlegame (phase ~0.5) uses the base config unchanged.
 */
function resolvePhaseConfig(config: EvaluationConfig, phase: number): EvaluationConfig {
  if (!config.phases) return config;

  const openingBlend = config.phases.opening ? Math.max(0, Math.min(1, (phase - 0.5) / 0.3)) : 0;
  const endgameBlend = config.phases.endgame ? Math.max(0, Math.min(1, (0.5 - phase) / 0.3)) : 0;

  if (openingBlend === 0 && endgameBlend === 0) return config;

  const resolved = { ...config };
  resolved.positional = { ...config.positional };
  resolved.kingSafety = { ...config.kingSafety };
  resolved.tactical = { ...config.tactical };

  const blend = (base: number, override: number | undefined, weight: number): number => {
    if (override === undefined) return base;
    return base + (override - base) * weight;
  };

  // Apply opening overrides
  if (openingBlend > 0 && config.phases.opening) {
    const op = config.phases.opening;
    if (op.positional) {
      for (const key of Object.keys(op.positional) as (keyof PositionalWeights)[]) {
        resolved.positional[key] = blend(config.positional[key], op.positional[key], openingBlend);
      }
    }
    if (op.kingSafety) {
      for (const key of Object.keys(op.kingSafety) as (keyof KingSafetyWeights)[]) {
        resolved.kingSafety[key] = blend(config.kingSafety[key], op.kingSafety[key], openingBlend);
      }
    }
    if (op.tactical) {
      for (const key of Object.keys(op.tactical) as (keyof TacticalWeights)[]) {
        resolved.tactical[key] = blend(config.tactical[key], op.tactical[key], openingBlend);
      }
    }
  }

  // Apply endgame overrides (blends on top of opening-adjusted values)
  if (endgameBlend > 0 && config.phases.endgame) {
    const eg = config.phases.endgame;
    if (eg.positional) {
      for (const key of Object.keys(eg.positional) as (keyof PositionalWeights)[]) {
        resolved.positional[key] = blend(resolved.positional[key], eg.positional[key], endgameBlend);
      }
    }
    if (eg.kingSafety) {
      for (const key of Object.keys(eg.kingSafety) as (keyof KingSafetyWeights)[]) {
        resolved.kingSafety[key] = blend(resolved.kingSafety[key], eg.kingSafety[key], endgameBlend);
      }
    }
    if (eg.tactical) {
      for (const key of Object.keys(eg.tactical) as (keyof TacticalWeights)[]) {
        resolved.tactical[key] = blend(resolved.tactical[key], eg.tactical[key], endgameBlend);
      }
    }
  }

  return resolved;
}

/**
 * Compute a smarter mobility score for the side to move.
 * - Excludes pawn moves (pawns are structural, not "mobility")
 * - Weights quiet moves (to empty squares) higher than captures
 *   (captures are already incentivized by material gain)
 * - Gives a small centrality bonus for moves to central squares
 *
 * Returns a raw score (positive = good mobility for side to move).
 * The caller applies the sign based on stm.
 */
function computeMobility(board: Board, mobilityWeight: number): number {
  const moves = board.moves;
  const len = moves.length;
  let mobilityScore = 0;

  for (let i = 0; i < len; i++) {
    const move = moves[i];
    // Skip pawn moves — pawn type is 1, movingpiece & 7 extracts type
    if ((move.movingpiece & 7) === 1) continue;

    // Quiet move = 1.0 base, capture = 0.4 base
    // (captures already rewarded by material evaluation)
    const base = move.captured ? 0.4 : 1.0;

    // Small centrality bonus for destination square
    mobilityScore += base + CENTRALITY_BONUS[move.to] * 0.15;
  }

  return mobilityScore * mobilityWeight;
}

/**
 * Evaluate a chess position from white's perspective using Board (chess-movegen-js).
 * Returns centipawn evaluation (positive = white advantage).
 */
export function evaluate(board: Board, config: EvaluationConfig, opts?: EvaluateOptions): number {
  // --- Terminal state detection ---
  const moveCount = opts?.legalMoveCount;

  if (opts?.isTerminal || moveCount === 0) {
    if (board.inCheck) {
      // Checkmate — side to move loses
      const mateScore = 99999 - (opts?.ply ?? 0);
      return board.stm === 0 ? -mateScore : mateScore;
    }
    return 0; // Stalemate
  }

  if (moveCount === undefined && !opts?.skipMobility) {
    // Fallback: check if position is terminal
    if (board.moves.length === 0) {
      if (board.inCheck) {
        const mateScore = 99999 - (opts?.ply ?? 0);
        return board.stm === 0 ? -mateScore : mateScore;
      }
      return 0;
    }
  }

  let score = 0;
  let totalMaterial = 0;

  // Approach B: accumulate raw positional counts in main loop, scale after with blended config
  let rawCenterControl = 0;   // net center square occupancy (white - black)
  let rawPawnAdvancement = 0;  // net pawn advancement score (white - black)

  // Track king PST indices for endgame interpolation (applied after phase is known)
  let whiteKingPstIndex = 0;
  let blackKingPstIndex = 0;

  // Track bishop counts for bishop pair bonus
  let whiteBishopCount = 0;
  let blackBishopCount = 0;

  // --- Single-pass board scan over 0x88 board ---
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }

    const piece = board.pieceat[sq];
    if (piece === 0) continue;

    const color = (piece & 8) >>> 3;  // 0=white, 1=black
    const type = piece & 7;            // 1-6
    const sign = color === 0 ? 1 : -1;

    const file = sq & 7;
    const rank = sq >>> 4;

    // Material
    const materialValue = getPieceValue(type, config);
    if (type !== K) {
      totalMaterial += materialValue;
    }

    // PST
    const pst = PST_BY_TYPE[type];
    let pstIndex: number;
    if (color === 0) {
      pstIndex = (7 - rank) * 8 + file;
    } else {
      pstIndex = rank * 8 + file;
    }
    const pstValue = pst ? pst[pstIndex] : 0;

    // Raw center control count (unscaled)
    if (CENTER_0x88.has(sq)) {
      rawCenterControl += sign;
    }

    // Raw pawn advancement value (unscaled)
    if (type === P) {
      const advancement = color === 0 ? (rank - 1) : (6 - rank);
      rawPawnAdvancement += sign * advancement * 8;
    }

    // Track king PST index for post-loop endgame interpolation
    if (type === K) {
      if (color === 0) {
        whiteKingPstIndex = pstIndex;
      } else {
        blackKingPstIndex = pstIndex;
      }
    }

    // Track bishop counts for bishop pair bonus
    if (type === B) {
      if (color === 0) whiteBishopCount++;
      else blackBishopCount++;
    }

    score += sign * (materialValue + pstValue);
  }

  // --- Compute game phase and resolve blended config ---
  const phase = Math.min(1, totalMaterial / 6000);
  const cfg = resolvePhaseConfig(config, phase);

  // --- Endgame King PST interpolation ---
  // The main loop used KING_MIDDLEGAME_TABLE. Now blend with endgame table based on phase.
  {
    const whiteMidPst = KING_MIDDLEGAME_TABLE[whiteKingPstIndex];
    const whiteEndPst = KING_ENDGAME_TABLE[whiteKingPstIndex];
    const whiteBlended = whiteMidPst * phase + whiteEndPst * (1 - phase);
    score += (whiteBlended - whiteMidPst); // subtract already-added mid, add blended

    const blackMidPst = KING_MIDDLEGAME_TABLE[blackKingPstIndex];
    const blackEndPst = KING_ENDGAME_TABLE[blackKingPstIndex];
    const blackBlended = blackMidPst * phase + blackEndPst * (1 - phase);
    score -= (blackBlended - blackMidPst); // same for black (negated)
  }

  // --- Bishop Pair Bonus ---
  // ~50cp bonus scaled by (2 - phase) so it's more valuable in endgames/open positions
  {
    const bishopPairBase = 50;
    if (whiteBishopCount >= 2) {
      score += bishopPairBase * (2 - phase) / 2;
    }
    if (blackBishopCount >= 2) {
      score -= bishopPairBase * (2 - phase) / 2;
    }
  }

  // --- Apply phase-blended positional bonuses ---
  score += rawCenterControl * (cfg.positional.centerControl / 10) * 15;
  if (cfg.positional.pawnAdvancement > 0) {
    score += rawPawnAdvancement * (cfg.positional.pawnAdvancement / 10);
  }

  // --- Pawn Structure Evaluation (uses blended config) ---
  if (cfg.positional.pawnStructure > 0) {
    // Track pawn files per color: whitePawnFiles[file] = count, blackPawnFiles[file] = count
    const whitePawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];
    const blackPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];
    const WP = 1, BP = 9;

    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const pc = board.pieceat[sq];
      if (pc === WP) whitePawnFiles[sq & 7]++;
      else if (pc === BP) blackPawnFiles[sq & 7]++;
    }

    const structWeight = cfg.positional.pawnStructure;
    let structScore = 0;

    for (let f = 0; f < 8; f++) {
      // Doubled pawns penalty: each extra pawn on same file costs ~15cp * weight/10
      if (whitePawnFiles[f] > 1) {
        structScore -= (whitePawnFiles[f] - 1) * 15 * (structWeight / 10);
      }
      if (blackPawnFiles[f] > 1) {
        structScore += (blackPawnFiles[f] - 1) * 15 * (structWeight / 10);
      }

      // Isolated pawn penalty: no friendly pawn on adjacent files costs ~12cp * weight/10
      const wHasAdj = (f > 0 && whitePawnFiles[f - 1] > 0) || (f < 7 && whitePawnFiles[f + 1] > 0);
      if (whitePawnFiles[f] > 0 && !wHasAdj) {
        structScore -= whitePawnFiles[f] * 12 * (structWeight / 10);
      }
      const bHasAdj = (f > 0 && blackPawnFiles[f - 1] > 0) || (f < 7 && blackPawnFiles[f + 1] > 0);
      if (blackPawnFiles[f] > 0 && !bHasAdj) {
        structScore += blackPawnFiles[f] * 12 * (structWeight / 10);
      }
    }

    score += structScore;

    // --- Passed Pawn Bonus ---
    // A passed pawn has no enemy pawns on its file or adjacent files ahead of it
    const passedPawnBonus = [0, 0, 10, 20, 40, 70, 120, 200]; // indexed by rank (0-7)

    // Check white passed pawns
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const pc = board.pieceat[sq];
      if (pc !== WP) continue;
      const file = sq & 7;
      const rank = sq >>> 4; // 0x88 rank (0=rank1, 7=rank8)
      // Check if any black pawn can block/capture: on same file or adjacent, on ranks ahead
      let passed = true;
      for (let r = rank + 1; r <= 6; r++) { // ranks ahead for white (toward rank 8)
        for (let f = file - 1; f <= file + 1; f++) {
          if (f < 0 || f > 7) continue;
          if (board.pieceat[r * 16 + f] === BP) {
            passed = false;
            break;
          }
        }
        if (!passed) break;
      }
      if (passed) {
        score += passedPawnBonus[rank] * (structWeight / 10);
      }
    }

    // Check black passed pawns
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const pc = board.pieceat[sq];
      if (pc !== BP) continue;
      const file = sq & 7;
      const rank = sq >>> 4;
      let passed = true;
      for (let r = rank - 1; r >= 1; r--) { // ranks ahead for black (toward rank 1)
        for (let f = file - 1; f <= file + 1; f++) {
          if (f < 0 || f > 7) continue;
          if (board.pieceat[r * 16 + f] === WP) {
            passed = false;
            break;
          }
        }
        if (!passed) break;
      }
      if (passed) {
        // For black, advancement is measured from rank 8 toward rank 1
        score -= passedPawnBonus[7 - rank] * (structWeight / 10);
      }
    }
  }

  // --- Attack & Defense Weights (native 0x88 implementation) ---
  score += computeAttackDefense(board, cfg);

  // --- Mobility (uses blended config) ---
  if (!opts?.skipMobility) {
    // Fast path: when moveCount is pre-computed (e.g. quiescence search),
    // use simple counting to avoid iterating the move list again.
    if (moveCount !== undefined) {
      const mobilityScore = moveCount * cfg.positional.mobility;
      score += board.stm === 0 ? mobilityScore : -mobilityScore;
    } else {
      // Full path: smarter mobility — piece-only, quiet-weighted, centrality bonus
      const mobilityScore = computeMobility(board, cfg.positional.mobility);
      score += board.stm === 0 ? mobilityScore : -mobilityScore;
    }
  }

  // --- King Safety (uses blended config) ---
  const castleBonus = cfg.kingSafety.castleBonus;
  const cbScale = castleBonus / 60;

  // Castling rights bonus (K=1, Q=2, k=4, q=8)
  const cr = board.castlingRights;

  if (cr & 3) {
    // White can castle (K or Q side)
    score += castleBonus;
  }
  if (cr & 12) {
    // Black can castle (k or q side)
    score -= castleBonus;
  }

  // Bonus for king on castled squares (already castled)
  // Penalty for losing castling rights without castling (king walk)
  for (let side = 0; side < 2; side++) {
    const sideSign = side === 0 ? 1 : -1;
    const kSq = board.kingsquares[side];
    const castledSquares = side === 0 ? [0x06, 0x02] : [0x76, 0x72]; // g1/c1 or g8/c8
    const startSq = side === 0 ? 0x04 : 0x74; // e1 or e8
    const sideRightsMask = side === 0 ? 3 : 12; // K|Q for white, k|q for black
    const onCastledSquare = castledSquares.includes(kSq);

    if (onCastledSquare) {
      // Reward being on a castled square (~40cp scaled)
      score += sideSign * 40 * cbScale;

      // Additional bonus if pawn shield is intact (2+ pawns in front)
      const friendlyPawn = side === 0 ? 1 : 9;
      const shieldRank = side === 0 ? 1 : 6;
      const kingFile = kSq & 7;
      const shieldFiles = kingFile >= 5 ? [5, 6, 7] : [0, 1, 2];
      let pawnsInFront = 0;
      for (const f of shieldFiles) {
        if (board.pieceat[shieldRank * 16 + f] === friendlyPawn) {
          pawnsInFront++;
        }
      }
      if (pawnsInFront >= 2) {
        score += sideSign * 20 * cbScale;
      }
    } else if (!(cr & sideRightsMask) && kSq !== startSq) {
      // Lost castling rights AND not on a castled square AND not on starting square
      // = king walked without castling → penalty (~30cp scaled)
      score -= sideSign * 30 * cbScale;
    }
  }

  // King safety per color
  for (let c = 0; c < 2; c++) {
    const sign = c === 0 ? 1 : -1;
    const kingSq = board.kingsquares[c];
    const kingFile = kingSq & 7;
    const kingRank = kingSq >>> 4;

    // Pawn shield check
    const shieldRank = c === 0 ? 1 : 6; // rank 1 (idx 1) for white, rank 6 (idx 6) for black
    const shieldFiles =
      kingFile >= 5 ? [5, 6, 7] :
      kingFile <= 2 ? [0, 1, 2] :
      [];

    let shieldCount = 0;
    const friendlyPawn = c === 0 ? 1 : 9; // wp=1, bp=9
    for (const f of shieldFiles) {
      const shieldSq = shieldRank * 16 + f;
      if (board.pieceat[shieldSq] === friendlyPawn) {
        shieldCount++;
      }
    }
    score += sign * shieldCount * cfg.kingSafety.pawnShield * phase;

    // King file open check (no friendly pawn on king's file)
    let hasFriendlyPawnOnFile = false;
    for (let rnk = 0; rnk < 8; rnk++) {
      const sq = rnk * 16 + kingFile;
      if (board.pieceat[sq] === friendlyPawn) {
        hasFriendlyPawnOnFile = true;
        break;
      }
    }
    if (!hasFriendlyPawnOnFile) {
      score -= sign * cfg.kingSafety.exposurePenalty * phase;
    }

    // Nearby friendly pieces
    let nearbyFriendly = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let df = -1; df <= 1; df++) {
        if (df === 0 && dr === 0) continue;
        const nr = kingRank + dr;
        const nf = kingFile + df;
        if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
        const nsq = nr * 16 + nf;
        const pc = board.pieceat[nsq];
        if (pc === 0) continue;
        const pcColor = (pc & 8) >>> 3;
        const pcType = pc & 7;
        if (pcColor === c && pcType !== K) {
          nearbyFriendly++;
        }
      }
    }
    if (nearbyFriendly < 3) {
      score -= sign * (3 - nearbyFriendly) * (cfg.kingSafety.exposurePenalty / 3) * phase;
    }
  }

  // Check bonus (aggression, uses blended config)
  // aggression is 0-100 scale, divide by 100 for multiplier
  if (board.inCheck) {
    const aggressionFactor = cfg.tactical.aggression / 100;
    score += board.stm === 0
      ? -aggressionFactor * 20
      : aggressionFactor * 20;
  }

  return score;
}
