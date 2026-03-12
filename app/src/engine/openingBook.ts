/**
 * Opening Book
 *
 * Builds a position → moves map from the trie-based openings data.
 * For each opening path, replays its moves and records what move was played from each position.
 * During a game, if the current position is in the book, randomly picks a weighted book move.
 */

import { Chess } from 'chess.js';
import trieData from '../data/openings-trie.json';

interface TrieNode {
  _?: number[];
  [move: string]: TrieNode | number[] | undefined;
}

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

/**
 * Recursively collect all move sequences from the trie.
 * Each sequence is an array of SAN moves representing a path from root to a node.
 */
function collectSequences(node: TrieNode, currentPath: string[], sequences: string[][]): void {
  // If this node has opening data, record the path
  if (node._) {
    sequences.push([...currentPath]);
  }

  // Recurse into children
  for (const key of Object.keys(node)) {
    if (key === '_') continue;
    const child = node[key];
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      currentPath.push(key);
      collectSequences(child as TrieNode, currentPath, sequences);
      currentPath.pop();
    }
  }
}

function buildBook(): BookMap {
  const map: BookMap = new Map();
  const trie = (trieData as unknown as { t: TrieNode }).t;

  // Collect all move sequences from the trie
  const sequences: string[][] = [];
  collectSequences(trie, [], sequences);

  for (const moves of sequences) {
    const chess = new Chess();

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
