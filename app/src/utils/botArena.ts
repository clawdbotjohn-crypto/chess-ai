/**
 * Bot Arena — Tournament Logic and Match Runner
 *
 * Runs chess matches between AI configurations using the engine directly.
 * Supports round-robin tournaments and single matches.
 */

import { Chess } from 'chess.js';
import { findBestMove } from '../engine/search';
import type { EvaluationConfig } from '../engine/types';
import { updateEloAfterMatch, saveMatchRecord } from './eloRating';
import { PRESETS, PRESET_NAMES } from '../engine/presets';
import type { PresetName } from '../engine/presets';

// ── Bot Identity ──────────────────────────────────────────

export interface BotIdentity {
  id: string;
  name: string;
  config: EvaluationConfig;
  isPreset: boolean;
}

const PERSONALITY_PREFIX = 'chess-ai-personality:';

/** Get all available bots (presets + user-created) */
export function getAllBots(): BotIdentity[] {
  const bots: BotIdentity[] = [];

  // Preset bots
  for (const name of PRESET_NAMES) {
    const preset = PRESETS[name];
    bots.push({
      id: `preset:${name}`,
      name: preset.label,
      config: structuredClone(preset.config),
      isPreset: true,
    });
  }

  // User-created bots from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PERSONALITY_PREFIX)) {
      const name = key.slice(PERSONALITY_PREFIX.length);
      try {
        const config = JSON.parse(localStorage.getItem(key)!) as EvaluationConfig;
        bots.push({
          id: `custom:${name}`,
          name,
          config,
          isPreset: false,
        });
      } catch {
        // skip invalid
      }
    }
  }

  return bots;
}

export function getBotDisplayName(id: string): string {
  if (id.startsWith('preset:')) {
    const name = id.slice(7) as PresetName;
    return PRESETS[name]?.label ?? name;
  }
  if (id.startsWith('custom:')) return id.slice(7);
  return id;
}

// ── Match Runner ──────────────────────────────────────────

export type MatchResult = 0 | 0.5 | 1; // white win, black win, draw

export interface MatchProgress {
  moveNumber: number;
  fen: string;
  lastMove?: string;
  whiteId: string;
  blackId: string;
}

export interface MatchOutcome {
  result: MatchResult;
  reason: string;
  moves: string[];
  finalFen: string;
  moveCount: number;
}

const MAX_MOVES = 150;

/**
 * Run a single match between two bots synchronously (blocking).
 * For fast simulation, call this without onProgress.
 * For live view, provide onProgress and it will be called after each move.
 */
