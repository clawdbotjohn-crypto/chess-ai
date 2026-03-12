import { Cpu } from 'lucide-react'
import { PRESETS, PRESET_NAMES } from '../../engine/presets'
import type { PresetName } from '../../engine/presets'
import type { EvaluationConfig } from '../../engine/types'
import { getPersonalityAvatar } from '../../hooks/useAIPersonality'

type AISelection =
  | { type: 'preset'; key: PresetName }
  | { type: 'saved'; name: string }
  | { type: 'stockfish' }

interface SavedPersonality {
  name: string
  config: EvaluationConfig
  avatar: string | null
}

interface StockfishConfig {
  skillLevel: number
  depth: number
}

interface AIConfigSectionProps {
  label: React.ReactNode
  selection: AISelection
  onSelectionChange: (sel: AISelection) => void
  savedPersonalities: SavedPersonality[]
  stockfishConfig: StockfishConfig
  onStockfishConfigChange: (config: StockfishConfig) => void
}

export type { AISelection, SavedPersonality, StockfishConfig }

export function getSavedPersonalities(): SavedPersonality[] {
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

function StockfishSettings({
  config,
  onChange,
  labelPrefix,
}: {
  config: StockfishConfig
  onChange: (config: StockfishConfig) => void
  labelPrefix?: string
}) {
  const prefix = labelPrefix ? `${labelPrefix} ` : ''
  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-slate-400">Strength</p>
          <span className="text-sm text-slate-300 font-mono">
            {config.skillLevel <= 3 ? 'Beginner' : config.skillLevel <= 8 ? 'Intermediate' : config.skillLevel <= 14 ? 'Advanced' : config.skillLevel <= 18 ? 'Master' : 'Maximum'}
            {' '}({config.skillLevel})
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          value={config.skillLevel}
          onChange={(e) => onChange({ ...config, skillLevel: Number(e.target.value) })}
          aria-label={`${prefix}Stockfish strength`}
          className="w-full h-1.5 accent-orange-500 cursor-pointer"
        />
        {!labelPrefix && (
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Beginner</span>
            <span>Maximum</span>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-slate-400">Search Depth</p>
          <span className="text-sm text-slate-300 font-mono">{config.depth}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={config.depth}
          onChange={(e) => onChange({ ...config, depth: Number(e.target.value) })}
          aria-label={`${prefix}Stockfish search depth`}
          className="w-full h-1.5 accent-orange-500 cursor-pointer"
        />
        {!labelPrefix && (
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Fast</span>
            <span>Strong</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function AIConfigSection({
  label,
  selection,
  onSelectionChange,
  savedPersonalities,
  stockfishConfig,
  onStockfishConfigChange,
}: AIConfigSectionProps) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-400 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {PRESET_NAMES.map((key) => (
          <PresetCard
            key={key}
            presetKey={key}
            selected={selection.type === 'preset' && selection.key === key}
            onClick={() => onSelectionChange({ type: 'preset', key })}
          />
        ))}
        {/* Stockfish card */}
        <button
          onClick={() => onSelectionChange({ type: 'stockfish' })}
          className={`text-left p-3 rounded-lg border-2 transition-all ${
            selection.type === 'stockfish'
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
        selection={selection}
        onSelect={(name) => onSelectionChange({ type: 'saved', name })}
      />
      {selection.type === 'stockfish' && (
        <StockfishSettings
          config={stockfishConfig}
          onChange={onStockfishConfigChange}
        />
      )}
    </div>
  )
}
