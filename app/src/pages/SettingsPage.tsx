import { useState, useEffect } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  Layout,
  Palette,
  Volume2,
  Brain,
  Database,
  Info,
  Download,
  Upload,
  Trash2,
  Github,
  BookOpen,
  ChevronRight,
  Keyboard,
  Bug,
  BarChart3,
  RotateCcw,
} from 'lucide-react'
import { getSettings, updateSettings, type AppSettings } from '../utils/settings'
import { BOARD_THEMES } from '../utils/boardThemes'
import { getStats, resetStats, getWinRate, type GameStats } from '../utils/gameStats'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full bg-blue-500 transition-colors'
          : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full bg-slate-600 transition-colors'
      }
    >
      <span
        className={
          checked
            ? 'pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow-sm transition-transform mt-0.5 ml-0.5'
            : 'pointer-events-none inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow-sm transition-transform mt-0.5 ml-0.5'
        }
      />
    </button>
  )
}

export default function SettingsPage() {
  usePageTitle('Settings')
  const [settings, setSettings] = useState<AppSettings>(getSettings)
  const [stats, setStats] = useState<GameStats>(getStats)

  useEffect(() => {
    setSettings(getSettings())
    setStats(getStats())
  }, [])

  function update(partial: Partial<AppSettings>) {
    const next = updateSettings(partial)
    setSettings(next)
  }

  function handleExportData() {
    const data: Record<string, unknown> = {}
    // Collect all chess-ai localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('chess-ai')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || '')
        } catch {
          data[key] = localStorage.getItem(key)
        }
      }
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chess-ai-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportData() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text) as Record<string, unknown>
        let count = 0
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('chess-ai')) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
            count++
          }
        }
        alert(`Imported ${count} items successfully. Refresh the page to see changes.`)
        setSettings(getSettings())
      } catch {
        alert('Failed to import data. Make sure the file is a valid Chess AI backup.')
      }
    }
    input.click()
  }

  function handleClearHistory() {
    if (window.confirm('Are you sure you want to delete all saved games? This cannot be undone.')) {
      localStorage.removeItem('chess-ai-game-history')
      alert('Game history cleared.')
    }
  }

  function handleResetStats() {
    if (window.confirm('Reset all your game statistics? This cannot be undone.')) {
      resetStats()
      setStats(getStats())
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8">
      {/* Board Settings */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Layout className="w-4 h-4" />
          Board Settings
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Show Legal Moves</p>
              <p className="text-sm text-slate-400">Display dots on squares where pieces can move</p>
            </div>
            <Toggle checked={settings.showLegalMoves} onChange={(v) => update({ showLegalMoves: v })} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Highlight Last Move</p>
              <p className="text-sm text-slate-400">Show which squares the last move used</p>
            </div>
            <Toggle checked={settings.highlightLastMove} onChange={(v) => update({ highlightLastMove: v })} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Show Coordinates</p>
              <p className="text-sm text-slate-400">Display a-h and 1-8 around the board</p>
            </div>
            <Toggle checked={settings.showCoordinates} onChange={(v) => update({ showCoordinates: v })} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Piece Animation</p>
              <p className="text-sm text-slate-400">Animate pieces when they move</p>
            </div>
            <Toggle checked={settings.pieceAnimation} onChange={(v) => update({ pieceAnimation: v })} />
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Theme
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          <div className="p-4">
            <p className="font-medium mb-3">Board Theme</p>
            <div className="grid grid-cols-4 gap-2">
              {BOARD_THEMES.map((theme) => (
                <button
                  key={theme.key}
                  onClick={() => update({ boardTheme: theme.key })}
                  aria-label={`${theme.key} board theme`}
                  className={
                    settings.boardTheme === theme.key
                      ? 'aspect-square rounded-lg overflow-hidden ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-800'
                      : 'aspect-square rounded-lg overflow-hidden'
                  }
                >
                  <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                    <div style={{ backgroundColor: theme.light }} />
                    <div style={{ backgroundColor: theme.dark }} />
                    <div style={{ backgroundColor: theme.dark }} />
                    <div style={{ backgroundColor: theme.light }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <p className="font-medium mb-3">App Theme</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">
                Dark
              </button>
              <button className="flex-1 bg-slate-700 text-slate-500 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-50" disabled aria-disabled="true">
                Light
              </button>
              <button className="flex-1 bg-slate-700 text-slate-500 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-50" disabled aria-disabled="true">
                System
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sound */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Sound
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Sound Effects</p>
              <p className="text-sm text-slate-400">Play sounds when pieces move</p>
            </div>
            <Toggle checked={settings.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
          </div>
          {settings.soundEnabled && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Volume</p>
                <span className="text-sm text-slate-400">{settings.volume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.volume}
                onChange={(e) => update({ volume: Number(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}
        </div>
      </section>

      {/* AI Settings */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4" />
          AI Settings
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">Default Search Depth</p>
                <p className="text-sm text-slate-400">Higher = stronger but slower AI</p>
              </div>
              <span className="text-sm font-mono bg-slate-700 px-2 py-1 rounded">{settings.defaultSearchDepth}</span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              value={settings.defaultSearchDepth}
              onChange={(e) => update({ defaultSearchDepth: Number(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Fast</span>
              <span>Strong</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Show Evaluation Bar</p>
              <p className="text-sm text-slate-400">Display who's winning during the game</p>
            </div>
            <Toggle checked={settings.showEvalBar} onChange={(v) => update({ showEvalBar: v })} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Opening Book</p>
              <p className="text-sm text-slate-400">AI uses common openings for the first 10 moves</p>
            </div>
            <Toggle checked={settings.openingBookEnabled} onChange={(v) => update({ openingBookEnabled: v })} />
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Data
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          <button
            onClick={handleExportData}
            className="flex items-center justify-between p-4 w-full text-left hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-slate-400">Download your games and personalities</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={handleImportData}
            className="flex items-center justify-between p-4 w-full text-left hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium">Import Data</p>
                <p className="text-sm text-slate-400">Restore from a backup</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={handleClearHistory}
            className="flex items-center justify-between p-4 w-full text-left hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-medium text-red-400">Clear Game History</p>
                <p className="text-sm text-slate-400">Delete all saved games</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </section>

      {/* Your Stats */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Your Stats
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalGames}</p>
                <p className="text-xs text-slate-400">Games Played</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{getWinRate(stats)}%</p>
                <p className="text-xs text-slate-400">Win Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{stats.longestWinStreak}</p>
                <p className="text-xs text-slate-400">Best Streak</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Record</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-emerald-400">{stats.wins}W</span>
                <span className="text-red-400">{stats.losses}L</span>
                <span className="text-slate-400">{stats.draws}D</span>
              </div>
            </div>
            {stats.winStreak > 0 && (
              <p className="text-xs text-slate-500 mt-1">Current streak: {stats.winStreak} win{stats.winStreak !== 1 ? 's' : ''}</p>
            )}
          </div>
          {stats.totalGames > 0 && (
            <div className="p-4">
              <p className="text-sm text-slate-400 mb-1">Games breakdown</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {stats.gamesVsAI > 0 && <span>vs AI: {stats.gamesVsAI}</span>}
                {stats.gamesVsHuman > 0 && <span>vs Human: {stats.gamesVsHuman}</span>}
                {stats.gamesAIvsAI > 0 && <span>AI vs AI: {stats.gamesAIvsAI}</span>}
              </div>
            </div>
          )}
          <button
            onClick={handleResetStats}
            className="flex items-center justify-between p-4 w-full text-left hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-medium text-red-400">Reset Stats</p>
                <p className="text-sm text-slate-400">Clear all game statistics</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          About
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-2xl">
              ♞
            </div>
            <div>
              <p className="font-bold">Chess AI</p>
              <p className="text-sm text-slate-400">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Build custom chess AI personalities by tuning evaluation weights.
            Experiment with different play styles and watch your creations battle.
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Built with custom chess engine + Stockfish
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href="https://github.com/clawdbotjohn-crypto/chess-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <span className="text-slate-600">•</span>
            <a
              href="https://github.com/clawdbotjohn-crypto/chess-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              <BookOpen className="w-4 h-4" />
              Documentation
            </a>
            <span className="text-slate-600">•</span>
            <a
              href="#"
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              <Bug className="w-4 h-4" />
              Report Issue
            </a>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
              }}
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
