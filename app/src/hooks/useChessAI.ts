/**
 * useChessAI Hook
 *
 * Manages the AI Web Worker lifecycle and provides a clean API
 * for requesting AI moves and quick evaluations.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EvaluationConfig, WorkerResponse } from '../engine/types';
import { getSettings } from '../utils/settings';

interface AIMoveResult {
  move: string;
  eval: number;
  isBookMove?: boolean;
}

const WORKER_TIMEOUT_MS = 30_000;

export function useChessAI() {
  const [isThinking, setIsThinking] = useState(false);
  const [lastMoveStats, setLastMoveStats] = useState<{ nodes: number; timeMs: number; isBookMove?: boolean } | null>(null);
  const [searchDepth, setSearchDepth] = useState<{ current: number; max: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingResolve = useRef<((result: AIMoveResult) => void) | null>(null);
  const pendingReject = useRef<((err: Error) => void) | null>(null);
  const pendingEvalResolve = useRef<((evaluation: number) => void) | null>(null);
  const onProgressRef = useRef<((data: { evaluation: number; depth: number; maxDepth: number; move: string }) => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const createWorker = useCallback(() => {
    const worker = new Worker(
      new URL('../engine/aiWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'bestmove') {
        clearPendingTimeout();
        setIsThinking(false);
        setSearchDepth(null);
        if (e.data.isBookMove) {
          setLastMoveStats({ nodes: 0, timeMs: 0, isBookMove: true });
        } else if (e.data.nodes != null && e.data.timeMs != null) {
          setLastMoveStats({ nodes: e.data.nodes, timeMs: e.data.timeMs });
        }
        if (pendingResolve.current) {
          pendingResolve.current({
            move: e.data.move,
            eval: e.data.evaluation,
            isBookMove: e.data.isBookMove,
          });
          pendingResolve.current = null;
          pendingReject.current = null;
        }
      } else if (e.data.type === 'progress') {
        if (e.data.depth != null && e.data.maxDepth != null) {
          setSearchDepth({ current: e.data.depth, max: e.data.maxDepth });
        }
        if (onProgressRef.current) {
          onProgressRef.current({
            evaluation: e.data.evaluation,
            depth: e.data.depth ?? 0,
            maxDepth: e.data.maxDepth ?? 0,
            move: e.data.move,
          });
        }
      } else if (e.data.type === 'eval') {
        if (pendingEvalResolve.current) {
          pendingEvalResolve.current(e.data.evaluation);
          pendingEvalResolve.current = null;
        }
      }
    };

    worker.onerror = (err) => {
      clearPendingTimeout();
      setIsThinking(false);
      if (pendingReject.current) {
        pendingReject.current(new Error(err.message));
        pendingResolve.current = null;
        pendingReject.current = null;
      }
    };

    return worker;
  }, [clearPendingTimeout]);

  const recreateWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = createWorker();
  }, [createWorker]);

  useEffect(() => {
    workerRef.current = createWorker();

    // Cleanup on unmount
    return () => {
      clearPendingTimeout();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [createWorker, clearPendingTimeout]);

  const getMove = useCallback(
    (fen: string, config: EvaluationConfig, onProgress?: (data: { evaluation: number; depth: number; maxDepth: number; move: string }) => void): Promise<AIMoveResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('AI worker not initialized'));
          return;
        }

        setIsThinking(true);
        setSearchDepth(null);
        pendingResolve.current = resolve;
        pendingReject.current = reject;
        onProgressRef.current = onProgress ?? null;

        // Set a timeout — if the worker doesn't respond in 30s, terminate and recreate
        clearPendingTimeout();
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          setIsThinking(false);
          setSearchDepth(null);
          const rejectFn = pendingReject.current;
          pendingResolve.current = null;
          pendingReject.current = null;
          onProgressRef.current = null;
          recreateWorker();
          if (rejectFn) {
            rejectFn(new Error('AI search timed out after 30 seconds'));
          }
        }, WORKER_TIMEOUT_MS);

        // Per-personality opening book setting takes priority; fall back to global setting
        const openingBookEnabled = config.openingBookEnabled !== undefined
          ? config.openingBookEnabled
          : getSettings().openingBookEnabled;

        workerRef.current.postMessage({
          type: 'move',
          fen,
          config,
          openingBookEnabled,
        });
      });
    },
    []
  );

  /** Quick static evaluation (no search). Returns centipawns from white's perspective. */
  const getEval = useCallback(
    (fen: string, config: EvaluationConfig): Promise<number> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('AI worker not initialized'));
          return;
        }
        pendingEvalResolve.current = resolve;
        workerRef.current.postMessage({
          type: 'eval',
          fen,
          config,
        });
      });
    },
    []
  );

  return { getMove, getEval, isThinking, lastMoveStats, searchDepth };
}
