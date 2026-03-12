import React from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, ScrollText } from 'lucide-react'

interface MoveHistoryPanelProps {
  moveHistory: string[]
  viewIndex: number | null
  setViewIndex: (index: number | null) => void
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
  // Mobile overlay props
  variant: 'desktop' | 'mobile'
  onClose?: () => void
  cardGlass?: string
  cardGlassStyle?: React.CSSProperties
}

export const MoveHistoryPanel = React.memo(function MoveHistoryPanel({
  moveHistory,
  viewIndex,
  setViewIndex,
  copied,
  fenCopied,
  handleCopyPGN,
  handleCopyFEN,
  navToStart,
  navBack,
  navForward,
  navToLive,
  isAtStart,
  isLive,
  totalHalfMoves,
  variant,
  onClose,
  cardGlass,
  cardGlassStyle,
}: MoveHistoryPanelProps) {
  if (variant === 'mobile') {
    return (
      <div className="lg:hidden absolute bottom-14 left-0 right-0 z-30 px-2 pb-1">
        <div className="rounded-xl border border-white/[0.08] p-3 max-h-48 overflow-y-auto" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.98))', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-xs text-slate-400 flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5" />
              Moves ({moveHistory.length})
            </h3>
            <div className="flex items-center gap-2">
              {moveHistory.length > 0 && (
                <button onClick={handleCopyPGN} className="text-slate-400 hover:text-white transition-colors" title="Copy PGN" aria-label="Copy PGN">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
              <button onClick={onClose} aria-label="Close move history" className="text-slate-400 hover:text-white">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <MoveList moveHistory={moveHistory} viewIndex={viewIndex} setViewIndex={setViewIndex} size="small" />
          <NavButtons
            navToStart={navToStart} navBack={navBack} navForward={navForward} navToLive={navToLive}
            isAtStart={isAtStart} isLive={isLive} totalHalfMoves={totalHalfMoves}
            size="mobile"
          />
        </div>
      </div>
    )
  }

  // Desktop sidebar
  return (
    <div className={`${cardGlass} flex-1 flex flex-col min-h-0`} style={cardGlassStyle}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-slate-400 flex items-center gap-2">
          <ScrollText className="w-4 h-4" />
          Moves
          <span className="text-xs text-slate-600 font-normal">{moveHistory.length}</span>
        </h3>
        {moveHistory.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={handleCopyFEN} className="text-slate-400 hover:text-white transition-colors" title="Copy FEN" aria-label="Copy FEN">
              {fenCopied ? <Check className="w-4 h-4 text-green-400" /> : <span className="text-[10px] font-mono font-bold">FEN</span>}
            </button>
            <button onClick={handleCopyPGN} className="text-slate-400 hover:text-white transition-colors" title="Copy PGN" aria-label="Copy PGN">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
      <div className="overflow-y-auto flex-1 font-mono text-sm space-y-0.5 min-h-0">
        <MoveList moveHistory={moveHistory} viewIndex={viewIndex} setViewIndex={setViewIndex} size="normal" />
      </div>
      <NavButtons
        navToStart={navToStart} navBack={navBack} navForward={navForward} navToLive={navToLive}
        isAtStart={isAtStart} isLive={isLive} totalHalfMoves={totalHalfMoves}
        size="desktop"
      />
    </div>
  )
})

function MoveList({ moveHistory, viewIndex, setViewIndex, size }: {
  moveHistory: string[]
  viewIndex: number | null
  setViewIndex: (index: number | null) => void
  size: 'small' | 'normal'
}) {
  const textClass = size === 'small' ? 'font-mono text-xs space-y-0.5' : ''
  const rowPadding = size === 'small' ? 'py-0.5 px-1' : 'py-1 px-2'
  const numWidth = size === 'small' ? 'w-6' : 'w-7'

  if (moveHistory.length === 0) {
    return <p className={`text-slate-500 italic ${size === 'small' ? 'text-xs' : 'text-xs'}`}>No moves yet</p>
  }

  return (
    <div className={textClass}>
      {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
        <div key={i} className={`flex items-center ${rowPadding} hover:bg-slate-800/50 rounded transition-colors`}>
          <span className={`text-slate-500 ${numWidth}`}>{i + 1}.</span>
          <span
            className={`flex-1 cursor-pointer rounded px-1 transition-colors ${
              viewIndex === i * 2 + 1
                ? 'bg-blue-500/30 text-blue-200'
                : viewIndex === null && i * 2 === moveHistory.length - 1 && moveHistory.length % 2 === 1
                ? 'text-white'
                : 'text-white hover:bg-slate-700/50'
            }`}
            onClick={() => setViewIndex(i * 2 + 1)}
          >{moveHistory[i * 2]}</span>
          <span
            className={`flex-1 cursor-pointer rounded px-1 transition-colors ${
              moveHistory[i * 2 + 1]
                ? viewIndex === i * 2 + 2
                  ? 'bg-blue-500/30 text-blue-200'
                  : 'text-slate-400 hover:bg-slate-700/50'
                : 'text-slate-600'
            }`}
            onClick={() => moveHistory[i * 2 + 1] && setViewIndex(i * 2 + 2)}
          >{moveHistory[i * 2 + 1] ?? (size === 'normal' && i * 2 + 1 >= moveHistory.length ? '...' : '')}</span>
        </div>
      ))}
    </div>
  )
}

function NavButtons({ navToStart, navBack, navForward, navToLive, isAtStart, isLive, totalHalfMoves, size }: {
  navToStart: () => void
  navBack: () => void
  navForward: () => void
  navToLive: () => void
  isAtStart: boolean
  isLive: boolean
  totalHalfMoves: number
  size: 'mobile' | 'desktop'
}) {
  const isMobile = size === 'mobile'
  const iconSize = isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const btnClass = isMobile ? 'flex-1 min-h-[44px] min-w-[44px] p-1.5 rounded transition' : 'flex-1 p-1.5 rounded-lg transition'
  const disabledStartClass = isAtStart || totalHalfMoves === 0
  const disabledEndClass = isLive || totalHalfMoves === 0

  return (
    <div className={`flex items-center ${isMobile ? 'gap-1 mt-2 pt-2' : 'gap-2 mt-2 pt-2'} border-t border-slate-700/50 shrink-0`}>
      <button onClick={navToStart} disabled={disabledStartClass} className={`${btnClass} ${disabledStartClass ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="First move" aria-label="First move"><ChevronsLeft className={`${iconSize} mx-auto`} /></button>
      <button onClick={navBack} disabled={disabledStartClass} className={`${btnClass} ${disabledStartClass ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Previous move" aria-label="Previous move"><ChevronLeft className={`${iconSize} mx-auto`} /></button>
      <button onClick={navForward} disabled={disabledEndClass} className={`${btnClass} ${disabledEndClass ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Next move" aria-label="Next move"><ChevronRight className={`${iconSize} mx-auto`} /></button>
      <button onClick={navToLive} disabled={disabledEndClass} className={`${btnClass} ${disabledEndClass ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Live position" aria-label="Live position"><ChevronsRight className={`${iconSize} mx-auto`} /></button>
    </div>
  )
}
