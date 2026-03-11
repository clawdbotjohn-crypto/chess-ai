import { memo } from 'react'

/**
 * EvalBar — Vertical evaluation bar showing who's winning
 * Displayed alongside the chessboard when enabled in settings
 */

interface EvalBarProps {
  /** Evaluation in centipawns from white's perspective */
  evaluation: number
  /** Whether board is flipped (black at bottom) */
  flipped: boolean
}

export const EvalBar = memo(function EvalBar({ evaluation, flipped }: EvalBarProps) {
  // Clamp eval to [-10, 10] pawns for display, then map to percentage
  const clampedEval = Math.max(-1000, Math.min(1000, evaluation))
  // Sigmoid-like mapping: ±5 pawns ≈ 90%
  const whitePercent = 50 + 50 * (2 / (1 + Math.exp(-clampedEval / 200)) - 1)

  // If flipped, black is at bottom, so white bar grows from top
  const topPercent = flipped ? whitePercent : (100 - whitePercent)
  const bottomPercent = 100 - topPercent

  // Format eval text — mate shows move count (M3, -M5)
  const evalText = Math.abs(evaluation) >= 10000
    ? (evaluation > 0 ? 'M' + Math.ceil(Math.abs(evaluation) / 100) : '-M' + Math.ceil(Math.abs(evaluation) / 100))
    : (evaluation >= 0 ? '+' : '') + (evaluation / 100).toFixed(1)

  const whiteWinning = evaluation > 0
  const showOnTop = flipped ? whiteWinning : !whiteWinning

  return (
    <div
      className="relative w-7 rounded-sm overflow-hidden flex flex-col border border-slate-600/30"
      style={{ minHeight: '100%' }}
      title={`${evalText} ${evaluation > 10 ? '(White is better)' : evaluation < -10 ? '(Black is better)' : '(Equal)'}`}
    >
      {/* Top portion */}
      <div
        className={flipped ? 'bg-gradient-to-b from-white to-gray-200' : 'bg-gradient-to-b from-slate-800 to-slate-700'}
        style={{ flex: `${topPercent} 0 0`, transition: 'flex 0.5s ease-out', minHeight: '2%' }}
      />
      {/* Bottom portion */}
      <div
        className={flipped ? 'bg-gradient-to-b from-slate-700 to-slate-800' : 'bg-gradient-to-b from-gray-200 to-white'}
        style={{ flex: `${bottomPercent} 0 0`, transition: 'flex 0.5s ease-out', minHeight: '2%' }}
      />
      {/* Midpoint indicator */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-px h-px bg-blue-400/20" />
      {/* Eval text */}
      <div
        className={`absolute left-0 right-0 flex items-center justify-center ${
          showOnTop ? 'top-1' : 'bottom-1'
        }`}
      >
        <span
          className={`text-[9px] font-mono font-bold leading-none ${
            showOnTop
              ? (flipped ? 'text-slate-700' : 'text-slate-300')
              : (flipped ? 'text-slate-300' : 'text-slate-700')
          }`}
        >
          {evalText}
        </span>
      </div>
    </div>
  )
})
