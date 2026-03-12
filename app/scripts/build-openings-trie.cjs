#!/usr/bin/env node
/**
 * Build a compact trie from openings.json.
 * 
 * Output format:
 * {
 *   _e: ["A00", ...],                  // eco codes indexed
 *   _s: ["Sicilian Defense", ...],      // name segments indexed (split on ": ")
 *   t: { "e4": { "_": [0, 5], "e5": { ... } } }
 * }
 * 
 * Trie keys are single chess moves. The special key "_" stores opening data
 * as [ecoIndex, nameSegmentIndex1, nameSegmentIndex2, ...].
 * Name is reconstructed by joining segments with ": ".
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'src', 'data', 'openings.json');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'openings-trie.json');

const openings = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

const ecoMap = new Map(), ecos = [];
const segMap = new Map(), segs = [];

function getIdx(map, arr, val) {
  if (map.has(val)) return map.get(val);
  const idx = arr.length;
  arr.push(val);
  map.set(val, idx);
  return idx;
}

const trie = {};
let count = 0;

for (const [movesStr, info] of Object.entries(openings)) {
  const moves = movesStr.split(/\s+/);
  let node = trie;
  for (const move of moves) {
    if (!node[move]) node[move] = {};
    node = node[move];
  }
  const ecoIdx = getIdx(ecoMap, ecos, info.eco);
  const nameSegs = info.name.split(': ').map(s => getIdx(segMap, segs, s));
  node._ = [ecoIdx, ...nameSegs];
  count++;
}

const output = { _e: ecos, _s: segs, t: trie };
const json = JSON.stringify(output);
fs.writeFileSync(outputPath, json, 'utf-8');

const inputSize = fs.statSync(inputPath).size;
const outputSize = fs.statSync(outputPath).size;
const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);

console.log(`Openings: ${count} | ECOs: ${ecos.length} | Segments: ${segs.length}`);
console.log(`Input:  ${(inputSize / 1024).toFixed(1)}KB`);
console.log(`Output: ${(outputSize / 1024).toFixed(1)}KB`);
console.log(`Reduction: ${reduction}%`);

// Verify all entries round-trip correctly
function lookup(moveStr) {
  const moves = moveStr.split(/\s+/);
  let node = output.t;
  let best = null;
  for (const m of moves) {
    if (!node[m]) break;
    node = node[m];
    if (node._) {
      const entry = node._;
      best = { eco: output._e[entry[0]], name: entry.slice(1).map(i => output._s[i]).join(': ') };
    }
  }
  return best;
}

let errors = 0;
for (const [movesStr, info] of Object.entries(openings)) {
  const result = lookup(movesStr);
  if (!result || result.eco !== info.eco || result.name !== info.name) {
    console.error(`MISMATCH: "${movesStr}" -> ${JSON.stringify(result)}`);
    errors++;
    if (errors > 5) break;
  }
}
console.log(`Verification: ${errors === 0 ? '✅ PASS' : '❌ FAIL'} (${errors} errors out of ${count})`);
