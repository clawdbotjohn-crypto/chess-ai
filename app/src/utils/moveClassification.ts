/**
 * Move Classification — color-code moves based on eval change
 * Uses quickEval (static eval, no search) for fast batch analysis.
 */

import { Chess } from 'chess.js'
import { quickEval } from '../engine/search'
import type { EvaluationConfig } from '../engine/types'

export type MoveCategory = 'brilliant' | 'good' | 'neutral' | 'inaccuracy' | 'mistake' | 'blunder'

export interface MoveClassification {
  moveIndex: number
  san: string
  evalBefore: number
  evalAfter: number
  /** Eval delta from the moving side's perspective (positive = good for mover) */
  delta: number
  category: MoveCategory
}

export const CLASSIFICATION_COLORS: Record<MoveCategory, string> = {
  brilliant: 'text-cyan-400',
  good: 'text-green-400',
  neutral: 'text-slate-300',
  inaccuracy: 'text-yellow-400',
  mistake: 'text-orange-400',
  blunder: 'text-red-400',
}

/** Dot colors for the legend (bg- variants) */
export const CLASSIFICATION_DOT_COLORS: Record<MoveCategory, string> = {
  brilliant: 'bg-cyan-400',
  good: 'bg-green-400',
  neutral: 'bg-slate-300',
  inaccuracy: 'bg-yellow-400',
  mistake: 'bg-orange-400',
  blunder: 'bg-red-400',
}

function categorize(delta: number): MoveCategory {
  // delta is from the moving side's perspective: positive = good for mover
  if (delta >= 150) return 'brilliant'
  if (delta >= 50) return 'good'
  if (delta >= -99) return 'neutral'
  if (delta >= -199) return 'inaccuracy'
  if (delta >= -399) return 'mistake'
  return 'blunder'
}

/**
 * Classify every move in a PGN by static eval change.
 * Returns one MoveClassification per move (index matches move number in the game).
 * Runs synchronously via quickEval — fast enough for 40-80 positions on main thread.
 * Wrapped in a Promise so callers can await it and show a loading state.
 */
export function classifyMoves(pgn: string, config: EvaluationConfig): Promise<MoveClassification[]> {
  return new Promise((resolve) => {
    // Use setTimeout to avoid blocking the UI during initial render
    setTimeout(() => {
      const results: MoveClassification[] = []

      try {
        const game = new Chess()
        game.loadPgn(pgn)
        const history = game.history()

        // Replay from the start, evaluating each position
        const replay = new Chess()
        let prevEval = quickEval(replay.fen(), config) // eval of starting position

        for (let i = 0; i < history.length; i++) {
          const san = history[i]
          const isWhiteMoving = replay.turn() === 'w'

          replay.move(san)
          const afterEval = quickEval(replay.fen(), config)

          // quickEval returns centipawns from white's perspective.
          // Delta from mover's perspective:
          // - If white moved: delta = afterEval - prevEval (positive = good for white)
          // - If black moved: delta = prevEval - afterEval (positive = good for black)
          const delta = isWhiteMoving
            ? afterEval - prevEval
            : prevEval - afterEval

          results.push({
            moveIndex: i,
            san,
            evalBefore: prevEval,
            evalAfter: afterEval,
            delta,
            category: categorize(delta),
          })

          prevEval = afterEval
        }
      } catch {
        // If PGN parsing fails, return empty — no classifications
      }

      resolve(results)
    }, 0)
  })
}
