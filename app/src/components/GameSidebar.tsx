import { Bot, Flag, FlipVertical, Handshake, HelpCircle, Undo2 } from 'lucide-react'
import { MoveHistoryPanel } from './MoveHistoryPanel'
import type { GameMode } from '../hooks/useGameState'

interface GameSidebarProps {
  mode: GameMode
  isGameOver: boolean
  isThinking: boolean
  getStatus: () => string
  game: { isCheck: () => boolean }
  // AI vs AI
  aivsaiIsRunning: boolean
  aivsaiIsPaused: boolean
  aivsaiDelay: number
  aivsaiSetDelay: (v: number) => void
  aivsaiStartAIvsAI: () => void
  aivsaiPauseAIvsAI: () => void
  aivsaiResumeAIvsAI: () => void
  // Draw
  drawAvailable: boolean
  drawReason: string | null | undefined
  handleClaimDraw: () => void
  // Controls
  setShowNewGameModal: (v: boolean) => void
  setFlipped: React.Dispatch<React.SetStateAction<boolean>>
  undoLastMove: (mode: GameMode, isRunning: boolean) => void
  handleResign: (mode: GameMode, playerColor: 'white' | 'black') => void
  playerColor: 'white' | 'black'
  // Human-vs-AI
  minMoveTime: number
  setMinMoveTime: (v: number) => void
  minMoveTimeRef: React.MutableRefObject<number>
  moveHistoryLength: number
  // Move input
  renderMoveInput: (variant: 'desktop') => React.ReactNode
  // Move history panel
  moveHistory: string[]
  viewIndex: number | null
  setViewIndex: (v: number | null) => void
  copied: boolean
  fenCopied: boolean
  handleCopyPGN: () => void
  handleCopyFEN: () => void
  navToStart: () => void
  navBack: () => void
  navForward: () => void
  navToLive: () => void
  isAtStart: boolean
  isLive: boolean
  totalHalfMoves: number
  cardGlass: string
  cardGlassStyle: React.CSSProperties
}

