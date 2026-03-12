import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Chess, type Square } from 'chess.js'
import { lookupOpening } from '../utils/openings'
import { playSoundForMove } from '../utils/sounds'
import { saveGame, type GameRecord } from '../utils/gameHistory'
import { recordGame } from '../utils/gameStats'

export type GameMode = 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai'

interface UseGameStateOptions {
  initialFen: string | null
}

export function useGameState({ initialFen }: UseGameStateOptions) {
  const [game, setGame] = useState(() => {
    if (initialFen) {
      try { return new Chess(initialFen) } catch { return new Chess() }
    }
    return new Chess()
  })
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [viewIndex, setViewIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [fenCopied, setFenCopied] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [preMove, setPreMove] = useState<{ from: string; to: string; promotion?: string } | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [moveInput, setMoveInput] = useState('')
  const [moveInputError, setMoveInputError] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [showNewGameModal, setShowNewGameModal] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [showMoveHistory, setShowMoveHistory] = useState(false)
  const [currentEval, setCurrentEval] = useState(0)
  const [resignedColor, setResignedColor] = useState<'white' | 'black' | null>(null)
  const [drawClaimed, setDrawClaimed] = useState(false)
  const [drawAvailable, setDrawAvailable] = useState(false)
  const [drawReason, setDrawReason] = useState<string | null>(null)
  const [timeoutLoser, setTimeoutLoser] = useState<'white' | 'black' | null>(null)

  const gameRef = useRef(game)
  const gameStartTimeRef = useRef(Date.now())
  const isDraggingRef = useRef(false)
  const preMoveRef = useRef<{ from: string; to: string; promotion?: string } | null>(null)
  const moveInputRef = useRef<HTMLInputElement>(null)
  const moveInputErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameSavedRef = useRef(false)
  const savedGameIdRef = useRef<string | null>(null)
  const aiPendingRef = useRef(false)
  const prevMoveCountRef = useRef(0)

  // Keep refs in sync
  gameRef.current = game
  preMoveRef.current = preMove

  const isGameOver = game.isGameOver() || timeoutLoser !== null || resignedColor !== null || drawClaimed
  const totalHalfMoves = moveHistory.length
  const isAtStart = viewIndex === 0
  const isLive = viewIndex === null
  const isReviewing = viewIndex !== null

  // Apply move to game state
  const applyMove = useCallback((moveStr: string) => {
    const gameCopy = new Chess()
    gameCopy.loadPgn(gameRef.current.pgn())
    try {
      const move = gameCopy.move(moveStr)
      if (move) {
        setGame(gameCopy)
        gameRef.current = gameCopy
        setMoveHistory(prev => [...prev, move.san])
        setLastMove({ from: move.from, to: move.to })
        setSelectedSquare(null)
        setViewIndex(null)
        playSoundForMove(move.san, gameCopy.isGameOver(), gameCopy.isCheck())
        return true
      }
    } catch { /* Invalid move */ }
    return false
  }, [])

  // Make a move (for human drag-drop)
  const makeMove = useCallback((sourceSquare: Square, targetSquare: Square) => {
    const gameCopy = new Chess()
    gameCopy.loadPgn(game.pgn())
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
      if (move) {
        setGame(gameCopy)
        gameRef.current = gameCopy
        setMoveHistory(prev => [...prev, move.san])
        setLastMove({ from: move.from, to: move.to })
        setSelectedSquare(null)
        setViewIndex(null)
        playSoundForMove(move.san, gameCopy.isGameOver(), gameCopy.isCheck())
        return true
      }
    } catch { /* Invalid move */ }
    return false
  }, [game])

  // Copy handlers
  const handleCopyPGN = useCallback(() => {
    navigator.clipboard.writeText(game.pgn()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [game])

  const handleCopyFEN = useCallback(() => {
    navigator.clipboard.writeText(game.fen()).then(() => {
      setFenCopied(true)
      setTimeout(() => setFenCopied(false), 2000)
    })
  }, [game])

  // Navigation handlers
  const navToStart = useCallback(() => {
    if (totalHalfMoves > 0) setViewIndex(0)
  }, [totalHalfMoves])

  const navBack = useCallback(() => {
    setViewIndex(prev => {
      if (prev === null) return Math.max(0, totalHalfMoves - 1)
      return Math.max(0, prev - 1)
    })
  }, [totalHalfMoves])

  const navForward = useCallback(() => {
    setViewIndex(prev => {
      if (prev === null) return null
      const next = prev + 1
      if (next >= totalHalfMoves) return null
      return next
    })
  }, [totalHalfMoves])

  const navToLive = useCallback(() => {
    setViewIndex(null)
  }, [])

  // Undo last move
  const undoLastMove = useCallback((mode: GameMode, isRunning: boolean) => {
    if (moveHistory.length === 0) return
    if (isGameOver) return
    if (mode === 'ai-vs-ai' && isRunning) return

    const undoCount = mode === 'human-vs-ai' && moveHistory.length >= 2 ? 2 : 1
    const gameCopy = new Chess()
    gameCopy.loadPgn(game.pgn())
    for (let i = 0; i < undoCount; i++) {
      gameCopy.undo()
    }
    setGame(gameCopy)
    gameRef.current = gameCopy
    setMoveHistory(prev => prev.slice(0, prev.length - undoCount))
    setLastMove(null)
    setSelectedSquare(null)
    setViewIndex(null)
    setCurrentEval(0)
    aiPendingRef.current = false
  }, [game, moveHistory, isGameOver])

  // Resign
  const handleResign = useCallback((mode: GameMode, playerColor: 'white' | 'black') => {
    if (mode !== 'human-vs-ai') return
    if (isGameOver) return
    if (!window.confirm('Resign this game? This counts as a loss.')) return
    setResignedColor(playerColor)
  }, [isGameOver])

  // Claim draw
  const handleClaimDraw = useCallback(() => {
    if (isGameOver) return
    if (!drawAvailable) return
    setDrawClaimed(true)
  }, [isGameOver, drawAvailable])

  // Keyboard move input
  const handleMoveInputSubmit = useCallback((mode: GameMode, humanTurnChar: string, isRunning: boolean) => {
    const input = moveInput.trim()
    if (!input) return
    if (isGameOver || viewIndex !== null) {
      setMoveInput('')
      return
    }
    if (mode === 'human-vs-ai' && game.turn() !== humanTurnChar) {
      setMoveInput('')
      return
    }
    if (mode === 'ai-vs-ai' && isRunning) {
      setMoveInput('')
      return
    }

    const gameCopy = new Chess()
    gameCopy.loadPgn(game.pgn())
    try {
      const move = gameCopy.move(input, { strict: false })
      if (move) {
        setGame(gameCopy)
        gameRef.current = gameCopy
        setMoveHistory(prev => [...prev, move.san])
        setLastMove({ from: move.from, to: move.to })
        setSelectedSquare(null)
        setViewIndex(null)
        setPreMove(null)
        playSoundForMove(move.san, gameCopy.isGameOver(), gameCopy.isCheck())
        setMoveInput('')
        setMoveInputError(false)
        setTimeout(() => moveInputRef.current?.focus(), 50)
        return
      }
    } catch { /* Invalid move */ }

    setMoveInputError(true)
    setMoveInput('')
    if (moveInputErrorTimerRef.current) clearTimeout(moveInputErrorTimerRef.current)
    moveInputErrorTimerRef.current = setTimeout(() => {
      setMoveInputError(false)
    }, 1500)
  }, [moveInput, game, isGameOver, viewIndex])

  // Auto-focus move input after each move
  useEffect(() => {
    if (moveHistory.length > 0 && !isGameOver) {
      setTimeout(() => moveInputRef.current?.focus(), 100)
    }
  }, [moveHistory.length, isGameOver])

  // Draw detection
  useEffect(() => {
    if (isGameOver) {
      setDrawAvailable(false)
      setDrawReason(null)
      return
    }
    if (moveHistory.length === 0) {
      setDrawAvailable(false)
      setDrawReason(null)
      return
    }
    const isThreefold = game.isThreefoldRepetition()
    const is50Move = game.isDraw() && !game.isStalemate() && !game.isInsufficientMaterial()
    if (isThreefold) {
      setDrawAvailable(true)
      setDrawReason('Draw by repetition available — Claim?')
    } else if (is50Move) {
      setDrawAvailable(true)
      setDrawReason('Draw by 50-move rule available — Claim?')
    } else {
      setDrawAvailable(false)
      setDrawReason(null)
    }
  }, [game, moveHistory.length, isGameOver])

  // Computed: displayed FEN based on viewIndex
  const displayFen = useMemo(() => {
    if (viewIndex === null) return game.fen()
    if (viewIndex === 0) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const temp = new Chess()
    const allMoves = game.history()
    for (let i = 0; i < viewIndex && i < allMoves.length; i++) {
      temp.move(allMoves[i])
    }
    return temp.fen()
  }, [game, viewIndex])

  // Computed: captured pieces
  const capturedPieces = useMemo(() => {
    const startingPieces: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 }
    const whitePieces = { ...startingPieces }
    const blackPieces = { ...startingPieces }
    const board = game.board()
    const whiteOnBoard: Record<string, number> = {}
    const blackOnBoard: Record<string, number> = {}
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue
        const map = sq.color === 'w' ? whiteOnBoard : blackOnBoard
        map[sq.type] = (map[sq.type] || 0) + 1
      }
    }
    const whiteCaptured: string[] = []
    const blackCaptured: string[] = []
    const pieceSymbols: Record<string, { white: string; black: string }> = {
      p: { white: '♙', black: '♟' },
      n: { white: '♘', black: '♞' },
      b: { white: '♗', black: '♝' },
      r: { white: '♖', black: '♜' },
      q: { white: '♕', black: '♛' },
    }
    for (const type of ['q', 'r', 'b', 'n', 'p']) {
      const wMissing = (whitePieces[type] || 0) - (whiteOnBoard[type] || 0)
      for (let i = 0; i < Math.max(0, wMissing); i++) {
        whiteCaptured.push(pieceSymbols[type].white)
      }
      const bMissing = (blackPieces[type] || 0) - (blackOnBoard[type] || 0)
      for (let i = 0; i < Math.max(0, bMissing); i++) {
        blackCaptured.push(pieceSymbols[type].black)
      }
    }
    return { whiteCaptured, blackCaptured }
  }, [game])

  // Computed: current opening
  const opening = useMemo(() => {
    if (moveHistory.length === 0) return null
    return lookupOpening(moveHistory)
  }, [moveHistory])

  // Reset game state (called by handleNewGameStart in component)
  const resetGame = useCallback(() => {
    const fresh = new Chess()
    setGame(fresh)
    gameRef.current = fresh
    setMoveHistory([])
    setLastMove(null)
    setSelectedSquare(null)
    setShowResultModal(false)
    setShowNewGameModal(false)
    setViewIndex(null)
    setPreMove(null)
    aiPendingRef.current = false
    gameStartTimeRef.current = Date.now()
    savedGameIdRef.current = null
    setTimeoutLoser(null)
    setResignedColor(null)
    setCurrentEval(0)
    setDrawClaimed(false)
    setDrawAvailable(false)
    setDrawReason(null)
    setMoveInput('')
    setMoveInputError(false)
    prevMoveCountRef.current = 0
  }, [])

  // Save game when it ends
  const saveGameOnEnd = useCallback((params: {
    mode: GameMode
    playerColor: 'white' | 'black'
    activePreset: string | null
    currentAvatar: string | null
    useStockfishEngine: boolean
    stockfishSkillLevel: number
    whiteLabel: string
    blackLabel: string
    clock: { pause: () => void }
  }) => {
    if (!isGameOver || gameSavedRef.current) return
    gameSavedRef.current = true
    setShowResultModal(true)
    params.clock.pause()

    let resultDetail = 'Unknown'
    if (drawClaimed) resultDetail = game.isThreefoldRepetition() ? 'Repetition' : '50-move rule'
    else if (resignedColor) resultDetail = 'Resignation'
    else if (timeoutLoser) resultDetail = 'Time expired'
    else if (game.isCheckmate()) resultDetail = 'Checkmate'
    else if (game.isStalemate()) resultDetail = 'Stalemate'
    else if (game.isThreefoldRepetition()) resultDetail = 'Repetition'
    else if (game.isInsufficientMaterial()) resultDetail = 'Insufficient material'
    else if (game.isDraw()) resultDetail = '50-move rule'

    const winnerColor = resignedColor
      ? (resignedColor === 'white' ? 'black' : 'white')
      : timeoutLoser
      ? (timeoutLoser === 'white' ? 'black' : 'white')
      : (game.turn() === 'w' ? 'black' : 'white')

    let result: GameRecord['result'] = 'draw'
    if (game.isCheckmate() || timeoutLoser || resignedColor) {
      if (params.mode === 'human-vs-ai') {
        result = winnerColor === params.playerColor ? 'win' : 'loss'
      } else if (params.mode === 'human-vs-human') {
        result = winnerColor === 'white' ? 'win' : 'loss'
      } else {
        result = 'draw'
      }
    }

    const aiPresetName = params.useStockfishEngine
      ? 'Stockfish'
      : params.activePreset
        ? params.activePreset.charAt(0).toUpperCase() + params.activePreset.slice(1).toLowerCase()
        : 'Custom'

    let wLabel = 'White'
    let bLabel = 'Black'
    let aiName: string | undefined
    if (params.mode === 'human-vs-ai') {
      wLabel = params.playerColor === 'white' ? 'You' : aiPresetName
      bLabel = params.playerColor === 'black' ? 'You' : aiPresetName
      aiName = aiPresetName
    } else if (params.mode === 'human-vs-human') {
      wLabel = 'White'
      bLabel = 'Black'
    } else {
      wLabel = params.whiteLabel
      bLabel = params.blackLabel
    }

    const record: GameRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: params.mode,
      result,
      resultDetail,
      pgn: game.pgn(),
      moves: moveHistory.length,
      whiteLabel: wLabel,
      blackLabel: bLabel,
      playerColor: params.mode === 'human-vs-ai' ? params.playerColor : undefined,
      aiPersonality: aiName,
      aiAvatar: params.mode === 'human-vs-ai' && !params.useStockfishEngine ? (params.currentAvatar ?? undefined) : undefined,
      durationMs: Date.now() - gameStartTimeRef.current,
    }
    saveGame(record)
    savedGameIdRef.current = record.id

    if (params.mode === 'human-vs-ai') {
      recordGame(result, params.mode)
    }
  }, [isGameOver, game, drawClaimed, resignedColor, timeoutLoser, moveHistory.length])

  // Reset saved flag when game is no longer over (new game)
  useEffect(() => {
    if (!isGameOver) {
      gameSavedRef.current = false
    }
  }, [isGameOver])

  return {
    // State
    game, setGame,
    moveHistory, setMoveHistory,
    viewIndex, setViewIndex,
    copied, fenCopied,
    lastMove, setLastMove,
    preMove, setPreMove,
    selectedSquare, setSelectedSquare,
    moveInput, setMoveInput,
    moveInputError, setMoveInputError,
    showResultModal, setShowResultModal,
    showNewGameModal, setShowNewGameModal,
    flipped, setFlipped,
    showMoveHistory, setShowMoveHistory,
    currentEval, setCurrentEval,
    resignedColor, setResignedColor,
    drawClaimed, drawAvailable, drawReason,
    timeoutLoser, setTimeoutLoser,

    // Refs
    gameRef, gameStartTimeRef, isDraggingRef, preMoveRef,
    moveInputRef, aiPendingRef, savedGameIdRef, prevMoveCountRef,

    // Computed
    isGameOver, totalHalfMoves, isAtStart, isLive, isReviewing,
    displayFen, capturedPieces, opening,

    // Callbacks
    applyMove, makeMove,
    handleCopyPGN, handleCopyFEN,
    navToStart, navBack, navForward, navToLive,
    undoLastMove, handleResign, handleClaimDraw,
    handleMoveInputSubmit,
    resetGame, saveGameOnEnd,
  }
}
