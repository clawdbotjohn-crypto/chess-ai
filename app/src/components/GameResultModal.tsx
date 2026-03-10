import { useEffect, useRef, useState } from 'react'
import { Trophy, Scale, Clock, Plus, BarChart3, Copy, Check, X, Share2 } from 'lucide-react'

interface GameResultModalProps {
  result: { title: string; message: string }
  moveCount: number
  durationMs: number
  openingName?: string | null
  gameId?: string | null
  pgn: string
  onNewGame: () => void
  onAnalyze: () => void
  onDismiss: () => void
}

export function GameResultModal({
  result,
  moveCount,
  durationMs,
  openingName,
  gameId,
  pgn,
  onNewGame,
  onAnalyze,
  onDismiss,
}: GameResultModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const isWin = result.title.includes('Checkmate') || result.title.includes('Time')
  const isDraw = result.title.includes('Draw') || result.title.includes('Stalemate')

  const iconBg = isWin
    ? 'from-amber-500 to-yellow-600'
    : isDraw
      ? 'from-slate-400 to-slate-500'
      : 'from-blue-500 to-cyan-600'

  const Icon = result.title.includes('Time') ? Clock
    : isWin ? Trophy
    : Scale

  // Dismiss on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  // Click outside to dismiss
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onDismiss()
    }
  }

  const handleCopyPGN = () => {
    navigator.clipboard.writeText(pgn).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyLink = () => {
    if (!gameId) return
    const url = `https://nice-desert-0df9bdf1e.4.azurestaticapps.net/analysis/${gameId}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000)
    if (totalSec < 60) return `${totalSec}s`
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    if (mins < 60) return `${mins}m ${secs}s`
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}h ${remMins}m`
  }

  const fullMoves = Math.ceil(moveCount / 2)

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      style={{ animation: 'gameOverFadeIn 0.3s ease-out' }}
    >
      <style>{`
        @keyframes gameOverFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gameOverSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4 shadow-2xl text-center relative"
        style={{ animation: 'gameOverSlideUp 0.3s ease-out' }}
      >
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Result */}
        <h2 className="text-2xl font-bold mb-1 text-white">{result.title}</h2>
        <p className="text-base font-medium text-slate-300 mb-4">{result.message}</p>

        {/* Game Summary */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 mb-5 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Moves</span>
            <span className="text-slate-200 font-medium">{fullMoves}</span>
          </div>
          {durationMs > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Duration</span>
              <span className="text-slate-200 font-medium">{formatDuration(durationMs)}</span>
            </div>
          )}
          {openingName && (
            <div className="flex justify-between text-slate-400">
              <span>Opening</span>
              <span className="text-slate-200 font-medium text-right max-w-[60%] truncate" title={openingName}>{openingName}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onNewGame}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            New Game
          </button>
          {gameId && (
            <button
              onClick={onAnalyze}
              className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm border border-slate-600/30"
            >
              <BarChart3 className="w-4 h-4" />
              Analyze
            </button>
          )}
          <button
            onClick={handleCopyPGN}
            className="bg-slate-700/80 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm border border-slate-600/30"
            title="Copy PGN"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          {gameId && (
            <button
              onClick={handleCopyLink}
              className="bg-slate-700/80 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm border border-slate-600/30"
              title="Copy analysis link"
            >
              {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
