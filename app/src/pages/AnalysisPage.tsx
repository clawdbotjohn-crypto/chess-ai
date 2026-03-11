import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useParams, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import {
  ArrowLeft,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Download,
  Share2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
} from 'lucide-react'
import { getGames } from '../utils/gameHistory'
import { lookupOpening, ensureOpeningsLoaded } from '../utils/openings'
import { getSettings } from '../utils/settings'
import { playSoundForMove } from '../utils/sounds'
import { BOARD_THEME_COLORS } from '../utils/boardThemes'
import { DEFAULT_CONFIG } from '../engine/types'
import type { EvaluationConfig } from '../engine/types'
import { PRESETS, PRESET_NAMES } from '../engine/presets'
import type { PresetName } from '../engine/presets'
import { EvalBar } from '../components/EvalBar'
import { useStockfish } from '../hooks/useStockfish'
import { classifyMoves, CLASSIFICATION_COLORS, CLASSIFICATION_DOT_COLORS } from '../utils/moveClassification'
import type { MoveClassification } from '../utils/moveClassification'

export default function AnalysisPage() {
  usePageTitle('Analysis')
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const settings = getSettings()

  const record = useMemo(() => {
    return getGames().find(g => g.id === gameId) ?? null
  }, [gameId])

  // Parse moves from PGN
  const moves = useMemo(() => {
    if (!record?.pgn) return []
    try {
      const game = new Chess()
      game.loadPgn(record.pgn)
      return game.history({ verbose: true })
    } catch {
      return []
    }
  }, [record])

  const [openingsLoaded, setOpeningsLoaded] = useState(false)
  useEffect(() => {
    ensureOpeningsLoaded().then(() => setOpeningsLoaded(true))
  }, [])

  const opening = useMemo(() => {
    if (!openingsLoaded || !moves.length) return null
    const sanMoves = moves.map(m => m.san)
    return lookupOpening(sanMoves)
  }, [moves, openingsLoaded])

  const [flipped, setFlipped] = useState(false)
  const [moveIndex, setMoveIndex] = useState(-1) // -1 = starting position
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentEval, setCurrentEval] = useState(0)
  const [copied, setCopied] = useState(false)
  const [fenCopied, setFenCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [bestMoveArrow, setBestMoveArrow] = useState<{ startSquare: string; endSquare: string; color: string } | null>(null)
  const [bestMoveSan, setBestMoveSan] = useState<string>('')
  const [searchInfo, setSearchInfo] = useState<{ nodes?: number; timeMs?: number } | null>(null)
  const [useStockfishEval, setUseStockfishEval] = useState(false)
  const [analysisPreset, setAnalysisPreset] = useState<string>('DEFAULT')
  const stockfish = useStockfish()

  // Load saved custom personalities from localStorage
  const savedPersonalities = useMemo(() => {
    const prefix = 'chess-ai-personality:'
    const result: { name: string; config: EvaluationConfig }[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        try {
          const config = JSON.parse(localStorage.getItem(key)!) as EvaluationConfig
          if (!config.search) config.search = { depth: 4 }
          result.push({ name: key.slice(prefix.length), config })
        } catch { /* skip invalid */ }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  // Resolve the active analysis config from preset name or saved personality
  const analysisConfig = useMemo((): EvaluationConfig => {
    if (PRESET_NAMES.includes(analysisPreset as PresetName)) {
      return PRESETS[analysisPreset as PresetName].config
    }
    const saved = savedPersonalities.find(p => p.name === analysisPreset)
    return saved?.config ?? DEFAULT_CONFIG
  }, [analysisPreset, savedPersonalities])
  const moveListRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Auto-fallback: if Stockfish has an error, switch back to custom engine
  useEffect(() => {
    if (stockfish.error && useStockfishEval) setUseStockfishEval(false)
  }, [stockfish.error, useStockfishEval])
  const workerRef = useRef<Worker | null>(null)
  const fenRef = useRef<string>('')

  // Compute FEN at current move index
  const fen = useMemo(() => {
    const replay = new Chess()
    for (let i = 0; i <= moveIndex && i < moves.length; i++) {
      replay.move(moves[i].san)
    }
    return replay.fen()
  }, [moveIndex, moves])

  // Keep fenRef in sync
  fenRef.current = fen

  // Move classification state
  const [classifications, setClassifications] = useState<MoveClassification[]>([])
  const [classifying, setClassifying] = useState(false)

  useEffect(() => {
    if (!record?.pgn) return
    setClassifying(true)
    classifyMoves(record.pgn, DEFAULT_CONFIG).then(results => {
      setClassifications(results)
      setClassifying(false)
    })
  }, [record])

  // Last move highlighting
  const lastMove = moveIndex >= 0 && moveIndex < moves.length ? moves[moveIndex] : null
  const customSquareStyles: Record<string, React.CSSProperties> = {}
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(0, 255, 0, 0.35)' }
  }

  // Worker for evaluation
  useEffect(() => {
    const w = new Worker(new URL('../engine/aiWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    w.onmessage = (e) => {
      if (e.data.type === 'eval') {
        setCurrentEval(e.data.evaluation)
      } else if (e.data.type === 'progress') {
        // Update eval bar progressively during analysis
        setCurrentEval(e.data.evaluation)
        // Update best move arrow progressively as each depth completes
        if (e.data.move) {
          try {
            const temp = new Chess(fenRef.current)
            const moveObj = temp.move(e.data.move)
            if (moveObj) {
              setBestMoveArrow({ startSquare: moveObj.from, endSquare: moveObj.to, color: 'rgba(0, 200, 100, 0.5)' })
              setBestMoveSan(e.data.move)
            }
          } catch {
            // ignore parse errors from intermediate results
          }
        }
      } else if (e.data.type === 'bestmove') {
        setCurrentEval(e.data.evaluation)
        setSearchInfo({ nodes: e.data.nodes, timeMs: e.data.timeMs })
        if (e.data.move) {
          try {
            const temp = new Chess(fenRef.current)
            const moveObj = temp.move(e.data.move)
            if (moveObj) {
              setBestMoveArrow({ startSquare: moveObj.from, endSquare: moveObj.to, color: 'rgba(0, 200, 100, 0.5)' })
              setBestMoveSan(e.data.move)
            }
          } catch {
            setBestMoveArrow(null)
            setBestMoveSan('')
          }
        }
      }
    }
    return () => w.terminate()
  }, [])

  // Request eval when position changes (custom engine)
  useEffect(() => {
    if (useStockfishEval) return // Stockfish handles this
    setBestMoveArrow(null)
    setBestMoveSan('')
    setSearchInfo(null)
    workerRef.current?.postMessage({ type: 'move', fen, config: analysisConfig })
  }, [fen, useStockfishEval, analysisConfig])

  // Request Stockfish eval when position changes
  useEffect(() => {
    if (!useStockfishEval) return
    setBestMoveArrow(null)
    setBestMoveSan('')
    setSearchInfo(null)

    stockfish.getMove(fen, 20, 18).then(result => {
      setCurrentEval(result.eval)
      setSearchInfo({ nodes: 0, timeMs: 0 })
      try {
        const from = result.uciMove.substring(0, 2)
        const to = result.uciMove.substring(2, 4)
        setBestMoveArrow({ startSquare: from, endSquare: to, color: 'rgba(0, 200, 100, 0.5)' })
        setBestMoveSan(result.move)
      } catch {
        setBestMoveArrow(null)
        setBestMoveSan('')
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useStockfishEval, fen])

  // Update searchInfo from Stockfish stats
  useEffect(() => {
    if (useStockfishEval && stockfish.lastMoveStats) {
      setSearchInfo(stockfish.lastMoveStats)
    }
  }, [useStockfishEval, stockfish.lastMoveStats])

  // Navigation helpers
  const goTo = useCallback((idx: number, playSound = true) => {
    setIsPlaying(false)
    const clampedIdx = Math.max(-1, Math.min(moves.length - 1, idx))
    setMoveIndex(clampedIdx)

    // Play sound for the move we navigated to
    if (playSound && settings.soundEnabled && clampedIdx >= 0) {
      const move = moves[clampedIdx]
      const replay = new Chess()
      for (let i = 0; i <= clampedIdx; i++) {
        replay.move(moves[i].san)
      }
      playSoundForMove(move.san, replay.isGameOver(), replay.isCheck())
    }
  }, [moves, settings.soundEnabled])

  const goStart = useCallback(() => goTo(-1), [goTo])
  const goPrev = useCallback(() => goTo(moveIndex - 1), [goTo, moveIndex])
  const goNext = useCallback(() => goTo(moveIndex + 1), [goTo, moveIndex])
  const goEnd = useCallback(() => goTo(moves.length - 1), [goTo, moves.length])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
      else if (e.key === 'Home') { e.preventDefault(); goStart() }
      else if (e.key === 'End') { e.preventDefault(); goEnd() }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setFlipped(prev => !prev) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext, goStart, goEnd])

  // Touch swipe navigation for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) > 50 && Math.abs(dy) < 30) {
      if (dx > 0) goPrev()
      else goNext()
    }
  }, [goPrev, goNext])

  // Auto-scroll move list
  useEffect(() => {
    if (!moveListRef.current) return
    const activeEl = moveListRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [moveIndex])

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setMoveIndex(prev => {
        if (prev >= moves.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [isPlaying, moves.length])

  // Copy PGN
  const copyFen = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fen)
      setFenCopied(true)
      setTimeout(() => setFenCopied(false), 2000)
    } catch { /* ignore */ }
  }, [fen])

  const copyPgn = useCallback(async () => {
    if (!record?.pgn) return
    try {
      await navigator.clipboard.writeText(record.pgn)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [record])

  const copyLink = useCallback(async () => {
    if (!gameId) return
    const url = `https://nice-desert-0df9bdf1e.4.azurestaticapps.net/analysis/${gameId}`
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch { /* ignore */ }
  }, [gameId])

  if (!record) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-400 text-lg mb-4">Game not found</p>
        <button
          onClick={() => navigate('/history')}
          aria-label="Back to history" className="text-blue-400 hover:text-blue-300 transition"
        >
          ← Back to History
        </button>
      </div>
    )
  }

  const baseOrientation = record.playerColor || 'white'
  const orientation = flipped
    ? (baseOrientation === 'white' ? 'black' : 'white')
    : baseOrientation

  // Build result badge
  const resultBadge = (() => {
    if (record.mode === 'ai-vs-ai') {
      return { label: 'AI vs AI', cls: 'bg-purple-500/20 text-purple-300' }
    }
    if (record.result === 'win') return { label: 'Win', cls: 'bg-green-500/20 text-green-300' }
    if (record.result === 'loss') return { label: 'Loss', cls: 'bg-red-500/20 text-red-300' }
    return { label: 'Draw', cls: 'bg-slate-500/20 text-slate-300' }
  })()

  // Game title
  const title = record.mode === 'human-vs-ai'
    ? `You vs ${record.aiPersonality || 'AI'}`
    : record.mode === 'human-vs-human'
      ? 'Local 2-Player'
      : `${record.whiteLabel} vs ${record.blackLabel}`

  // Pair moves for display
  const movePairs: { num: number; white: string; wIdx: number; black?: string; bIdx?: number }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i].san,
      wIdx: i,
      black: moves[i + 1]?.san,
      bIdx: moves[i + 1] ? i + 1 : undefined,
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        {/* Top row: back button, title, flip button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/history')}
            aria-label="Back to history" className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition flex-shrink-0 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${resultBadge.cls}`}>
                {resultBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {new Date(record.date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })} at {new Date(record.date).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', hour12: true,
              })} &bull; {record.moves} moves &bull; {record.resultDetail}
            </p>
            {opening && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                <span className="text-blue-400 font-mono">{opening.eco}</span>
                {' '}
                <span>{opening.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => setFlipped(f => !f)}
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition flex-shrink-0 flex items-center justify-center"
            title="Flip board"
            aria-label="Flip board"
          >
            <RotateCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {/* Action buttons row: wraps on mobile */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyPgn}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Copy PGN"
            aria-label="Copy PGN"
          >
            {copied
              ? <Check className="w-5 h-5 text-green-400" />
              : <Copy className="w-5 h-5 text-slate-400" />
            }
          </button>
          <button
            onClick={copyFen}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Copy FEN" aria-label="Copy FEN"
          >
            {fenCopied
              ? <Check className="w-4 h-4 text-green-400" />
              : <span className="text-xs font-mono font-bold">FEN</span>}
          </button>
          <button
            onClick={() => {
              if (!record) return
              const playerIsWhite = record.playerColor === 'white'
              let result = '*'
              if (record.result === 'draw') {
                result = '1/2-1/2'
              } else if (record.mode === 'ai-vs-ai') {
                result = record.result === 'win' ? '1-0' : '0-1'
              } else if (record.result === 'win') {
                result = playerIsWhite ? '1-0' : '0-1'
              } else if (record.result === 'loss') {
                result = playerIsWhite ? '0-1' : '1-0'
              }
              const headers = [
                `[Event "Chess AI Game"]`,
                `[Date "${new Date(record.date).toISOString().split('T')[0].replace(/-/g, '.')}"]`,
                `[White "${record.whiteLabel}"]`,
                `[Black "${record.blackLabel}"]`,
                `[Result "${result}"]`,
              ].join('\n')
              const pgn = headers + '\n\n' + record.pgn
              const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `chess-ai-${record.id.substring(0, 8)}.pgn`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Download PGN" aria-label="Download PGN"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={copyLink}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Copy analysis link" aria-label="Copy analysis link"
          >
            {linkCopied
              ? <Check className="w-4 h-4 text-green-400" />
              : <Share2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              if (!useStockfishEval) {
                setUseStockfishEval(true)
              } else {
                setUseStockfishEval(false)
              }
            }}
            disabled={!!stockfish.error}
            className={`p-2 rounded-lg border transition min-w-[44px] min-h-[44px] flex items-center justify-center ${
              stockfish.error
                ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-50'
                : useStockfishEval
                ? 'bg-orange-600/20 border-orange-500/50 text-orange-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
            title={stockfish.error ? 'Stockfish failed to load' : useStockfishEval ? 'Using Stockfish eval' : 'Using custom engine eval'}
            aria-label={stockfish.error ? "Stockfish failed to load" : useStockfishEval ? "Using Stockfish eval" : "Using custom engine eval"}
          >
            <span className="text-xs font-bold">SF</span>
          </button>
          <select
            value={useStockfishEval ? '__stockfish__' : analysisPreset}
            onChange={e => {
              const val = e.target.value
              if (val === '__stockfish__') {
                setUseStockfishEval(true)
              } else {
                setUseStockfishEval(false)
                setAnalysisPreset(val)
              }
            }}
            className="h-[44px] px-2 rounded-lg border text-xs font-medium transition appearance-none cursor-pointer bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Select analysis engine" aria-label="Select analysis engine"
          >
            {!stockfish.error && (
              <option value="__stockfish__">⚡ Stockfish</option>
            )}
            {PRESET_NAMES.map(name => (
              <option key={name} value={name}>{PRESETS[name].label}</option>
            ))}
            {savedPersonalities.length > 0 && (
              <option disabled>──────────</option>
            )}
            {savedPersonalities.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content: board + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Board + eval bar */}
        <div className="flex gap-1 justify-center lg:justify-start">
          <EvalBar evaluation={currentEval} flipped={orientation === 'black'} />
          <div
            className="w-full max-w-[480px]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Chessboard
              options={{
                position: fen,
                arrows: bestMoveArrow ? [bestMoveArrow] : [],
                boardOrientation: orientation,
                allowDragging: false,
                squareStyles: customSquareStyles,
                darkSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].dark },
                lightSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].light },
                showNotation: settings.showCoordinates,
                boardStyle: {
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                },
              }}
            />
          </div>
        </div>

        {/* Right panel: move list + controls */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Transport controls — above move list on mobile for visibility */}
          <div className="mb-2 flex items-center justify-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goStart() }}
              disabled={moveIndex === -1}
              aria-label="First move"
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronFirst className="w-5 h-5 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goPrev() }}
              disabled={moveIndex === -1}
              aria-label="Previous move"
              className="min-h-[44px] min-w-[44px] p-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setIsPlaying(!isPlaying) }}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center"
              aria-label={isPlaying ? 'Pause' : 'Play through moves'}
              title={isPlaying ? 'Pause' : 'Play through moves'}
            >
              {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goNext() }}
              disabled={moveIndex >= moves.length - 1}
              aria-label="Next move"
              className="min-h-[44px] min-w-[44px] p-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goEnd() }}
              disabled={moveIndex >= moves.length - 1}
              aria-label="Last move"
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronLast className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {/* Eval display — above move list on mobile */}
          <div className="mb-2 lg:hidden bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl px-4 py-2 text-center">
            <div>
              <span className="text-xs text-slate-500">Evaluation: </span>
              <span className={`font-mono font-bold text-sm ${
                currentEval > 50 ? 'text-white' : currentEval < -50 ? 'text-slate-400' : 'text-slate-300'
              }`}>
                {Math.abs(currentEval) >= 10000
                  ? (currentEval > 0 ? '+M' : '-M')
                  : (currentEval >= 0 ? '+' : '') + (currentEval / 100).toFixed(1)}
              </span>
              {searchInfo && (
                <span className="text-xs text-slate-600 ml-2">
                  {useStockfishEval
                    ? `Stockfish depth 18`
                    : `${searchInfo.nodes?.toLocaleString()} nodes`}
                  {searchInfo.timeMs ? ` · ${(searchInfo.timeMs / 1000).toFixed(1)}s` : ''}
                </span>
              )}
            </div>
            {bestMoveSan && (
              <p className="text-xs text-slate-500 mt-1">
                Best: <span className="text-green-400 font-mono">{bestMoveSan}</span>
              </p>
            )}
          </div>

          {/* Move counter — above move list on mobile */}
          <p className="text-center text-xs text-slate-600 mb-1 lg:hidden">
            {moveIndex === -1 ? 'Start' : `Move ${moveIndex + 1}`} / {moves.length}
          </p>

          {/* Move list */}
          <div
            ref={moveListRef}
            className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-3 flex-1 overflow-y-auto max-h-[180px] lg:max-h-[420px] min-h-[120px] lg:min-h-[200px]"
          >
            {/* Starting position row */}
            <button
              onClick={() => goTo(-1)}
              data-active={moveIndex === -1}
              className={`w-full text-left text-xs px-2 py-1 rounded mb-1 transition ${
                moveIndex === -1
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-700/50'
              }`}
            >
              Starting position
            </button>

            {movePairs.map(pair => {
              const wClass = classifications[pair.wIdx]
              const bClass = pair.bIdx !== undefined ? classifications[pair.bIdx] : undefined
              const wColor = wClass ? CLASSIFICATION_COLORS[wClass.category] : 'text-slate-300'
              const bColor = bClass ? CLASSIFICATION_COLORS[bClass.category] : 'text-slate-300'
              const showWDot = wClass && (wClass.category === 'blunder' || wClass.category === 'mistake')
              const showBDot = bClass && (bClass.category === 'blunder' || bClass.category === 'mistake')
              return (
              <div key={pair.num} className="flex items-center gap-1 text-sm">
                <span className="w-8 text-right text-xs text-slate-600 flex-shrink-0 font-mono">
                  {pair.num}.
                </span>
                <button
                  onClick={() => goTo(pair.wIdx)}
                  data-active={moveIndex === pair.wIdx}
                  className={`flex-1 px-2 py-0.5 rounded text-left font-mono transition ${
                    moveIndex === pair.wIdx
                      ? 'bg-blue-600 text-white'
                      : `${wColor} hover:bg-slate-700/50`
                  }`}
                >
                  {showWDot && moveIndex !== pair.wIdx && (
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${CLASSIFICATION_DOT_COLORS[wClass.category]}`} />
                  )}
                  {pair.white}
                </button>
                {pair.black ? (
                  <button
                    onClick={() => goTo(pair.bIdx!)}
                    data-active={moveIndex === pair.bIdx}
                    className={`flex-1 px-2 py-0.5 rounded text-left font-mono transition ${
                      moveIndex === pair.bIdx
                        ? 'bg-blue-600 text-white'
                        : `${bColor} hover:bg-slate-700/50`
                    }`}
                  >
                    {showBDot && moveIndex !== pair.bIdx && (
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${CLASSIFICATION_DOT_COLORS[bClass.category]}`} />
                    )}
                    {pair.black}
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
              </div>
              )
            })}

            {/* Classification legend */}
            {classifications.length > 0 && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700/50 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400" /> Good
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" /> Inaccuracy
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-400" /> Mistake
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" /> Blunder
                </span>
              </div>
            )}

            {/* Analyzing loading state */}
            {classifying && (
              <div className="text-xs text-slate-500 mt-2 animate-pulse">
                Analyzing moves...
              </div>
            )}

            {/* Game result indicator */}
            {record && record.result && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                  record.mode === 'ai-vs-ai'
                    ? 'bg-purple-400'
                    : record.result === 'win'
                      ? 'bg-green-400'
                      : record.result === 'loss'
                        ? 'bg-red-400'
                        : 'bg-slate-400'
                }`} />
                <span className="text-xs font-mono text-slate-400">
                  {(() => {
                    if (record.result === 'draw') return '½-½'
                    if (record.mode === 'ai-vs-ai') {
                      // For AI vs AI, 'win' = white won, 'loss' = black won
                      return record.result === 'win' ? '1-0' : '0-1'
                    }
                    // Human modes: result is relative to the player
                    const playerIsWhite = record.playerColor === 'white'
                    if (record.result === 'win') return playerIsWhite ? '1-0' : '0-1'
                    if (record.result === 'loss') return playerIsWhite ? '0-1' : '1-0'
                    return '*'
                  })()}
                </span>
                {record.resultDetail && (
                  <span className="text-xs text-slate-500">
                    {record.resultDetail}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Eval display — desktop only (mobile version is above) */}
          <div className="mt-2 hidden lg:block bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl px-4 py-2 text-center">
            <div>
              <span className="text-xs text-slate-500">Evaluation: </span>
              <span className={`font-mono font-bold text-sm ${
                currentEval > 50 ? 'text-white' : currentEval < -50 ? 'text-slate-400' : 'text-slate-300'
              }`}>
                {Math.abs(currentEval) >= 10000
                  ? (currentEval > 0 ? '+M' : '-M')
                  : (currentEval >= 0 ? '+' : '') + (currentEval / 100).toFixed(1)}
              </span>
              {searchInfo && (
                <span className="text-xs text-slate-600 ml-2">
                  {useStockfishEval
                    ? `Stockfish depth 18`
                    : `${searchInfo.nodes?.toLocaleString()} nodes`}
                  {searchInfo.timeMs ? ` · ${(searchInfo.timeMs / 1000).toFixed(1)}s` : ''}
                </span>
              )}
            </div>
            {bestMoveSan && (
              <p className="text-xs text-slate-500 mt-1">
                Best: <span className="text-green-400 font-mono">{bestMoveSan}</span>
              </p>
            )}
          </div>

          {/* Transport controls — desktop only (mobile version is above) */}
          <div className="mt-2 hidden lg:flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goStart() }}
              disabled={moveIndex === -1}
              aria-label="First move"
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronFirst className="w-5 h-5 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goPrev() }}
              disabled={moveIndex === -1}
              aria-label="Previous move"
              className="min-h-[44px] min-w-[44px] p-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setIsPlaying(!isPlaying) }}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center"
              aria-label={isPlaying ? 'Pause' : 'Play through moves'}
              title={isPlaying ? 'Pause' : 'Play through moves'}
            >
              {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goNext() }}
              disabled={moveIndex >= moves.length - 1}
              aria-label="Next move"
              className="min-h-[44px] min-w-[44px] p-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goEnd() }}
              disabled={moveIndex >= moves.length - 1}
              aria-label="Last move"
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronLast className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {/* Move counter — desktop only */}
          <p className="hidden lg:block text-center text-xs text-slate-600 mt-1">
            {moveIndex === -1 ? 'Start' : `Move ${moveIndex + 1}`} / {moves.length}
          </p>

          {/* Play Again */}
          <button
            onClick={() => {
              const params = new URLSearchParams()
              if (record.mode === 'human-vs-ai') {
                params.set('mode', 'human-vs-ai')
                if (record.aiPersonality) params.set('preset', record.aiPersonality.toLowerCase())
              } else if (record.mode === 'human-vs-human') {
                params.set('mode', 'human-vs-human')
              } else {
                params.set('mode', 'ai-vs-ai')
              }
              navigate(`/play?${params.toString()}`)
            }}
            className="mt-3 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>

          {/* Keyboard shortcuts hint — hidden on mobile */}
          <p className="mt-4 text-center text-xs text-slate-600 hidden md:block">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] ml-1">→</kbd>
            <span className="mx-2">navigate</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Home</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] ml-1">End</kbd>
            <span className="mx-2">jump to start/end</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">F</kbd>
            <span className="mx-2">flip board</span>
          </p>
        </div>
      </div>
    </div>
  )
}