export function GameSidebar({
  mode, isGameOver, isThinking, getStatus, game,
  aivsaiIsRunning, aivsaiIsPaused, aivsaiDelay, aivsaiSetDelay,
  aivsaiStartAIvsAI, aivsaiPauseAIvsAI, aivsaiResumeAIvsAI,
  drawAvailable, drawReason, handleClaimDraw,
  setShowNewGameModal, setFlipped, undoLastMove, handleResign, playerColor,
  minMoveTime, setMinMoveTime, minMoveTimeRef, moveHistoryLength,
  renderMoveInput,
  moveHistory, viewIndex, setViewIndex, copied, fenCopied,
  handleCopyPGN, handleCopyFEN, navToStart, navBack, navForward, navToLive,
  isAtStart, isLive, totalHalfMoves, cardGlass, cardGlassStyle,
}: GameSidebarProps) {
  return (
    <div className="hidden lg:flex w-72 flex-col gap-3 p-3 overflow-y-auto shrink-0">
      {/* Status */}
      <div className={cardGlass} style={cardGlassStyle}>
        <div role="status" aria-live="polite" aria-atomic="true">
          <p className={`text-sm font-medium ${game.isCheck() ? 'text-red-400' : 'text-slate-300'}`}>
            {getStatus()}
          </p>
        </div>
        {mode === 'ai-vs-ai' && aivsaiIsRunning && !aivsaiIsPaused && (
          <p className="text-xs text-purple-400 mt-1 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> AI vs AI in progress</p>
        )}
        {mode === 'ai-vs-ai' && aivsaiIsPaused && (
          <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> Paused</p>
        )}
        {drawAvailable && !isGameOver && drawReason && (
          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><Handshake className="w-3.5 h-3.5" /> {drawReason}</p>
        )}
      </div>

      {/* Controls */}
      <div className={`${cardGlass} space-y-3`} style={cardGlassStyle}>
        <div className="flex gap-2">
          <button onClick={() => setShowNewGameModal(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm">New Game</button>
          <button onClick={() => setFlipped(f => !f)} className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white border border-slate-700" title="Flip board (F)" aria-label="Flip board">
            <FlipVertical className="w-4 h-4" />
          </button>
          <div className="relative group">
            <button className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white border border-slate-700" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">
              <HelpCircle className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl z-40">
              <p className="text-xs font-semibold text-slate-300 mb-2">Keyboard Shortcuts</p>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between"><span>Flip board</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">F</kbd></div>
                <div className="flex justify-between"><span>New game</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">N</kbd></div>
                <div className="flex justify-between"><span>Undo</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Ctrl+Z</kbd></div>
                <div className="flex justify-between"><span>← → moves</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Arrows</kbd></div>
              </div>
            </div>
          </div>
        </div>

        {mode === 'human-vs-ai' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">Move Delay</p>
              <span className="text-xs text-slate-400 font-mono">{minMoveTime === 0 ? 'Off' : `${(minMoveTime / 1000).toFixed(1)}s`}</span>
            </div>
            <input type="range" min={0} max={2000} step={250} value={minMoveTime} onChange={(e) => { setMinMoveTime(Number(e.target.value)); minMoveTimeRef.current = Number(e.target.value) }} aria-label="AI move delay" className="w-full h-1.5 accent-blue-500 cursor-pointer" />
            {!isGameOver && moveHistoryLength > 0 && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => undoLastMove(mode, aivsaiIsRunning)} disabled={moveHistoryLength === 0 || isThinking} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs" title="Undo move (U)" aria-label="Undo move">
                  <Undo2 className="w-3.5 h-3.5" /> Undo
                </button>
                <button onClick={() => handleResign(mode, playerColor)} disabled={isThinking} className="flex items-center justify-center gap-1.5 bg-red-900/40 hover:bg-red-800/50 disabled:bg-slate-800 disabled:text-slate-600 text-red-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-red-500/20" title="Resign" aria-label="Resign">
                  <Flag className="w-3.5 h-3.5" /> Resign
                </button>
              </div>
            )}
            {drawAvailable && !isGameOver && (
              <button onClick={handleClaimDraw} className="w-full flex items-center justify-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-amber-500/20 animate-pulse" title={drawReason ?? 'Claim draw'} aria-label={drawReason ?? 'Claim draw'}>
                <Handshake className="w-3.5 h-3.5" /> Claim Draw
              </button>
            )}
          </div>
        )}

        {mode === 'ai-vs-ai' && (
          <>
            <div className="flex gap-2">
              {!aivsaiIsRunning || isGameOver ? (
                <button onClick={aivsaiStartAIvsAI} disabled={isGameOver} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">▶ Start</button>
              ) : aivsaiIsPaused ? (
                <button onClick={aivsaiResumeAIvsAI} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">▶ Resume</button>
              ) : (
                <button onClick={aivsaiPauseAIvsAI} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">⏸ Pause</button>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">Move Delay</p>
                <span className="text-xs text-slate-400 font-mono">{aivsaiDelay}ms</span>
              </div>
              <input type="range" min={100} max={2000} step={100} value={aivsaiDelay} onChange={(e) => aivsaiSetDelay(Number(e.target.value))} aria-label="AI vs AI move delay" className="w-full h-1.5 accent-purple-500 cursor-pointer" />
            </div>
          </>
        )}
      </div>

      {/* Keyboard move input — desktop */}
      {renderMoveInput('desktop')}

      {/* Move History — desktop sidebar */}
      <MoveHistoryPanel
        variant="desktop"
        moveHistory={moveHistory}
        viewIndex={viewIndex}
        setViewIndex={setViewIndex}
        copied={copied}
        fenCopied={fenCopied}
        handleCopyPGN={handleCopyPGN}
        handleCopyFEN={handleCopyFEN}
        navToStart={navToStart}
        navBack={navBack}
        navForward={navForward}
        navToLive={navToLive}
        isAtStart={isAtStart}
        isLive={isLive}
        totalHalfMoves={totalHalfMoves}
        cardGlass={cardGlass}
        cardGlassStyle={cardGlassStyle}
      />
    </div>
  )
}
