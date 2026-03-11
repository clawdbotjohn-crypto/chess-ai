import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import {
  Play,
  Search,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  ClipboardPaste,
  FlipVertical,
  ArrowLeft,
} from 'lucide-react'
import { getSettings } from '../utils/settings'
import { BOARD_THEME_COLORS } from '../utils/boardThemes'

type PieceEntry = { type: PieceSymbol; color: Color; label: string }

const WHITE_PIECES: PieceEntry[] = [
  { type: 'k', color: 'w', label: '♔' },
  { type: 'q', color: 'w', label: '♕' },
  { type: 'r', color: 'w', label: '♖' },
  { type: 'b', color: 'w', label: '♗' },
  { type: 'n', color: 'w', label: '♘' },
  { type: 'p', color: 'w', label: '♙' },
]

const BLACK_PIECES: PieceEntry[] = [
  { type: 'k', color: 'b', label: '♚' },
  { type: 'q', color: 'b', label: '♛' },
  { type: 'r', color: 'b', label: '♜' },
  { type: 'b', color: 'b', label: '♝' },
  { type: 'n', color: 'b', label: '♞' },
  { type: 'p', color: 'b', label: '♟' },
]

const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Square names for iteration
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

function buildPositionObject(chess: Chess): Record<string, { pieceType: string }> {
  const position: Record<string, { pieceType: string }> = {}
  for (const rank of RANKS) {
    for (const file of FILES) {
      const sq = `${file}${rank}` as Square
      const piece = chess.get(sq)
      if (piece) {
        // react-chessboard expects e.g. 'wK', 'bP'
        position[sq] = { pieceType: `${piece.color}${piece.type.toUpperCase()}` }
      }
    }
  }
  return position
}

