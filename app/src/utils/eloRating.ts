/**
 * Elo Rating System
 * Standard Elo with configurable K-factor.
 */

const STORAGE_KEY = 'chess-ai-elo-ratings';
const K_THRESHOLD = 30; // games played before K drops

export interface EloRecord {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  ratingHistory: { rating: number; timestamp: number }[];
}

export interface EloUpdate {
  whiteOld: number;
  blackOld: number;
  whiteNew: number;
  blackNew: number;
  whiteDelta: number;
  blackDelta: number;
}

function getKFactor(gamesPlayed: number): number {
  return gamesPlayed < K_THRESHOLD ? 32 : 16;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new Elo ratings after a match.
 * @param result 1 = white wins, 0 = black wins, 0.5 = draw
 */
export function calculateElo(
  whiteRating: number,
  blackRating: number,
  whiteGames: number,
  blackGames: number,
  result: 0 | 0.5 | 1,
): EloUpdate {
  const expectedWhite = expectedScore(whiteRating, blackRating);
  const expectedBlack = 1 - expectedWhite;

  const kWhite = getKFactor(whiteGames);
  const kBlack = getKFactor(blackGames);

  const whiteNew = Math.round(whiteRating + kWhite * (result - expectedWhite));
  const blackNew = Math.round(blackRating + kBlack * ((1 - result) - expectedBlack));

  return {
    whiteOld: whiteRating,
    blackOld: blackRating,
    whiteNew,
    blackNew,
    whiteDelta: whiteNew - whiteRating,
    blackDelta: blackNew - blackRating,
  };
}

// ── localStorage persistence ──────────────────────────────

export function loadEloRatings(): Record<string, EloRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveEloRatings(ratings: Record<string, EloRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
}

export function getEloRecord(botId: string): EloRecord {
  const all = loadEloRatings();
  return all[botId] ?? {
    rating: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    ratingHistory: [{ rating: 1200, timestamp: Date.now() }],
  };
}

export function updateEloAfterMatch(
  whiteId: string,
  blackId: string,
  result: 0 | 0.5 | 1,
): EloUpdate {
  const all = loadEloRatings();
  const whiteRec = all[whiteId] ?? { rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0, ratingHistory: [{ rating: 1200, timestamp: Date.now() }] };
  const blackRec = all[blackId] ?? { rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0, ratingHistory: [{ rating: 1200, timestamp: Date.now() }] };

  const update = calculateElo(whiteRec.rating, blackRec.rating, whiteRec.gamesPlayed, blackRec.gamesPlayed, result);

  whiteRec.rating = update.whiteNew;
  blackRec.rating = update.blackNew;
  whiteRec.gamesPlayed++;
  blackRec.gamesPlayed++;

  if (result === 1) { whiteRec.wins++; blackRec.losses++; }
  else if (result === 0) { whiteRec.losses++; blackRec.wins++; }
  else { whiteRec.draws++; blackRec.draws++; }

  const now = Date.now();
  whiteRec.ratingHistory.push({ rating: update.whiteNew, timestamp: now });
  blackRec.ratingHistory.push({ rating: update.blackNew, timestamp: now });

  all[whiteId] = whiteRec;
  all[blackId] = blackRec;
  saveEloRatings(all);

  return update;
}

// ── Match History ─────────────────────────────────────────

export interface MatchRecord {
  id: string;
  whiteId: string;
  blackId: string;
  result: 0 | 0.5 | 1;
  resultReason: string;
  moves: number;
  eloUpdate: EloUpdate;
  timestamp: number;
  tournamentId?: string;
}

const MATCH_HISTORY_KEY = 'chess-ai-match-history';

export function loadMatchHistory(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(MATCH_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMatchRecord(record: MatchRecord): void {
  const history = loadMatchHistory();
  history.unshift(record); // newest first
  // Keep last 200 matches
  if (history.length > 200) history.length = 200;
  localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history));
}

export function clearAllEloData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(MATCH_HISTORY_KEY);
}
