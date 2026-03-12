type PlayerColor = 'white' | 'black' | 'random'

interface ColorSelectorProps {
  color: PlayerColor
  onColorChange: (color: PlayerColor) => void
}

export type { PlayerColor }

export function ColorSelector({ color, onColorChange }: ColorSelectorProps) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-400 mb-2">Play as</p>
      <div className="grid grid-cols-3 gap-2">
        {(['white', 'black', 'random'] as const).map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
              color === c
                ? 'border-blue-500 bg-blue-500/10 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            {c === 'white' && (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white inline-block" />
                White
              </span>
            )}
            {c === 'black' && (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                Black
              </span>
            )}
            {c === 'random' && '🎲 Random'}
          </button>
        ))}
      </div>
    </div>
  )
}
