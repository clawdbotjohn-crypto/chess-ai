import { User, Bot, Play, Pause, RotateCcw } from 'lucide-react'

interface GameModeControlsProps {
  mode: 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai';
  onModeChange: (mode: 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai') => void;
  isRunning: boolean;
  isPaused: boolean;
  delay: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onDelayChange: (delay: number) => void;
  gameOver: boolean;
}

export function GameModeControls({
  mode,
  onModeChange,
  isRunning,
  isPaused,
  delay,
  onStart,
  onPause,
  onResume,
  onReset,
  onDelayChange,
  gameOver,
}: GameModeControlsProps) {
  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5">Game Mode</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onModeChange('human-vs-ai')}
            className={`text-sm py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
              mode === 'human-vs-ai'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <User className="w-4 h-4" /> vs <Bot className="w-4 h-4" />
          </button>
          <button
            onClick={() => onModeChange('human-vs-human')}
            className={`text-sm py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
              mode === 'human-vs-human'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <User className="w-4 h-4" /> vs <User className="w-4 h-4" />
          </button>
          <button
            onClick={() => onModeChange('ai-vs-ai')}
            className={`text-sm py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
              mode === 'ai-vs-ai'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Bot className="w-4 h-4" /> vs <Bot className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI vs AI Controls */}
      {mode === 'ai-vs-ai' && (
        <>
          {/* Speed Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">Move Delay</p>
              <span className="text-xs text-slate-400 font-mono">{delay}ms</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={delay}
              onChange={(e) => onDelayChange(Number(e.target.value))}
              className="w-full h-1.5 accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Fast</span>
              <span>Slow</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2">
            {!isRunning || gameOver ? (
              <button
                onClick={onStart}
                disabled={gameOver}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 px-4 rounded transition-colors text-sm flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Start
              </button>
            ) : isPaused ? (
              <button
                onClick={onResume}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm flex items-center justify-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            )}
            <button
              onClick={onReset}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded transition-colors text-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
