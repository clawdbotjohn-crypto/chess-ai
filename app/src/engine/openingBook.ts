/**
 * Opening Book
 *
 * Builds a position → moves map from the openings data.
 * For each opening, replays its moves and records what move was played from each position.
 * During a game, if the current position is in the book, randomly picks a weighted book move.
 */

import { Chess } from 'chess.js';
import openingsData from '../data/openings.json';

interface BookEntry {
  move: string;  // SAN notation
  weight: number; // frequency/popularity weight
}

type BookMap = Map<string, BookEntry[]>;

let bookMap: BookMap | null = null;

/**
 * Get a book move for the given FEN position, if one exists.
 * Returns null if position is not in the book.
 */
export function getBookMove(fen: string, randomnessThreshold: number = 0): string | null {
  if (!bookMap) {
    bookMap = buildBook();
  }

  // If randomness is high (> 300), sometimes skip the book for variety
  if (randomnessThreshold > 300 && Math.random() > 0.8) {
    return null;
  }

  // Normalize FEN: position + active color + castling + en passant (drop move counters)
  const key = fen.split(' ').slice(0, 4).join(' ');
  const entries = bookMap.get(key);
  if (!entries || entries.length === 0) return null;

  // Weighted random selection
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of entries) {
    r -= entry.weight;
    if (r <= 0) return entry.move;
  }
  return entries[0].move;
}

function buildBook(): BookMap {
  const map: BookMap = new Map();

  // openingsData is a dict: { "e4 e5 Nf3": { eco: "C40", name: "..." }, ... }
  const entries = Object.entries(openingsData) as [string, { eco: string; name: string }][];

  for (const [movesStr] of entries) {
    const chess = new Chess();
    const moves = movesStr.split(/\s+/);

    for (const move of moves) {
      const key = chess.fen().split(' ').slice(0, 4).join(' ');
      try {
        chess.move(move);
      } catch {
        break;
      }

      const existing = map.get(key) || [];
      const found = existing.find(e => e.move === move);
      if (found) {
        found.weight++;
      } else {
        existing.push({ move, weight: 1 });
      }
      map.set(key, existing);
    }
  }

  return map;
}
