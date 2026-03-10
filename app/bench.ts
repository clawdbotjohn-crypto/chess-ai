/**
 * Benchmark script for chess engine performance.
 * Tests depth 4 and depth 7 from starting position.
 */
import { Chess } from 'chess.js';
import { findBestMove } from './src/engine/search';
import { DEFAULT_CONFIG, type EvaluationConfig } from './src/engine/types';

function benchmark(depth: number): void {
  const config: EvaluationConfig = { ...DEFAULT_CONFIG, search: { depth } };
  const fen = new Chess().fen();
  
  const start = performance.now();
  const result = findBestMove(fen, config);
  const elapsed = performance.now() - start;
  
  console.log(`Depth ${depth}: ${elapsed.toFixed(0)}ms | move=${result.move} eval=${result.evaluation}`);
}

console.log('=== Chess Engine Benchmark ===');
console.log('Starting position\n');

benchmark(4);
benchmark(7);
