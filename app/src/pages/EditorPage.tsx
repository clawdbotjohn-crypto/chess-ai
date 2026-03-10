import { useState, useCallback } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useNavigate } from 'react-router-dom'
import { Brain, Play, Download, Upload, Check, AlertCircle, RotateCcw } from 'lucide-react'
import { AIEditorPanel } from '../components/AIEditorPanel'
import { useAIPersonality } from '../hooks/useAIPersonality'
import type { EvaluationConfig } from '../engine/types'

const cardGlass = 'rounded-xl p-4 border border-white/[0.08]'
const cardGlassStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
  backdropFilter: 'blur(10px)',
}

export default function EditorPage() {
  usePageTitle('AI Editor')
  const navigate = useNavigate()
  const personality = useAIPersonality()
  const [savedNames, setSavedNames] = useState<string[]>(personality.getSavedNames())
  const [exportCopied, setExportCopied] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  const refreshSaved = () => setSavedNames(personality.getSavedNames())

  const handlePlayWithAI = () => {
    // Store current config in localStorage so GamePage can pick it up
    localStorage.setItem('chess-ai-editor-config', JSON.stringify(personality.currentConfig))
    if (personality.activePreset) {
      navigate(`/play?mode=human-vs-ai&preset=${personality.activePreset}`)
    } else {
      const tempName = '__editor_temp__'
      personality.saveToStorage(tempName)
      navigate(`/play?mode=human-vs-ai&loadSaved=${tempName}`)
    }
  }

  const handleExportConfig = useCallback(async () => {
    const json = JSON.stringify(personality.currentConfig, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2000)
    } catch {
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea')
      textarea.value = json
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2000)
    }
  }, [personality.currentConfig])

  const handleImportConfig = useCallback(async () => {
    setImportError(null)
    setImportSuccess(false)
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text) as EvaluationConfig
      // Basic validation: check for expected top-level keys
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid config format')
      }
      if (!parsed.pieceValues && !parsed.positional && !parsed.search) {
        throw new Error('Config must contain at least one of: pieceValues, positional, search')
      }
      personality.setConfig(parsed)
      setImportSuccess(true)
      setTimeout(() => setImportSuccess(false), 2000)
    } catch (err) {
      const message = err instanceof SyntaxError
        ? 'Clipboard does not contain valid JSON'
        : err instanceof Error
          ? err.message
          : 'Failed to read clipboard'
      setImportError(message)
      setTimeout(() => setImportError(null), 3000)
    }
  }, [personality])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          AI Personality Editor
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Customize how the AI plays by adjusting piece values, positional weights, and search parameters.
        </p>
      </div>

      {/* Action buttons */}
      <div className={`${cardGlass} mb-6 space-y-3`} style={cardGlassStyle}>
        {/* Play button */}
        <button
          onClick={handlePlayWithAI}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Play className="w-5 h-5" />
          Play with this AI
        </button>

        {/* Export / Import row */}
        <div className="flex gap-3">
          <button
            onClick={handleExportConfig}
            className="flex-1 bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-600/30"
          >
            {exportCopied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Config
              </>
            )}
          </button>
          <button
            onClick={handleImportConfig}
            className="flex-1 bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-600/30"
          >
            {importSuccess ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Loaded!</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Config
              </>
            )}
          </button>
        </div>

        {/* Reset to Default */}
        <button
          onClick={() => { personality.loadPreset('DEFAULT'); }}
          className="w-full bg-slate-700/40 hover:bg-slate-700/70 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-600/20"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Classical Defaults
        </button>

        {/* Import error message */}
        {importError && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {importError}
          </div>
        )}
      </div>

      {/* Editor panel — reuse existing component */}
      <AIEditorPanel
        config={personality.currentConfig}
        activePreset={personality.activePreset}
        savedNames={savedNames}
        avatar={personality.currentAvatar}
        onAvatarChange={personality.setAvatar}
        onChange={personality.setConfig}
        onLoadPreset={personality.loadPreset}
        onSave={(name) => { personality.saveToStorage(name); refreshSaved(); }}
        onLoadSaved={(name) => { personality.loadFromStorage(name); refreshSaved(); }}
        onDeleteSaved={(name) => { personality.deleteSaved(name); refreshSaved(); }}
      />
    </div>
  )
}
