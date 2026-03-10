import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { Search, Plus, Play, Pencil, Trash2, Scale, Swords, Shield, Dices, Crosshair, Target, Copy, Check, Download } from 'lucide-react'
import { PRESETS, type PresetName } from '../engine/presets'
import type { EvaluationConfig } from '../engine/types'

const STORAGE_PREFIX = 'chess-ai-personality-'

interface SavedPersonality {
  name: string
  key: string
  config: unknown
}

const presetIcons: Record<PresetName, { icon: typeof Scale; color: string }> = {
  DEFAULT: { icon: Scale, color: 'blue' },
  AGGRESSIVE: { icon: Swords, color: 'red' },
  DEFENSIVE: { icon: Shield, color: 'green' },
  CHAOTIC: { icon: Dices, color: 'purple' },
  TACTICAL: { icon: Crosshair, color: 'amber' },
  POSITIONAL: { icon: Target, color: 'cyan' },
}

// Static Tailwind classes — dynamic construction breaks JIT purging
const colorStyles: Record<string, { iconBg: string; iconText: string }> = {
  blue:   { iconBg: 'bg-blue-600/20',   iconText: 'text-blue-400' },
  red:    { iconBg: 'bg-red-600/20',    iconText: 'text-red-400' },
  green:  { iconBg: 'bg-green-600/20',  iconText: 'text-green-400' },
  purple: { iconBg: 'bg-purple-600/20', iconText: 'text-purple-400' },
  amber:  { iconBg: 'bg-amber-600/20',  iconText: 'text-amber-400' },
  cyan:   { iconBg: 'bg-cyan-600/20',   iconText: 'text-cyan-400' },
}

function getSavedPersonalities(): SavedPersonality[] {
  const results: SavedPersonality[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      try {
        const config = JSON.parse(localStorage.getItem(key) ?? '{}')
        const name = key.slice(STORAGE_PREFIX.length)
        results.push({ name, key, config })
      } catch { /* skip invalid */ }
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name))
}

function getPersonalityPills(config: unknown): { label: string; value: string }[] {
  const c = config as EvaluationConfig
  const pills: { label: string; value: string }[] = []

  // Search Depth
  if (c?.search?.depth != null) {
    pills.push({ label: 'D', value: String(c.search.depth) })
  }

  // Aggression
  if (c?.tactical?.aggression != null) {
    pills.push({ label: 'Agg', value: String(c.tactical.aggression) })
  }

  // Randomness
  if (c?.randomness?.threshold != null && c.randomness.threshold > 0) {
    pills.push({ label: 'Rand', value: String(c.randomness.threshold) })
  }

  // Top 2 distinctive non-zero weights from positional, kingSafety, tactical
  const weightCandidates: { label: string; value: number }[] = []
  if (c?.positional) {
    const p = c.positional
    if (p.centerControl) weightCandidates.push({ label: 'Center', value: p.centerControl })
    if (p.mobility) weightCandidates.push({ label: 'Mobil', value: p.mobility })
    if (p.pawnStructure) weightCandidates.push({ label: 'Pawns', value: p.pawnStructure })
  }
  if (c?.kingSafety) {
    const k = c.kingSafety
    if (k.castleBonus) weightCandidates.push({ label: 'Castle', value: k.castleBonus })
    if (k.exposurePenalty) weightCandidates.push({ label: 'KSafe', value: k.exposurePenalty })
  }
  if (c?.tactical) {
    if (c.tactical.attackWeight) weightCandidates.push({ label: 'Atk', value: c.tactical.attackWeight })
    if (c.tactical.defenseWeight) weightCandidates.push({ label: 'Def', value: c.tactical.defenseWeight })
  }

  // Sort by absolute value descending, take top 2
  weightCandidates.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  for (const w of weightCandidates.slice(0, 2)) {
    pills.push({ label: w.label, value: String(w.value) })
  }

  return pills
}

export default function LibraryPage() {
  usePageTitle('Library')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState<SavedPersonality[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    setSaved(getSavedPersonalities())
  }, [])

  const handleDelete = (personality: SavedPersonality) => {
    if (!confirm(`Delete "${personality.name}"? This can't be undone.`)) return
    localStorage.removeItem(personality.key)
    setSaved(getSavedPersonalities())
  }

  const handleDuplicate = (personality: SavedPersonality) => {
    const newName = `${personality.name} (copy)`
    const newKey = `${STORAGE_PREFIX}${newName}`
    localStorage.setItem(newKey, JSON.stringify(personality.config))
    setSaved(getSavedPersonalities())
  }

  const handleExport = async (personality: SavedPersonality) => {
    const json = JSON.stringify(personality.config, null, 2)
    try {
      await navigator.clipboard.writeText(json)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = json
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopiedKey(personality.key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const filteredPresets = Object.entries(PRESETS).filter(([_, p]) =>
    p.label.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  )

  const filteredSaved = saved.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Personality Library</h1>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search personalities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Built-in Presets */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Built-in Presets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map(([key, preset]) => {
            const { icon: Icon, color } = presetIcons[key as PresetName]
            const s = colorStyles[color]
            return (
              <div
                key={key}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-start gap-4"
              >
                <div className={`w-12 h-12 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${s.iconText}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{preset.label}</h3>
                  <p className="text-slate-400 text-sm mb-2">{preset.description}</p>
                  {(() => {
                    const pills = getPersonalityPills(preset.config)
                    return pills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {pills.map((pill, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400"
                          >
                            {pill.label}: {pill.value}
                          </span>
                        ))}
                      </div>
                    ) : <div className="mb-3" />
                  })()}
                  <button
                    onClick={() => navigate(`/play?mode=human-vs-ai&preset=${key}`)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* My Personalities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">My Personalities</h2>
          <span className="text-sm text-slate-500">{saved.length} saved</span>
        </div>
        {filteredSaved.length === 0 && saved.length === 0 ? (
          <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-8 text-center">
            <p className="text-slate-400 mb-2">No custom personalities yet</p>
            <p className="text-slate-500 text-sm mb-4">Create your first AI personality in the editor</p>
            <Link
              to="/editor"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Create New
            </Link>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSaved.map((p) => {
            const pills = getPersonalityPills(p.config)
            return (
              <div
                key={p.key}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5"
              >
                <h3 className="font-semibold mb-2">{p.name}</h3>
                {pills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {pills.map((pill, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300"
                      >
                        {pill.label}: {pill.value}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/play?mode=human-vs-ai&loadSaved=${encodeURIComponent(p.name)}`)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                  <button
                    onClick={() => navigate(`/editor?loadSaved=${encodeURIComponent(p.name)}`)}
                    className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(p)}
                    className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleExport(p)}
                    className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition"
                    title="Export config to clipboard"
                  >
                    {copiedKey === p.key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="inline-flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium py-1.5 px-3 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Create New Card */}
          <Link
            to="/editor"
            className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-300 transition min-h-[120px]"
          >
            <Plus className="w-8 h-8" />
            <span className="font-medium">Create New</span>
          </Link>
        </div>
        )}
      </section>
    </div>
  )
}
