import { useState, useMemo, useEffect } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useNavigate } from 'react-router-dom'
import { Trophy, X, Minus, Eye, Users, ScrollText, Bot, BarChart3, Upload } from 'lucide-react'
import { Chess } from 'chess.js'
import { getGames, saveGame } from '../utils/gameHistory'
import type { GameRecord } from '../utils/gameHistory'
import { lookupOpening, ensureOpeningsLoaded } from '../utils/openings'

type Filter = 'all' | 'vs-ai' | 'local-2p' | 'ai-vs-ai' | 'wins' | 'losses'

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 30) return `${diffDay} days ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getGameIcon(record: GameRecord) {
  if (record.mode === 'ai-vs-ai') return <Eye className="w-5 h-5 text-purple-400" />
  if (record.mode === 'human-vs-human') return <Users className="w-5 h-5 text-blue-400" />
  if (record.result === 'win') return <Trophy className="w-5 h-5 text-green-400" />
  if (record.result === 'loss') return <X className="w-5 h-5 text-red-400" />
  return <Minus className="w-5 h-5 text-slate-400" />
}

function getGameTitle(record: GameRecord): string {
  if (record.mode === 'human-vs-ai') {
    const avatar = record.aiAvatar ? record.aiAvatar + ' ' : ''
    return `You vs ${avatar}${record.aiPersonality || 'AI'}`
  }
  if (record.mode === 'human-vs-human') {
    return 'Local 2-Player Game'
  }
  return `${record.whiteLabel} vs ${record.blackLabel}`
}

function getAIName(record: GameRecord): string | null {
  if (record.mode === 'human-vs-ai') {
    return record.aiPersonality || null
  }
  if (record.mode === 'ai-vs-ai') {
    // For AI vs AI, show both names
    return `${record.whiteLabel} vs ${record.blackLabel}`
  }
  return null
}

function getBadge(record: GameRecord): { label: string; className: string } {
  if (record.mode === 'ai-vs-ai') {
    return { label: 'AI vs AI', className: 'bg-purple-500/20 text-purple-300' }
  }
  if (record.mode === 'human-vs-human') {
    return { label: '2P', className: 'bg-blue-500/20 text-blue-300' }
  }
  if (record.result === 'win') {
    return { label: 'Win', className: 'bg-green-500/20 text-green-300' }
  }
  if (record.result === 'loss') {
    return { label: 'Loss', className: 'bg-red-500/20 text-red-300' }
  }
  return { label: 'Draw', className: 'bg-slate-500/20 text-slate-300' }
}

function getIconBg(record: GameRecord): string {
  if (record.mode === 'ai-vs-ai') return 'bg-purple-500/10'
  if (record.mode === 'human-vs-human') return 'bg-blue-500/10'
  if (record.result === 'win') return 'bg-green-500/10'
  if (record.result === 'loss') return 'bg-red-500/10'
  return 'bg-slate-500/10'
}

export default function HistoryPage() {
  usePageTitle('Game History')
  const navigate = useNavigate()
  const [games] = useState<GameRecord[]>(() => {
    try {
      return getGames()
    } catch {
      return []
    }
  })
  const [filter, setFilter] = useState<Filter>('all')
  const [aiFilter, setAiFilter] = useState<string>('all')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPgn, setImportPgn] = useState('')
  const [importError, setImportError] = useState('')

  const handleImportPgn = () => {
    setImportError('')
    try {
      const chess = new Chess()
      chess.loadPgn(importPgn)
      if (chess.history().length === 0) {
        setImportError('No moves found in PGN.')
        return
      }
      const gameRecord: GameRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        mode: 'human-vs-human',
        result: 'draw',
        resultDetail: 'Imported game',
        pgn: chess.pgn(),
        moves: chess.history().length,
        whiteLabel: 'White',
        blackLabel: 'Black',
      }
      const headers = chess.header()
      if (headers.White) gameRecord.whiteLabel = headers.White
      if (headers.Black) gameRecord.blackLabel = headers.Black
      if (headers.Result === '1-0') { gameRecord.result = 'win'; gameRecord.resultDetail = 'White wins' }
      else if (headers.Result === '0-1') { gameRecord.result = 'loss'; gameRecord.resultDetail = 'Black wins' }
      else if (headers.Result === '1/2-1/2') { gameRecord.result = 'draw'; gameRecord.resultDetail = 'Draw' }
      saveGame(gameRecord)
      navigate(`/analysis/${gameRecord.id}`)
    } catch {
      setImportError('Invalid PGN. Please check the format and try again.')
    }
  }

  // Lazy-load openings data
  const [openingsReady, setOpeningsReady] = useState(false)
  useEffect(() => { ensureOpeningsLoaded().then(() => setOpeningsReady(true)) }, [])

  // Collect unique AI personality names from all games
  const aiNames = useMemo(() => {
    const names = new Set<string>()
    games.forEach(g => {
      if (g.aiPersonality) names.add(g.aiPersonality)
      if (g.mode === 'ai-vs-ai') {
        if (g.whiteLabel) names.add(g.whiteLabel)
        if (g.blackLabel) names.add(g.blackLabel)
      }
    })
    return Array.from(names).sort()
  }, [games])

  // Stats only count human-played games for W/L/D filter counts
  const humanGames = games.filter(g => g.mode === 'human-vs-ai' || g.mode === 'human-vs-human')

  // Compute openings for ALL games (used by stats card, independent of filters)
  const allGameOpenings = useMemo(() => {
    if (!openingsReady) return new Map<string, { eco: string; name: string }>()
    const map = new Map<string, { eco: string; name: string }>()
    for (const g of games) {
      if (g.pgn) {
        try {
          const chess = new Chess()
          chess.loadPgn(g.pgn)
          const result = lookupOpening(chess.history())
          if (result) map.set(g.id, result)
        } catch { /* skip */ }
      }
    }
    return map
  }, [games, openingsReady])

  // Comprehensive stats card data
  const stats = useMemo(() => {
    if (!games.length) return null

    const hvai = games.filter(g => g.mode === 'human-vs-ai')
    const wins = hvai.filter(g => g.result === 'win').length
    const losses = hvai.filter(g => g.result === 'loss').length
    const draws = hvai.filter(g => g.result === 'draw').length
    const winRate = hvai.length ? Math.round((wins / hvai.length) * 100) : 0
    const avgMoves = Math.round(games.reduce((sum, g) => sum + g.moves, 0) / games.length)
    const longestGame = Math.max(...games.map(g => g.moves))

    // Most common opening
    let topOpening: { eco: string; name: string; count: number } | null = null
    if (openingsReady) {
      const openingCounts = new Map<string, { eco: string; name: string; count: number }>()
      for (const [, info] of allGameOpenings) {
        const key = info.eco
        const existing = openingCounts.get(key)
        if (existing) {
          existing.count++
        } else {
          openingCounts.set(key, { ...info, count: 1 })
        }
      }
      for (const [, val] of openingCounts) {
        if (!topOpening || val.count > topOpening.count) {
          topOpening = val
        }
      }
    }

    return { total: games.length, wins, losses, draws, winRate, avgMoves, longestGame, topOpening, humanGames: hvai.length }
  }, [games, openingsReady, allGameOpenings])

  const filteredGames = games.filter(g => {
    // First apply mode/result filter
    let passesFilter = true
    switch (filter) {
      case 'vs-ai': passesFilter = g.mode === 'human-vs-ai'; break
      case 'local-2p': passesFilter = g.mode === 'human-vs-human'; break
      case 'ai-vs-ai': passesFilter = g.mode === 'ai-vs-ai'; break
      case 'wins': passesFilter = g.result === 'win' && (g.mode === 'human-vs-ai' || g.mode === 'human-vs-human'); break
      case 'losses': passesFilter = g.result === 'loss' && (g.mode === 'human-vs-ai' || g.mode === 'human-vs-human'); break
    }
    if (!passesFilter) return false

    // Then apply AI personality filter
    if (aiFilter !== 'all') {
      if (g.mode === 'human-vs-ai') {
        return g.aiPersonality === aiFilter
      }
      if (g.mode === 'ai-vs-ai') {
        return g.whiteLabel === aiFilter || g.blackLabel === aiFilter
      }
      return false // 2P games don't match AI filter
    }
    return true
  })

  // Compute counts for each filter tab
  const filterCounts: Record<Filter, number> = {
    all: games.length,
    'vs-ai': games.filter(g => g.mode === 'human-vs-ai').length,
    'local-2p': games.filter(g => g.mode === 'human-vs-human').length,
    'ai-vs-ai': games.filter(g => g.mode === 'ai-vs-ai').length,
    wins: humanGames.filter(g => g.result === 'win').length,
    losses: humanGames.filter(g => g.result === 'loss').length,
  }

  // Compute opening names only for filtered (visible) games
  const gameOpenings = useMemo(() => {
    if (!openingsReady) return new Map<string, { eco: string; name: string }>()
    const map = new Map<string, { eco: string; name: string }>()
    for (const g of filteredGames) {
      if (g.pgn) {
        try {
          const chess = new Chess()
          chess.loadPgn(g.pgn)
          const result = lookupOpening(chess.history())
          if (result) map.set(g.id, result)
        } catch { /* skip */ }
      }
    }
    return map
  }, [filteredGames, openingsReady])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All Games' },
    { key: 'vs-ai', label: 'vs AI' },
    { key: 'local-2p', label: 'Local 2P' },
    { key: 'ai-vs-ai', label: 'AI vs AI' },
    { key: 'wins', label: 'Wins' },
    { key: 'losses', label: 'Losses' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <ScrollText className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
          Game History
        </h1>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition text-sm font-medium min-h-[44px]"
        >
          <Upload className="w-4 h-4" />
          Import PGN
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="mb-4 bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Games</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                <span className="text-green-400">{stats.wins}</span>
                <span className="text-slate-600 mx-0.5">-</span>
                <span className="text-red-400">{stats.losses}</span>
                <span className="text-slate-600 mx-0.5">-</span>
                <span className="text-slate-400">{stats.draws}</span>
              </p>
              <p className="text-xs text-slate-500">W - L - D</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{stats.winRate}%</p>
              <p className="text-xs text-slate-500">Win Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-300">{stats.avgMoves}</p>
              <p className="text-xs text-slate-500">Avg Moves</p>
            </div>
          </div>
          {stats.topOpening && (
            <p className="mt-3 text-xs text-center text-slate-500">
              Most played: <span className="text-blue-400/70 font-mono">{stats.topOpening.eco}</span> {stats.topOpening.name} ({stats.topOpening.count}x)
            </p>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {f.label} ({filterCounts[f.key]})
          </button>
        ))}
      </div>

      {/* AI Personality Filter */}
      {aiNames.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <Bot className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <select
            value={aiFilter}
            onChange={(e) => setAiFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer flex-1 sm:flex-none min-h-[44px]"
          >
            <option value="all">All AI Personalities</option>
            {aiNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {aiFilter !== 'all' && (
            <button
              onClick={() => setAiFilter('all')}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Games List */}
      {filteredGames.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-lg mb-2">
            {games.length === 0 ? 'No games recorded yet' : 'No games match this filter'}
          </p>
          <p className="text-slate-500 text-sm">
            {games.length === 0 ? 'Your completed games will appear here.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGames.map(g => {
            const badge = getBadge(g)
            const aiName = getAIName(g)
            return (
              <div
                key={g.id}
                onClick={() => navigate(`/analysis/${g.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/analysis/${g.id}`); } }}
                tabIndex={0}
                role="button"
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-700/50 transition"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconBg(g)}`}>
                  {getGameIcon(g)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm text-white truncate">{getGameTitle(g)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiName && (g.mode === 'human-vs-ai' || g.mode === 'ai-vs-ai') && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400/80">
                        {g.aiAvatar ? <span className="text-sm">{g.aiAvatar}</span> : <Bot className="w-3 h-3" />}
                        {aiName}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 truncate">
                      {g.resultDetail} &bull; {g.moves} move{g.moves !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {gameOpenings.get(g.id) && (
                    <p className="text-xs text-slate-500 truncate">
                      <span className="text-blue-400/70 font-mono">{gameOpenings.get(g.id)!.eco}</span>
                      {' '}
                      <span className="text-slate-600">{gameOpenings.get(g.id)!.name}</span>
                    </p>
                  )}
                </div>

                {/* Right: time */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-slate-500">{relativeTime(g.date)}</p>
                  <p className="text-xs text-slate-600">{formatDate(g.date)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Import PGN Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-lg font-bold text-white mb-4">Import PGN</h2>
            <textarea
              value={importPgn}
              onChange={e => setImportPgn(e.target.value)}
              className="w-full h-48 p-3 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 font-mono text-sm resize-none focus:outline-none focus:border-blue-500"
              placeholder="Paste your PGN here..."
            />
            {importError && (
              <p className="mt-2 text-xs text-red-400">{importError}</p>
            )}
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => { setShowImportModal(false); setImportPgn(''); setImportError('') }}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImportPgn}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
              >
                Analyze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
