/**
 * Benchmark script for Chess AI engine performance
 */
import { findBestMove } from './src/engine/search';
import type { EvaluationConfig } from './src/engine/types';

const config: EvaluationConfig = {
  pieceValues: { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900 },
  positional: { centerControl: 10, mobility: 10 },
  kingSafety: { castleBonus: 30, pawnShield: 10, exposurePenalty: 20 },
  tactical: { aggression: 5, attackWeight: 0, defenseWeight: 0 },
  randomness: { threshold: 0 },
  search: { depth: 4 }
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function benchmark(depth: number): number {
  config.search = { depth };
  const start = performance.now();
  const result = findBestMove(START_FEN, config);
  const elapsed = performance.now() - start;
  console.log(`Depth ${depth}: ${result.move} (eval: ${result.evaluation}) in ${elapsed.toFixed(0)}ms`);
  return elapsed;
}

console.log('=== Chess AI Engine Benchmark ===');
console.log('Starting position search times:\n');

const d4 = benchmark(4);
const d7 = benchmark(7);

console.log(`\n=== Summary ===`);
console.log(`Depth 4: ${d4.toFixed(0)}ms`);
console.log(`Depth 7: ${d7.toFixed(0)}ms`);
