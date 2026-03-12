import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { PRESETS } from '../engine/presets'
import type { EvaluationConfig, TimeControl } from '../engine/types'
import { TIME_CONTROLS } from '../engine/types'
import { getSettings, updateSettings } from '../utils/settings'

import {
  ModeSelector,
  TimeControlSelector,
  AIConfigSection,
  ColorSelector,
  getSavedPersonalities,
} from './newgame'
import type { GameMode, AISelection, PlayerColor } from './newgame'

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
          <ModeSelector mode={mode} onModeChange={setMode} />

          {/* Human vs AI Options */}
          {mode === 'human-vs-ai' && (
            <>
              <ColorSelector color={playerColor} onColorChange={setPlayerColor} />

              <AIConfigSection
                label="AI Personality"
                selection={aiSelection}
                onSelectionChange={setAiSelection}
                savedPersonalities={savedPersonalities}
                stockfishConfig={{ skillLevel: stockfishSkillLevel, depth: stockfishDepth }}
                onStockfishConfigChange={(c) => { setStockfishSkillLevel(c.skillLevel); setStockfishDepth(c.depth) }}
              />

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
                <p className="text-[10px] text-slate-500 mb-1.5">Minimum time before AI responds</p>
                <input
                  type="range"
                  min={0}
                  max={3000}
                  step={250}
                  value={minMoveTime}
                  onChange={(e) => setMinMoveTime(Number(e.target.value))}
                  aria-label="AI move delay"
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
              <AIConfigSection
                label={
                  <>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white mr-1.5" />
                    White AI
                  </>
                }
                selection={whiteAISelection}
                onSelectionChange={setWhiteAISelection}
                savedPersonalities={savedPersonalities}
                stockfishConfig={{ skillLevel: whiteStockfishSkillLevel, depth: whiteStockfishDepth }}
                onStockfishConfigChange={(c) => { setWhiteStockfishSkillLevel(c.skillLevel); setWhiteStockfishDepth(c.depth) }}
              />

              <AIConfigSection
                label={
                  <>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400 mr-1.5" />
                    Black AI
                  </>
                }
                selection={blackAISelection}
                onSelectionChange={setBlackAISelection}
                savedPersonalities={savedPersonalities}
                stockfishConfig={{ skillLevel: blackStockfishSkillLevel, depth: blackStockfishDepth }}
                onStockfishConfigChange={(c) => { setBlackStockfishSkillLevel(c.skillLevel); setBlackStockfishDepth(c.depth) }}
              />

              {/* Speed Slider */}
              <div>
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
                  aria-label="Move delay"
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

          {/* Time Control (all modes except AI vs AI) */}
          {mode !== 'ai-vs-ai' && (
            <TimeControlSelector timeControl={timeControl} onTimeControlChange={setTimeControl} />
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