export function runMatchSync(
  whiteConfig: EvaluationConfig,
  blackConfig: EvaluationConfig,
  onProgress?: (p: MatchProgress & { moveNumber: number }) => void,
): MatchOutcome {
  const game = new Chess();
  const moves: string[] = [];
  const positionCounts = new Map<string, number>();

  while (!game.isGameOver() && moves.length < MAX_MOVES * 2) {
    // Check threefold repetition via position counting
    const posKey = game.fen().split(' ').slice(0, 4).join(' ');
    const count = (positionCounts.get(posKey) ?? 0) + 1;
    positionCounts.set(posKey, count);
    if (count >= 3) {
      return { result: 0.5, reason: 'Threefold repetition', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
    }

    const config = game.turn() === 'w' ? whiteConfig : blackConfig;
    const searchResult = findBestMove(game.fen(), config);

    if (!searchResult.move) {
      break; // No move found (shouldn't happen if not game over)
    }

    game.move(searchResult.move);
    moves.push(searchResult.move);

    if (onProgress) {
      onProgress({
        moveNumber: Math.ceil(moves.length / 2),
        fen: game.fen(),
        lastMove: searchResult.move,
        whiteId: '',
        blackId: '',
      });
    }
  }

  // Determine result
  if (game.isCheckmate()) {
    // The side that just moved won
    const winner = game.turn() === 'w' ? 0 : 1; // turn switches after move, so if it's white's turn, black just checkmated
    return {
      result: winner as MatchResult,
      reason: 'Checkmate',
      moves,
      finalFen: game.fen(),
      moveCount: Math.ceil(moves.length / 2),
    };
  }

  if (game.isStalemate()) {
    return { result: 0.5, reason: 'Stalemate', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
  }

  if (game.isDraw()) {
    let reason = 'Draw';
    if (game.isInsufficientMaterial()) reason = 'Insufficient material';
    else if (game.isThreefoldRepetition()) reason = 'Threefold repetition';
    return { result: 0.5, reason, moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
  }

  // Move limit reached
  if (moves.length >= MAX_MOVES * 2) {
    return { result: 0.5, reason: `Move limit (${MAX_MOVES})`, moves, finalFen: game.fen(), moveCount: MAX_MOVES };
  }

  return { result: 0.5, reason: 'Unknown', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
}

// ── Async match runner (yields to UI between moves) ───────

export async function runMatchAsync(
  whiteConfig: EvaluationConfig,
  blackConfig: EvaluationConfig,
  whiteId: string,
  blackId: string,
  delayMs: number,
  onProgress?: (p: MatchProgress) => void,
  shouldStop?: () => boolean,
): Promise<MatchOutcome> {
  const game = new Chess();
  const moves: string[] = [];
  const positionCounts = new Map<string, number>();

  while (!game.isGameOver() && moves.length < MAX_MOVES * 2) {
    if (shouldStop?.()) {
      return { result: 0.5, reason: 'Stopped', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
    }

    // Check threefold repetition
    const posKey = game.fen().split(' ').slice(0, 4).join(' ');
    const count = (positionCounts.get(posKey) ?? 0) + 1;
    positionCounts.set(posKey, count);
    if (count >= 3) {
      return { result: 0.5, reason: 'Threefold repetition', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
    }

    const config = game.turn() === 'w' ? whiteConfig : blackConfig;

    // Yield to UI before computing
    await new Promise<void>(resolve => setTimeout(resolve, delayMs > 0 ? delayMs : 0));

    const searchResult = findBestMove(game.fen(), config);
    if (!searchResult.move) break;

    game.move(searchResult.move);
    moves.push(searchResult.move);

    onProgress?.({
      moveNumber: Math.ceil(moves.length / 2),
      fen: game.fen(),
      lastMove: searchResult.move,
      whiteId,
      blackId,
    });
  }

  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 0 : 1;
    return { result: winner as MatchResult, reason: 'Checkmate', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
  }
  if (game.isStalemate()) {
    return { result: 0.5, reason: 'Stalemate', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
  }
  if (game.isDraw()) {
    let reason = 'Draw';
    if (game.isInsufficientMaterial()) reason = 'Insufficient material';
    else if (game.isThreefoldRepetition()) reason = 'Threefold repetition';
    return { result: 0.5, reason, moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
  }
  if (moves.length >= MAX_MOVES * 2) {
    return { result: 0.5, reason: `Move limit (${MAX_MOVES})`, moves, finalFen: game.fen(), moveCount: MAX_MOVES };
  }
  return { result: 0.5, reason: 'Unknown', moves, finalFen: game.fen(), moveCount: Math.ceil(moves.length / 2) };
}

// ── Tournament Logic ──────────────────────────────────────

export interface TournamentMatch {
  whiteId: string;
  blackId: string;
  result?: MatchResult;
  reason?: string;
  moveCount?: number;
  eloUpdate?: { whiteDelta: number; blackDelta: number };
}

export interface TournamentState {
  id: string;
  matches: TournamentMatch[];
  completedCount: number;
  totalMatches: number;
  standings: Map<string, { points: number; wins: number; draws: number; losses: number }>;
  isComplete: boolean;
}

/** Generate round-robin pairings (each bot plays each other bot twice — once as white, once as black) */
export function generateRoundRobin(botIds: string[]): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  for (let i = 0; i < botIds.length; i++) {
    for (let j = i + 1; j < botIds.length; j++) {
      matches.push({ whiteId: botIds[i], blackId: botIds[j] });
      matches.push({ whiteId: botIds[j], blackId: botIds[i] });
    }
  }
  // Shuffle for variety
  for (let i = matches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matches[i], matches[j]] = [matches[j], matches[i]];
  }
  return matches;
}

export function createTournament(botIds: string[]): TournamentState {
  const matches = generateRoundRobin(botIds);
  const standings = new Map<string, { points: number; wins: number; draws: number; losses: number }>();
  for (const id of botIds) {
    standings.set(id, { points: 0, wins: 0, draws: 0, losses: 0 });
  }
  return {
    id: `t-${Date.now()}`,
    matches,
    completedCount: 0,
    totalMatches: matches.length,
    standings,
    isComplete: false,
  };
}

export function updateTournamentStandings(
  tournament: TournamentState,
  matchIndex: number,
  result: MatchResult,
  reason: string,
  moveCount: number,
): TournamentState {
  const updated = { ...tournament, matches: [...tournament.matches], standings: new Map(tournament.standings) };
  const match = { ...updated.matches[matchIndex] };
  match.result = result;
  match.reason = reason;
  match.moveCount = moveCount;

  // Update Elo
  const eloUpdate = updateEloAfterMatch(match.whiteId, match.blackId, result);
  match.eloUpdate = { whiteDelta: eloUpdate.whiteDelta, blackDelta: eloUpdate.blackDelta };
  updated.matches[matchIndex] = match;

  // Save match record
  saveMatchRecord({
    id: `m-${Date.now()}-${matchIndex}`,
    whiteId: match.whiteId,
    blackId: match.blackId,
    result,
    resultReason: reason,
    moves: moveCount,
    eloUpdate,
    timestamp: Date.now(),
    tournamentId: tournament.id,
  });

  // Update standings
  const whiteStanding = updated.standings.get(match.whiteId) ?? { points: 0, wins: 0, draws: 0, losses: 0 };
  const blackStanding = updated.standings.get(match.blackId) ?? { points: 0, wins: 0, draws: 0, losses: 0 };

  if (result === 1) {
    whiteStanding.points += 1;
    whiteStanding.wins++;
    blackStanding.losses++;
  } else if (result === 0) {
    blackStanding.points += 1;
    blackStanding.wins++;
    whiteStanding.losses++;
  } else {
    whiteStanding.points += 0.5;
    blackStanding.points += 0.5;
    whiteStanding.draws++;
    blackStanding.draws++;
  }

  updated.standings.set(match.whiteId, whiteStanding);
  updated.standings.set(match.blackId, blackStanding);
  updated.completedCount++;
  updated.isComplete = updated.completedCount >= updated.totalMatches;

  return updated;
}
