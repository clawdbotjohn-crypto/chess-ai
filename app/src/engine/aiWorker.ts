/**
 * Chess AI Web Worker
 *
 * Receives position + config, returns best move.
 * Runs search in a separate thread to avoid blocking the UI.
 */

import { findBestMove, quickEval, hasMateIn1 } from './search';
import type { SearchProgress } from './search';
import { getBookMove } from './openingBook';
import type { WorkerRequest, WorkerResponse } from './types';

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, fen, config, openingBookEnabled } = e.data;
  const useBook = openingBookEnabled !== false; // default true for backward compatibility

  if (type === 'move') {
    // Check opening book first (only in first 10 full moves = move counter <= 20)
    // BUT skip book if there's a mate-in-1 available — never miss a forced mate
    const fenParts = fen.split(' ');
    const fullMoveNumber = parseInt(fenParts[5] || '1', 10);

    if (useBook && fullMoveNumber <= 10 && !hasMateIn1(fen)) {
      const bookMove = getBookMove(fen, config.randomness.threshold);
      if (bookMove) {
        const response: WorkerResponse = {
          type: 'bestmove',
          move: bookMove,
          evaluation: 0,
          nodes: 0,
          timeMs: 0,
          isBookMove: true,
        };
        self.postMessage(response);
        return;
      }
    }

    const onProgress = (info: SearchProgress) => {
      const progress: WorkerResponse = {
        type: 'progress',
        move: info.bestMove,
        evaluation: info.eval,
        nodes: info.nodes,
        timeMs: info.timeMs,
        depth: info.depth,
        maxDepth: info.maxDepth,
      };
      self.postMessage(progress);
    };

    const result = findBestMove(fen, config, onProgress);

    const response: WorkerResponse = {
      type: 'bestmove',
      move: result.move,
      evaluation: result.evaluation,
      nodes: result.nodes,
      timeMs: result.timeMs,
    };

    self.postMessage(response);
  } else if (type === 'eval') {
    const evaluation = quickEval(fen, config);
    const response: WorkerResponse = {
      type: 'eval',
      move: '',
      evaluation,
    };
    self.postMessage(response);
  }
};
