import React from 'react'
import { ChevronDown, ChevronUp, Flag, FlipVertical, Handshake, Plus, ScrollText, Undo2 } from 'lucide-react'
import type { GameMode } from '../hooks/useGameState'

interface GameControlsProps {
  mode: GameMode
  isGameOver: boolean
  isThinking: boolean
  isRunning: boolean
  isPaused: boolean
  moveCount: number
  drawAvailable: boolean
  drawReason: string | null
  showMoveHistory: boolean
  // Callbacks
  onNewGame: () => void
  onFlip: () => void
  onUndo: () => void
  onResign: () => void
  onClaimDraw: () => void
  onToggleMoveHistory: () => void
  // AI vs AI
  onStartAI: () => void
  onPauseAI: () => void
  onResumeAI: () => void
}

export const GameControls = React.memo(function GameControls({
  mode,
  isGameOver,
  isThinking,
  isRunning,
  isPaused,
  moveCount,
  drawAvailable,
  drawReason,
  showMoveHistory,
  onNewGame,
  onFlip,
  onUndo,
  onResign,
  onClaimDraw,
  onToggleMoveHistory,
  onStartAI,
  onPauseAI,
  onResumeAI,
}: GameControlsProps) {
  return (
    <div className="flex gap-1.5 lg:hidden w-full max-w-xl shrink-0 pb-1">
      <button
        onClick={onNewGame}
        className="flex items-center justify-center gap-1 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium min-h-[44px] px-2 rounded-lg transition-colors text-xs"
        aria-label="New game"
      >
        <Plus className="w-3.5 h-3.5" />
        New
      </button>
      <button
        onClick={onFlip}
        className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs"
        aria-label="Flip board"
      >
        <FlipVertical className="w-3.5 h-3.5" />
      </button>
      {mode === 'human-vs-ai' && (
        <button
          onClick={onUndo}
          disabled={moveCount === 0 || isThinking || isGameOver}
          className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs"
          title="Undo move"
          aria-label="Undo move"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
      )}
      {mode === 'human-vs-ai' && !isGameOver && moveCount > 0 && (
        <button
          onClick={onResign}
          disabled={isThinking}
          className="flex items-center justify-center gap-1 bg-red-900/40 hover:bg-red-800/50 disabled:bg-slate-800 disabled:text-slate-600 text-red-300 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs border border-red-500/20"
          title="Resign"
          aria-label="Resign"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      )}
      {!isGameOver && drawAvailable && (
        <button
          onClick={onClaimDraw}
          className="flex items-center justify-center gap-1 bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs border border-amber-500/20 animate-pulse"
          title={drawReason ?? 'Claim draw'}
          aria-label={drawReason ?? 'Claim draw'}
        >
          <Handshake className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={onToggleMoveHistory}
        aria-label={showMoveHistory ? 'Hide move history' : 'Show move history'}
        className={`flex items-center justify-center gap-1 font-medium min-h-[44px] px-2 rounded-lg transition-colors text-xs ${
          showMoveHistory ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
        }`}
      >
        <ScrollText className="w-3.5 h-3.5" />
        {moveCount > 0 && <span>{moveCount}</span>}
        {showMoveHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
      {mode === 'ai-vs-ai' && (
        <>
          {!isRunning || isGameOver ? (
            <button onClick={onStartAI} disabled={isGameOver} aria-label="Start AI match" className="flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-medium min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs">▶</button>
          ) : isPaused ? (
            <button onClick={onResumeAI} aria-label="Resume AI match" className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-medium min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs">▶</button>
          ) : (
            <button onClick={onPauseAI} aria-label="Pause AI match" className="flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 text-white font-medium min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs">⏸</button>
          )}
        </>
      )}
    </div>
  )
})
