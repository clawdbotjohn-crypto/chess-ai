import React from 'react'
import { Bot, Cpu, Loader, User } from 'lucide-react'

export interface PlayerBarInfo {
  icon: 'bot' | 'cpu' | 'user'
  name: string
  avatar: string | null
  badge?: string
  badgeClass: string
  iconGradient: string
  showThinking: boolean
  showStats: boolean
}

interface PlayerBarProps {
  bar: PlayerBarInfo
  captured: string[]
  isTurn: boolean
  isGameOver: boolean
  isThinking: boolean
  activeSearchDepth: { current: number; max: number } | null
  lastMoveStats: { nodes: number; timeMs: number; isBookMove?: boolean } | null
  searchDepth: number
  timeControl: { type: string }
  timeLeftMs: number
  moveCount: number
  mode: string
  color: 'white' | 'black'
  playerColor: 'white' | 'black'
  formatTime: (ms: number) => string
}

export const PlayerBar = React.memo(function PlayerBar({
  bar,
  captured,
  isTurn,
  isGameOver,
  isThinking,
  activeSearchDepth,
  lastMoveStats,
  searchDepth,
  timeControl,
  timeLeftMs,
  moveCount,
  mode,
  color,
  playerColor,
  formatTime,
}: PlayerBarProps) {
  return (
    <div className="w-full flex items-center justify-between px-1 py-2">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bar.iconGradient} flex items-center justify-center`}>
          {bar.avatar ? (
            <span className="text-xl">{bar.avatar}</span>
          ) : bar.icon === 'cpu' ? <Cpu className="w-5 h-5 text-white" /> : bar.icon === 'bot' ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
        </div>
        <div>
          <p className="font-medium flex items-center gap-2">
            {bar.name}
            {bar.badge && (
              <span className={`text-xs ${bar.badgeClass} px-2 py-0.5 rounded-full`}>{bar.badge}</span>
            )}
          </p>
          <div className="flex items-center gap-1 text-sm text-slate-400">
            {captured.length > 0 ? (
              <span className="text-base tracking-tight">{captured.join('')}</span>
            ) : (
              <span className="text-xs text-slate-600">No captures</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {bar.showThinking && isThinking && !isGameOver && (
          <span className="text-xs text-yellow-400 animate-pulse flex items-center gap-1">
            <Loader className="w-3 h-3 animate-spin" /> Thinking{activeSearchDepth ? ` d${activeSearchDepth.current}/${activeSearchDepth.max}` : '...'}
          </span>
        )}
        {!bar.showThinking && isTurn && !isThinking && timeControl.type === 'none' && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {mode === 'human-vs-ai' && color === playerColor ? 'Your turn' : 'To move'}
          </span>
        )}
        {bar.showStats && !isThinking && lastMoveStats && !isGameOver && timeControl.type === 'none' && (
          <span className="text-xs text-slate-500">
            {lastMoveStats.isBookMove
              ? '📖 Book'
              : <>D{searchDepth} · {lastMoveStats.nodes.toLocaleString()}n · {(lastMoveStats.timeMs / 1000).toFixed(1)}s</>
            }
          </span>
        )}
        {timeControl.type !== 'none' && (() => {
          const ms = timeLeftMs
          const isCritical = ms > 0 && ms < 10000
          const isLow = ms > 0 && ms < 30000
          const expired = ms <= 0 && moveCount > 0
          return (
            <div className={`font-mono text-lg font-semibold px-3 py-1 rounded-lg transition-colors ${
              isTurn ? 'bg-slate-700/80' : 'bg-slate-800/40'
            } ${
              expired ? 'text-red-500' :
              isCritical ? 'text-red-400 animate-pulse ring-1 ring-red-500/50' :
              isLow ? 'text-orange-400 animate-pulse' :
              isTurn ? 'text-white' : 'text-slate-400'
            }`}>
              {expired ? '0:00' : formatTime(ms)}
            </div>
          )
        })()}
      </div>
    </div>
  )
})
