import { User, Bot, Users, Swords } from 'lucide-react'

type GameMode = 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai'

interface ModeSelectorProps {
  mode: GameMode
  onModeChange: (mode: GameMode) => void
}

export type { GameMode }

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-400 mb-2">Game Mode</p>
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onModeChange('human-vs-ai')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            mode === 'human-vs-ai'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-1">
            <User className="w-5 h-5" />
            <span className="text-xs text-slate-500">vs</span>
            <Bot className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">Human vs AI</span>
        </button>
        <button
          onClick={() => onModeChange('human-vs-human')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            mode === 'human-vs-human'
              ? 'border-green-500 bg-green-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-1">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">Local 2P</span>
        </button>
        <button
          onClick={() => onModeChange('ai-vs-ai')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            mode === 'ai-vs-ai'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-1">
            <Swords className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">AI vs AI</span>
        </button>
      </div>
    </div>
  )
}