export default function PositionSetupPage() {
  usePageTitle('Position Setup')
  const navigate = useNavigate()
  const settings = getSettings()

  const [chess, setChess] = useState(() => new Chess(START_FEN))
  const [selectedPiece, setSelectedPiece] = useState<PieceEntry | null>(null)
  const [sideToMove, setSideToMove] = useState<'w' | 'b'>('w')
  const [copied, setCopied] = useState(false)
  const [fenInput, setFenInput] = useState('')
  const [fenError, setFenError] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [eraseMode, setEraseMode] = useState(false)

  // Build FEN from current board + side to move
  const currentFen = useMemo(() => {
    const parts = chess.fen().split(' ')
    parts[1] = sideToMove
    // Clear castling/en passant for custom positions
    parts[2] = '-'
    parts[3] = '-'
    return parts.join(' ')
  }, [chess, sideToMove])

  const position = useMemo(() => buildPositionObject(chess), [chess])

  const handleSquareClick = useCallback((square: string) => {
    if (eraseMode) {
      // Remove piece from square
      const copy = new Chess(EMPTY_FEN)
      for (const rank of RANKS) {
        for (const file of FILES) {
          const sq = `${file}${rank}` as Square
          if (sq === square) continue
          const piece = chess.get(sq)
          if (piece) copy.put(piece, sq)
        }
      }
      setChess(copy)
      return
    }

    if (selectedPiece) {
      // Place selected piece on square
      const copy = new Chess(EMPTY_FEN)
      for (const rank of RANKS) {
        for (const file of FILES) {
          const sq = `${file}${rank}` as Square
          if (sq === square) continue // Clear target square first
          const piece = chess.get(sq)
          if (piece) copy.put(piece, sq)
        }
      }
      copy.put({ type: selectedPiece.type, color: selectedPiece.color }, square as Square)
      setChess(copy)
    } else {
      // No piece selected — remove piece from square if occupied
      const existing = chess.get(square as Square)
      if (existing) {
        const copy = new Chess(EMPTY_FEN)
        for (const rank of RANKS) {
          for (const file of FILES) {
            const sq = `${file}${rank}` as Square
            if (sq === square) continue
            const piece = chess.get(sq)
            if (piece) copy.put(piece, sq)
          }
        }
        setChess(copy)
      }
    }
  }, [chess, selectedPiece, eraseMode])

  const handlePieceDrop = useCallback((_source: string, target: string | null, piece: { pieceType: string }) => {
    if (!target) return false
    const pieceStr = piece.pieceType // e.g. 'wQ', 'bP'
    const color = pieceStr[0] as Color
    const type = pieceStr[1].toLowerCase() as PieceSymbol
    const copy = new Chess(EMPTY_FEN)
    for (const rank of RANKS) {
      for (const file of FILES) {
        const sq = `${file}${rank}` as Square
        if (sq === target) continue
        const p = chess.get(sq)
        if (p) copy.put(p, sq)
      }
    }
    copy.put({ type, color }, target as Square)
    setChess(copy)
    return true
  }, [chess])

  const clearBoard = () => {
    setChess(new Chess(EMPTY_FEN))
  }

  const startingPosition = () => {
    setChess(new Chess(START_FEN))
    setSideToMove('w')
  }

  const handleCopyFen = async () => {
    await navigator.clipboard.writeText(currentFen)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePasteFen = () => {
    setFenError('')
    try {
      const testChess = new Chess(fenInput.trim())
      setChess(testChess)
      setSideToMove(testChess.turn())
      setFenInput('')
    } catch {
      setFenError('Invalid FEN string')
    }
  }

  const handlePlayFromHere = () => {
    navigate(`/play?mode=human-vs-ai&fen=${encodeURIComponent(currentFen)}`)
  }

  const handleAnalyze = () => {
    navigate(`/play?mode=human-vs-human&fen=${encodeURIComponent(currentFen)}`)
  }

  const themeColors = BOARD_THEME_COLORS[settings.boardTheme] || BOARD_THEME_COLORS.classic

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-700 rounded-lg transition"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Position Setup</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Board */}
        <div className="flex-shrink-0">
          <div className="w-full max-w-[480px] mx-auto lg:mx-0 aspect-square">
            <Chessboard
              options={{
                position: position,
                onSquareClick: ({ square }: { square: string }) => handleSquareClick(square),
                onPieceDrop: ({ sourceSquare, targetSquare, piece }: { sourceSquare: string; targetSquare: string | null; piece: { pieceType: string } }) => handlePieceDrop(sourceSquare, targetSquare, piece),
                boardOrientation: flipped ? 'black' : 'white',
                boardStyle: {
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                },
                darkSquareStyle: { backgroundColor: themeColors.dark },
                lightSquareStyle: { backgroundColor: themeColors.light },
                allowDragging: true,
                showAnimations: false,
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-5">
          {/* Piece Palette */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Piece Palette</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                {WHITE_PIECES.map((p) => (
                  <button
                    key={`w${p.type}`}
                    onClick={() => { setEraseMode(false); setSelectedPiece(selectedPiece?.type === p.type && selectedPiece?.color === p.color ? null : p) }}
                    className={`w-11 h-11 rounded-lg text-2xl flex items-center justify-center transition border ${
                      selectedPiece?.type === p.type && selectedPiece?.color === p.color && !eraseMode
                        ? 'bg-blue-600 border-blue-400 ring-2 ring-blue-400/50'
                        : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                    }`}
                    title={`White ${p.type}`} aria-label={`Place white ${p.type}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {BLACK_PIECES.map((p) => (
                  <button
                    key={`b${p.type}`}
                    onClick={() => { setEraseMode(false); setSelectedPiece(selectedPiece?.type === p.type && selectedPiece?.color === p.color ? null : p) }}
                    className={`w-11 h-11 rounded-lg text-2xl flex items-center justify-center transition border ${
                      selectedPiece?.type === p.type && selectedPiece?.color === p.color && !eraseMode
                        ? 'bg-blue-600 border-blue-400 ring-2 ring-blue-400/50'
                        : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                    }`}
                    title={`Black ${p.type}`} aria-label={`Place black ${p.type}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setEraseMode(!eraseMode); setSelectedPiece(null) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition border ${
                  eraseMode
                    ? 'bg-red-600/30 border-red-500 text-red-300'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Eraser
              </button>
            </div>
          </div>

          {/* Board Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearBoard}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear Board
            </button>
            <button
              onClick={startingPosition}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
            >
              <RotateCcw className="w-4 h-4" />
              Starting Position
            </button>
            <button
              onClick={() => setFlipped(!flipped)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
            >
              <FlipVertical className="w-4 h-4" />
              Flip
            </button>
          </div>

          {/* Side to Move */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Side to Move</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSideToMove('w')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                  sideToMove === 'w'
                    ? 'bg-white text-slate-900 border-white'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'
                }`}
              >
                ● White
              </button>
              <button
                onClick={() => setSideToMove('b')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                  sideToMove === 'b'
                    ? 'bg-slate-900 text-white border-slate-400'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'
                }`}
              >
                ● Black
              </button>
            </div>
          </div>

          {/* FEN Display & Input */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">FEN</h3>
            <div className="flex gap-2 mb-3">
              <code className="flex-1 bg-slate-900 px-3 py-2 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto whitespace-nowrap">
                {currentFen}
              </code>
              <button
                onClick={handleCopyFen}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition flex-shrink-0"
                title="Copy FEN" aria-label="Copy FEN"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={fenInput}
                onChange={(e) => { setFenInput(e.target.value); setFenError('') }}
                placeholder="Paste FEN here..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                onKeyDown={(e) => e.key === 'Enter' && handlePasteFen()}
              />
              <button
                onClick={handlePasteFen}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition flex-shrink-0"
                title="Load FEN" aria-label="Load FEN"
              >
                <ClipboardPaste className="w-4 h-4" />
              </button>
            </div>
            {fenError && <p className="text-red-400 text-xs mt-2">{fenError}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePlayFromHere}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition"
            >
              <Play className="w-5 h-5" />
              Play from Here
            </button>
            <button
              onClick={handleAnalyze}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition"
            >
              <Search className="w-5 h-5" />
              Analyze
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
