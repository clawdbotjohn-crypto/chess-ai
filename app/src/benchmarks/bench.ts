/**
 * Chess Engine Benchmark Suite
 * Measures findBestMove performance across positions, depths, and eval configs.
 */

import { findBestMove } from '../engine/search';
import { DEFAULT_CONFIG, type EvaluationConfig } from '../engine/types';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { performance } from 'perf_hooks';

// ── Positions ──────────────────────────────────────────────
const POSITIONS: { name: string; fen: string }[] = [
  {
    name: 'Starting Position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    name: 'Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5 a6)',
    fen: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
  },
];

// ── Eval Configs ───────────────────────────────────────────
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const materialOnly: EvaluationConfig = {
  pieceValues: { ...DEFAULT_CONFIG.pieceValues },
  positional: { centerControl: 0, pawnAdvancement: 0, mobility: 0 },
  kingSafety: { castleBonus: 0, pawnShield: 0, exposurePenalty: 0 },
  tactical: { attackWeight: 0, defenseWeight: 0, aggression: 0 },
  search: { depth: 1 }, // overridden per test
  randomness: { threshold: 0 },
};

const fullEvalNoAttack: EvaluationConfig = deepClone(DEFAULT_CONFIG);

const fullEvalWithAttack: EvaluationConfig = deepClone(DEFAULT_CONFIG);
fullEvalWithAttack.tactical.attackWeight = 8;
fullEvalWithAttack.tactical.defenseWeight = 8;

const CONFIGS: { name: string; config: EvaluationConfig }[] = [
  { name: 'Material-only', config: materialOnly },
  { name: 'Full eval (attack=0)', config: fullEvalNoAttack },
  { name: 'Full eval (attack=8)', config: fullEvalWithAttack },
];

const DEPTHS = [1, 2, 3, 4];
const RUNS = 3;
const TIMEOUT_MS = 120_000; // 2 min max per single run

// ── Types ──────────────────────────────────────────────────
interface RunResult {
  position: string;
  fen: string;
  config: string;
  depth: number;
  times: number[];
  bestMoves: string[];
  minMs: number;
  avgMs: number;
  maxMs: number;
  bestMove: string;
  timedOut?: boolean;
}

// ── Main ───────────────────────────────────────────────────
function runBenchmarks(): RunResult[] {
  const results: RunResult[] = [];
  let skipRemaining = false;

  for (const pos of POSITIONS) {
    for (const cfg of CONFIGS) {
      skipRemaining = false;
      for (const depth of DEPTHS) {
        if (skipRemaining) {
          results.push({
            position: pos.name, fen: pos.fen, config: cfg.name, depth,
            times: [], bestMoves: [], minMs: -1, avgMs: -1, maxMs: -1,
            bestMove: 'SKIPPED (previous depth too slow)', timedOut: true,
          });
          continue;
        }

        const testConfig = deepClone(cfg.config);
        testConfig.search.depth = depth;

        const times: number[] = [];
        const bestMoves: string[] = [];
        let timedOut = false;

        // For depth 4, only do 1 run to save time
        const runsForDepth = depth >= 4 ? 1 : RUNS;

        for (let r = 0; r < runsForDepth; r++) {
          const t0 = performance.now();
          const result = findBestMove(pos.fen, testConfig);
          const t1 = performance.now();
          const elapsed = t1 - t0;
          times.push(elapsed);
          bestMoves.push(result.move);

          console.log(`  [${pos.name.slice(0, 20)}] ${cfg.name} d${depth} run${r + 1}: ${Math.round(elapsed)}ms → ${result.move}`);

          if (elapsed > TIMEOUT_MS) {
            timedOut = true;
            skipRemaining = true;
            console.log(`  ⚠️  Timeout exceeded, skipping deeper depths for this config+position`);
            break;
          }
        }

        const minMs = times.length ? Math.min(...times) : -1;
        const maxMs = times.length ? Math.max(...times) : -1;
        const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : -1;

        // If depth 3 took >30s, skip depth 4
        if (depth === 3 && avgMs > 30_000) {
          skipRemaining = true;
          console.log(`  ⚠️  Depth 3 took ${Math.round(avgMs)}ms, skipping depth 4`);
        }

        results.push({
          position: pos.name,
          fen: pos.fen,
          config: cfg.name,
          depth,
          times: times.map(t => Math.round(t * 100) / 100),
          bestMoves,
          minMs: Math.round(minMs * 100) / 100,
          avgMs: Math.round(avgMs * 100) / 100,
          maxMs: Math.round(maxMs * 100) / 100,
          bestMove: bestMoves[0] ?? 'N/A',
          timedOut,
        });
      }
    }
  }
  return results;
}

function printResults(results: RunResult[]): void {
  console.log('\n' + '='.repeat(100));
  console.log('CHESS ENGINE BENCHMARK RESULTS');
  console.log('='.repeat(100));

  let currentPos = '';
  let currentCfg = '';

  for (const r of results) {
    if (r.position !== currentPos) {
      currentPos = r.position;
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`📍 ${r.position}`);
      console.log(`   FEN: ${r.fen}`);
      console.log('─'.repeat(100));
    }
    if (r.config !== currentCfg) {
      currentCfg = r.config;
      console.log(`\n  ⚙️  ${r.config}`);
      console.log(`  ${'Depth'.padEnd(8)} ${'Best Move'.padEnd(12)} ${'Min (ms)'.padEnd(14)} ${'Avg (ms)'.padEnd(14)} ${'Max (ms)'.padEnd(14)} Notes`);
      console.log(`  ${'─'.repeat(75)}`);
    }
    if (r.timedOut && r.times.length === 0) {
      console.log(`  ${String(r.depth).padEnd(8)} ${'SKIPPED'.padEnd(12)} ${'—'.padEnd(14)} ${'—'.padEnd(14)} ${'—'.padEnd(14)} too slow`);
    } else {
      const moves = [...new Set(r.bestMoves)].join(', ');
      console.log(
        `  ${String(r.depth).padEnd(8)} ${r.bestMove.padEnd(12)} ${String(r.minMs).padEnd(14)} ${String(r.avgMs).padEnd(14)} ${String(r.maxMs).padEnd(14)} ${moves}`
      );
    }
  }
  console.log('\n' + '='.repeat(100));
}

function saveResults(results: RunResult[]): void {
  const outDir = resolve(import.meta.dirname ?? '.', '..', '..', '..', 'benchmarks');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'baseline-results.json');
  const payload = {
    timestamp: new Date().toISOString(),
    engine: 'chess-ai v1 (minimax + alpha-beta + quiescence + TT)',
    host: 'clawdbot-pi (arm64)',
    results,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`\n💾 Results saved to ${outPath}`);
}

// ── Run ────────────────────────────────────────────────────
console.log('Starting chess engine benchmarks...');
console.log(`Positions: ${POSITIONS.length}, Configs: ${CONFIGS.length}, Depths: ${DEPTHS.join(',')}, Runs: ${RUNS} (depth 4: 1 run)`);
console.log(`Timeout per run: ${TIMEOUT_MS / 1000}s\n`);

const results = runBenchmarks();
printResults(results);
saveResults(results);
