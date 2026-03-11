import { useState, useEffect, useRef } from 'react'
import { User, Bot, Users, Swords, X, Clock, Cpu } from 'lucide-react'
import { PRESETS, PRESET_NAMES } from '../engine/presets'
import type { PresetName } from '../engine/presets'
import type { EvaluationConfig, TimeControl } from '../engine/types'
import { TIME_CONTROLS } from '../engine/types'

import { getPersonalityAvatar } from '../hooks/useAIPersonality'
import { getSettings, updateSettings } from '../utils/settings'

type GameMode = 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai'
type PlayerColor = 'white' | 'black' | 'random'
type AISelection =
  | { type: 'preset'; key: PresetName }
  | { type: 'saved'; name: string }
  | { type: 'stockfish' }

interface SavedPersonality {
  name: string
  config: EvaluationConfig
  avatar: string | null
}

function getSavedPersonalities(): SavedPersonality[] {
  const prefix = 'chess-ai-personality:'
  const result: SavedPersonality[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) {
      try {
        const config = JSON.parse(localStorage.getItem(key)!) as EvaluationConfig
        if (!config.search) config.search = { depth: 4 }
        const name = key.slice(prefix.length)
        result.push({ name, config, avatar: getPersonalityAvatar(name) })
      } catch { /* skip invalid */ }
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

interface NewGameSettings {
  mode: GameMode
  playerColor: 'white' | 'black'
  aiConfig: EvaluationConfig
  aiPresetName: string
  whiteAIConfig: EvaluationConfig
  whiteAIPresetName: string
  blackAIConfig: EvaluationConfig
  blackAIPresetName: string
  searchDepth: number
  delay: number
  minMoveTime?: number
  timeControl: TimeControl
  useStockfish?: boolean
  stockfishSkillLevel?: number
  stockfishDepth?: number
  whiteUseStockfish?: boolean
  blackUseStockfish?: boolean
  whiteStockfishSkillLevel?: number
  whiteStockfishDepth?: number
  blackStockfishSkillLevel?: number
  blackStockfishDepth?: number
}

interface NewGameModalProps {
  onStart: (settings: NewGameSettings) => void
  onClose: () => void
}

export type { NewGameSettings }

function PresetCard({
  presetKey,
  selected,
  onClick,
}: {
  presetKey: PresetName
  selected: boolean
  onClick: () => void
}) {
  const preset = PRESETS[presetKey]
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      <div className="text-sm font-semibold text-white">{preset.label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{preset.description}</div>
    </button>
  )
}

function SavedPersonalityCard({
  name,
  avatar,
  selected,
  onClick,
}: {
  name: string
  avatar: string | null
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-green-500 bg-green-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
        {avatar && <span className="text-base">{avatar}</span>}
        {name}
      </div>
      <div className="text-xs text-green-400/60 mt-0.5">Custom</div>
    </button>
  )
}

function SavedPersonalitiesSection({
  saved,
  selection,
  onSelect,
}: {
  saved: SavedPersonality[]
  selection: AISelection
  onSelect: (name: string) => void
}) {
  if (saved.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-slate-500 mb-1.5">Saved Personalities</p>
      <div className="grid grid-cols-2 gap-2">
        {saved.map((sp) => (
          <SavedPersonalityCard
            key={sp.name}
            name={sp.name}
            avatar={sp.avatar}
            selected={selection.type === 'saved' && selection.name === sp.name}
            onClick={() => onSelect(sp.name)}
          />
        ))}
      </div>
    </div>
  )
}

export function NewGameModal({ onStart, onClose }: NewGameModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Dismiss on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const firstFocusable = modal.querySelector<HTMLElement>(focusableSelector)
    firstFocusable?.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = modal.querySelectorAll<HTMLElement>(focusableSelector)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleTab)
    return () => window.removeEventListener('keydown', handleTab)
  }, [])

  const [mode, setMode] = useState<GameMode>('human-vs-ai')
  const [playerColor, setPlayerColor] = useState<PlayerColor>('white')
  const [aiSelection, setAiSelection] = useState<AISelection>({ type: 'preset', key: 'DEFAULT' })
  const [searchDepth, setSearchDepth] = useState(4)
  const [whiteAISelection, setWhiteAISelection] = useState<AISelection>({ type: 'preset', key: 'DEFAULT' })
  const [blackAISelection, setBlackAISelection] = useState<AISelection>({ type: 'preset', key: 'AGGRESSIVE' })
  const [delay, setDelay] = useState(() => getSettings().aiMoveDelay)
  const [minMoveTime, setMinMoveTime] = useState(500)
  const [savedPersonalities] = useState(getSavedPersonalities)
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[0])
  const [stockfishSkillLevel, setStockfishSkillLevel] = useState(10)
  const [stockfishDepth, setStockfishDepth] = useState(10)
  const [whiteStockfishSkillLevel, setWhiteStockfishSkillLevel] = useState(10)
  const [whiteStockfishDepth, setWhiteStockfishDepth] = useState(10)
  const [blackStockfishSkillLevel, setBlackStockfishSkillLevel] = useState(10)
  const [blackStockfishDepth, setBlackStockfishDepth] = useState(10)

  function resolveAI(sel: AISelection, depth?: number): { config: EvaluationConfig; name: string } {
    if (sel.type === 'stockfish') {
      // Return default config as fallback; actual Stockfish moves bypass this
      const config = structuredClone(PRESETS.DEFAULT.config)
      return { config, name: 'Stockfish' }
    }
    if (sel.type === 'preset') {
      const preset = PRESETS[sel.key]
      const config = structuredClone(preset.config)
      if (depth !== undefined) config.search = { ...config.search, depth }
      return { config, name: preset.label }
    }
    const sp = savedPersonalities.find((p) => p.name === sel.name)!
    const config = structuredClone(sp.config)
    if (depth !== undefined) config.search = { ...config.search, depth }
    return { config, name: sp.name }
  }

  const handleStart = () => {
    updateSettings({ aiMoveDelay: delay })
    const resolvedColor: 'white' | 'black' =
      playerColor === 'random'
        ? (Math.random() < 0.5 ? 'white' : 'black')
        : playerColor

    const mainAI = resolveAI(aiSelection, searchDepth)
    const whiteAI = resolveAI(whiteAISelection)
    const blackAI = resolveAI(blackAISelection)

    onStart({
      mode,
      playerColor: resolvedColor,
      aiConfig: mainAI.config,
      aiPresetName: aiSelection.type === 'stockfish' ? 'Stockfish' : mainAI.name,
      whiteAIConfig: whiteAI.config,
      whiteAIPresetName: whiteAISelection.type === 'stockfish' ? 'Stockfish' : whiteAI.name,
      blackAIConfig: blackAI.config,
      blackAIPresetName: blackAISelection.type === 'stockfish' ? 'Stockfish' : blackAI.name,
      searchDepth,
      delay,
      minMoveTime,
      timeControl,
      useStockfish: aiSelection.type === 'stockfish',
      stockfishSkillLevel,
      stockfishDepth,
      whiteUseStockfish: whiteAISelection.type === 'stockfish',
      blackUseStockfish: blackAISelection.type === 'stockfish',
      whiteStockfishSkillLevel,
      whiteStockfishDepth,
      blackStockfishSkillLevel,
      blackStockfishDepth,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="New Game"
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">New Game</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Game Mode Selection */}
          <div>
            <p className="text-sm font-medium text-slate-400 mb-2">Game Mode</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMode('human-vs-ai')}
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
                onClick={() => setMode('human-vs-human')}
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
                onClick={() => setMode('ai-vs-ai')}
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

          {/* Human vs AI Options */}
          {mode === 'human-vs-ai' && (
            <>
              {/* Color Selection */}
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">Play as</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['white', 'black', 'random'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setPlayerColor(c)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                        playerColor === c
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

              {/* AI Personality */}
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">AI Personality</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_NAMES.map((key) => (
                    <PresetCard
                      key={key}
                      presetKey={key}
                      selected={aiSelection.type === 'preset' && aiSelection.key === key}
                      onClick={() => setAiSelection({ type: 'preset', key })}
                    />
                  ))}
                  {/* Stockfish card */}
                  <button
                    onClick={() => setAiSelection({ type: 'stockfish' })}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      aiSelection.type === 'stockfish'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-orange-400" />
                      Stockfish
                    </div>
                    <div className="text-xs text-orange-400/60 mt-0.5">Full-strength engine (WASM)</div>
                  </button>
                </div>
                <SavedPersonalitiesSection
                  saved={savedPersonalities}
                  selection={aiSelection}
                  onSelect={(name) => setAiSelection({ type: 'saved', name })}
                />
              </div>

              {/* Stockfish Strength Settings */}
              {aiSelection.type === 'stockfish' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-400">Strength</p>
                      <span className="text-sm text-slate-300 font-mono">
                        {stockfishSkillLevel <= 3 ? 'Beginner' : stockfishSkillLevel <= 8 ? 'Intermediate' : stockfishSkillLevel <= 14 ? 'Advanced' : stockfishSkillLevel <= 18 ? 'Master' : 'Maximum'}
                        {' '}({stockfishSkillLevel})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={stockfishSkillLevel}
                      onChange={(e) => setStockfishSkillLevel(Number(e.target.value))}
                      aria-label="Stockfish strength"
                      className="w-full h-1.5 accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>Beginner</span>
                      <span>Maximum</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-400">Search Depth</p>
                      <span className="text-sm text-slate-300 font-mono">{stockfishDepth}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={stockfishDepth}
                      onChange={(e) => setStockfishDepth(Number(e.target.value))}
                      aria-label="Stockfish search depth"
                      className="w-full h-1.5 accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>Fast</span>
                      <span>Strong</span>
                    </div>
                  </div>
                </>
              )}

              {/* Search Depth (for custom AI only, not Stockfish) */}
              {aiSelection.type !== 'stockfish' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-400">Search Depth</p>
                  <span className="text-sm text-slate-300 font-mono">{searchDepth}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={searchDepth}
                  onChange={(e) => setSearchDepth(Number(e.target.value))}
                  aria-label="Search depth"
                  className="w-full h-1.5 accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Fast</span>
                  <span>Strong</span>
                </div>
              </div>
              )}

              {/* AI Move Delay */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-400">AI Move Delay</p>
                  <span className="text-sm text-slate-300 font-mono">
                    {minMoveTime === 0 ? 'Off' : `${(minMoveTime / 1000).toFixed(1)}s`}
                  </span>
                </div>
                aria-label="AI move delay"
                <p className="text-[10px] text-slate-500 mb-1.5">Minimum time before AI responds</p>
                <input
                  type="range"
                  min={0}
                  max={3000}
                  step={250}
                  value={minMoveTime}
                  onChange={(e) => setMinMoveTime(Number(e.target.value))}
                  className="w-full h-1.5 accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Off</span>
                  <span>3.0s</span>
                </div>
              </div>
            </>
          )}

          {/* AI vs AI Options */}
          {mode === 'ai-vs-ai' && (
            <>
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white mr-1.5" />
                  White AI
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_NAMES.map((key) => (
                    <PresetCard
                      key={key}
                      presetKey={key}
                      selected={whiteAISelection.type === 'preset' && whiteAISelection.key === key}
                      onClick={() => setWhiteAISelection({ type: 'preset', key })}
                    />
                  ))}
                  {/* Stockfish card */}
                  <button
                    onClick={() => setWhiteAISelection({ type: 'stockfish' })}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      whiteAISelection.type === 'stockfish'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-orange-400" />
                      Stockfish
                    </div>
                    <div className="text-xs text-orange-400/60 mt-0.5">Full-strength engine (WASM)</div>
                  </button>
                </div>
                <SavedPersonalitiesSection
                  saved={savedPersonalities}
                  selection={whiteAISelection}
                  onSelect={(name) => setWhiteAISelection({ type: 'saved', name })}
                />
                {whiteAISelection.type === 'stockfish' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-400">Strength</p>
                        <span className="text-sm text-slate-300 font-mono">
                          {whiteStockfishSkillLevel <= 3 ? 'Beginner' : whiteStockfishSkillLevel <= 8 ? 'Intermediate' : whiteStockfishSkillLevel <= 14 ? 'Advanced' : whiteStockfishSkillLevel <= 18 ? 'Master' : 'Maximum'}
                          {' '}({whiteStockfishSkillLevel})
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={whiteStockfishSkillLevel}
                        onChange={(e) => setWhiteStockfishSkillLevel(Number(e.target.value))}
                        aria-label="White Stockfish strength"
                        className="w-full h-1.5 accent-orange-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      aria-label="White Stockfish search depth"
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-400">Search Depth</p>
                        <span className="text-sm text-slate-300 font-mono">{whiteStockfishDepth}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={whiteStockfishDepth}
                        onChange={(e) => setWhiteStockfishDepth(Number(e.target.value))}
                        className="w-full h-1.5 accent-orange-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400 mr-1.5" />
                  Black AI
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_NAMES.map((key) => (
                    <PresetCard
                      key={key}
                      presetKey={key}
                      selected={blackAISelection.type === 'preset' && blackAISelection.key === key}
                      onClick={() => setBlackAISelection({ type: 'preset', key })}
                    />
                  ))}
                  {/* Stockfish card */}
                  <button
                    onClick={() => setBlackAISelection({ type: 'stockfish' })}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      blackAISelection.type === 'stockfish'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-orange-400" />
                      Stockfish
                    </div>
                    <div className="text-xs text-orange-400/60 mt-0.5">Full-strength engine (WASM)</div>
                  </button>
                </div>
                <SavedPersonalitiesSection
                  saved={savedPersonalities}
                  selection={blackAISelection}
                  onSelect={(name) => setBlackAISelection({ type: 'saved', name })}
                />
                {blackAISelection.type === 'stockfish' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-400">Strength</p>
                        aria-label="Black Stockfish strength"
                        <span className="text-sm text-slate-300 font-mono">
                          {blackStockfishSkillLevel <= 3 ? 'Beginner' : blackStockfishSkillLevel <= 8 ? 'Intermediate' : blackStockfishSkillLevel <= 14 ? 'Advanced' : blackStockfishSkillLevel <= 18 ? 'Master' : 'Maximum'}
                          {' '}({blackStockfishSkillLevel})
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={blackStockfishSkillLevel}
                        onChange={(e) => setBlackStockfishSkillLevel(Number(e.target.value))}
                        className="w-full h-1.5 accent-orange-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      aria-label="Black Stockfish search depth"
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-400">Search Depth</p>
                        <span className="text-sm text-slate-300 font-mono">{blackStockfishDepth}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={blackStockfishDepth}
                        onChange={(e) => setBlackStockfishDepth(Number(e.target.value))}
                        className="w-full h-1.5 accent-orange-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Speed Slider */}
              <div>
                aria-label="Move delay"
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-400">Move Delay</p>
                  <span className="text-sm text-slate-300 font-mono">{delay}ms</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="w-full h-1.5 accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Fast</span>
                  <span>Slow</span>
                </div>
              </div>
            </>
          )}

          {/* Local 2P — nothing to configure */}
          {mode === 'human-vs-human' && (
            <div className="text-center text-slate-400 text-sm py-4">
              Local two-player game on the same device. White moves first.
            </div>
          )}

          {/* Time Control (all modes) */}
          {mode !== 'ai-vs-ai' && (
            <div>
              <p className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Time Control
              </p>
              <div className="grid grid-cols-4 gap-2">
                {TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc.label}
                    onClick={() => setTimeControl(tc)}
                    className={`py-2 px-2 rounded-lg text-center transition-all border-2 ${
                      timeControl.label === tc.label
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">{tc.label.split(' ')[0]}</div>
                    {tc.type !== 'none' && (
                      <div className="text-[10px] text-slate-400">{tc.label.split(' ').slice(1).join(' ')}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            className={`w-full py-3 rounded-xl font-bold text-lg transition-colors ${
              mode === 'human-vs-ai'
                ? 'bg-blue-600 hover:bg-blue-700'
                : mode === 'human-vs-human'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
            } text-white`}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  )
}
