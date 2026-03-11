import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { Chessboard } from 'react-chessboard'
import { Chess, type Square } from 'chess.js'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Bot, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, Copy, Cpu, Flag, FlipVertical, Handshake, HelpCircle, Loader, Plus, ScrollText, Undo2, User } from 'lucide-react'
import { lookupOpening } from '../utils/openings'
import { getSettings } from '../utils/settings'
import { playSoundForMove } from '../utils/sounds'
import { saveGame } from '../utils/gameHistory'
import { recordGame } from '../utils/gameStats'
import type { GameRecord } from '../utils/gameHistory'
import { GameResultModal } from '../components/GameResultModal'
import { EvalBar } from '../components/EvalBar'
import { NewGameModal } from '../components/NewGameModal'
import type { NewGameSettings } from '../components/NewGameModal'
import { useAIPersonality } from '../hooks/useAIPersonality'
import { useChessAI } from '../hooks/useChessAI'
import { useStockfish } from '../hooks/useStockfish'
import type { EvaluationConfig } from '../engine/types'
import { DEFAULT_CONFIG } from '../engine/types'
import type { TimeControl } from '../engine/types'
import { TIME_CONTROLS } from '../engine/types'
import { PRESETS, type PresetName } from '../engine/presets'
import { useChessClock } from '../hooks/useChessClock'
import { BOARD_THEME_COLORS } from '../utils/boardThemes'
import { getPseudoLegalSquares } from '../utils/pseudoLegalMoves'

type GameMode = 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai'

export default function GamePage() {
  usePageTitle('Play')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Determine initial mode/preset from URL params
  const initialMode = (searchParams.get('mode') as GameMode) || 'human-vs-ai'
  const initialPreset = searchParams.get('preset') as PresetName | null
  const initialLoadSaved = searchParams.get('loadSaved')
  const initialFen = searchParams.get('fen')

  const [game, setGame] = useState(() => {
    if (initialFen) {
      try {
        return new Chess(initialFen)
      } catch {
        return new Chess()
      }
    }
    return new Chess()
  })
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const personality = useAIPersonality()

  // Move history navigation: null = live position, number = viewing half-move index
  const [viewIndex, setViewIndex] = useState<number | null>(null)

  // Copy PGN state
  const [copied, setCopied] = useState(false)
  const [fenCopied, setFenCopied] = useState(false)

  // Min AI move time
  const [minMoveTime, setMinMoveTime] = useState(500)
  const minMoveTimeRef = useRef(500)

  // Last move tracking (T-015)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

  // Pre-move: queue a move while AI is thinking (human-vs-ai only)
  const [preMove, setPreMove] = useState<{ from: string; to: string; promotion?: string } | null>(null)
  const preMoveRef = useRef<{ from: string; to: string; promotion?: string } | null>(null)

  // Selected square for legal move highlighting (T-016)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)

  // Keyboard move input state
  const [moveInput, setMoveInput] = useState('')
  const [moveInputError, setMoveInputError] = useState(false)
  const moveInputRef = useRef<HTMLInputElement>(null)
  const moveInputErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track game start time for duration calculation
  const gameStartTimeRef = useRef(Date.now())

  // Track whether a drag is in progress to avoid click-to-move conflicts
  const isDraggingRef = useRef(false)

  // Game result modal visibility (T-013)
  const [showResultModal, setShowResultModal] = useState(false)

  // New game modal visibility
  const [showNewGameModal, setShowNewGameModal] = useState(false)

  // Flip board toggle
  const [flipped, setFlipped] = useState(false)

  // Move history panel visibility (collapsed during active play)
  const [showMoveHistory, setShowMoveHistory] = useState(false)

  // Current evaluation (centipawns, from white's perspective)
  const [currentEval, setCurrentEval] = useState(0)

  // Game mode
  const [mode, setMode] = useState<GameMode>(initialMode)

  // Player color for human-vs-ai
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')

  // AI instances - one for human-vs-ai, two for ai-vs-ai
  const whiteAI = useChessAI()
  const blackAI = useChessAI()
  const stockfish = useStockfish()
  const stockfishBlack = useStockfish()

  // Stockfish mode state (human-vs-ai)
  const [useStockfishEngine, setUseStockfishEngine] = useState(false)
  const [stockfishSkillLevel, setStockfishSkillLevel] = useState(10)
  const [stockfishDepth, setStockfishDepth] = useState(10)

  // AI vs AI Stockfish state
  const [whiteUseStockfish, setWhiteUseStockfish] = useState(false)
  const [blackUseStockfish, setBlackUseStockfish] = useState(false)
  const [whiteStockfishSkillLevel, setWhiteStockfishSkillLevel] = useState(10)
  const [whiteStockfishDepth, setWhiteStockfishDepth] = useState(10)
  const [blackStockfishSkillLevel, setBlackStockfishSkillLevel] = useState(10)
  const [blackStockfishDepth, setBlackStockfishDepth] = useState(10)

  // AI vs AI state
  const [whiteConfig, setWhiteConfig] = useState<EvaluationConfig>(structuredClone(DEFAULT_CONFIG))
  const [blackConfig, setBlackConfig] = useState<EvaluationConfig>(
    structuredClone(PRESETS.AGGRESSIVE.config)
  )
  const [whiteLabel, setWhiteLabel] = useState('Classical')
  const [blackLabel, setBlackLabel] = useState('Aggressive')
  const [delay, setDelay] = useState(500)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Time control
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[0])
  const [timeoutLoser, setTimeoutLoser] = useState<'white' | 'black' | null>(null)
  const clock = useChessClock()
  const timeControlRef = useRef<TimeControl>(TIME_CONTROLS[0])

  // User preferences from Settings page
  const [settings, setSettings] = useState(getSettings())

  // Refs for the game loop (avoids stale closures)
  const gameRef = useRef(game)
  const isRunningRef = useRef(false)
  const isPausedRef = useRef(false)
  const delayRef = useRef(delay)
  const whiteConfigRef = useRef(whiteConfig)
  const blackConfigRef = useRef(blackConfig)
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiPendingRef = useRef(false)
  const whiteUseStockfishRef = useRef(false)
  const blackUseStockfishRef = useRef(false)
  const whiteStockfishSkillRef = useRef(10)
  const whiteStockfishDepthRef = useRef(10)
  const blackStockfishSkillRef = useRef(10)
  const blackStockfishDepthRef = useRef(10)

  // Keep refs in sync
  preMoveRef.current = preMove
  gameRef.current = game
  delayRef.current = delay
  whiteConfigRef.current = whiteConfig
  blackConfigRef.current = blackConfig
  timeControlRef.current = timeControl
  whiteUseStockfishRef.current = whiteUseStockfish
  blackUseStockfishRef.current = blackUseStockfish
  whiteStockfishSkillRef.current = whiteStockfishSkillLevel
  whiteStockfishDepthRef.current = whiteStockfishDepth
  blackStockfishSkillRef.current = blackStockfishSkillLevel
  blackStockfishDepthRef.current = blackStockfishDepth

  // Apply URL params on mount
  const appliedUrlParams = useRef(false)
  useEffect(() => {
    if (appliedUrlParams.current) return
    appliedUrlParams.current = true

    if (initialPreset && PRESETS[initialPreset]) {
      personality.loadPreset(initialPreset)
    } else if (initialLoadSaved) {
      personality.loadFromStorage(initialLoadSaved)
    }

    // If URL has stockfish=1, auto-enable Stockfish
    if (searchParams.get('stockfish') === '1') {
      setUseStockfishEngine(true)
    }
  }, [initialPreset, initialLoadSaved, personality])

  // Re-read settings when user returns from Settings page
  useEffect(() => {
    const handler = () => setSettings(getSettings())
    window.addEventListener('focus', handler)
    window.addEventListener('storage', handler)
    return () => { window.removeEventListener('focus', handler); window.removeEventListener('storage', handler) }
  }, [])

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

  // Resignation state
  const [resignedColor, setResignedColor] = useState<'white' | 'black' | null>(null)

  // Draw claim state
  const [drawClaimed, setDrawClaimed] = useState(false)
  const [drawAvailable, setDrawAvailable] = useState(false)
  const [drawReason, setDrawReason] = useState<string | null>(null)

  // Check if game is over
  const isGameOver = game.isGameOver() || timeoutLoser !== null || resignedColor !== null || drawClaimed

  // Determine the human's color character for turn checks
  const humanTurnChar = playerColor === 'white' ? 'w' : 'b'
  const aiTurnChar = playerColor === 'white' ? 'b' : 'w'

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
        setViewIndex(null) // Jump to live position on new move
        // Play sound effect
        playSoundForMove(move.san, gameCopy.isGameOver(), gameCopy.isCheck())
        return true
      }
    } catch {
      // Invalid move
    }
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
        setViewIndex(null) // Jump to live position on new move
        // Play sound effect
        playSoundForMove(move.san, gameCopy.isGameOver(), gameCopy.isCheck())
        return true
      }
    } catch {
      // Invalid move
    }
    return false
  }, [game])

  // Human vs AI: after human moves, trigger AI response (custom engine)
  const makeAIResponse = useCallback(async (currentGame: Chess, config: EvaluationConfig, expectedAiTurnChar: string) => {
    if (currentGame.isGameOver()) return
    const startTime = Date.now()

    try {
      // Use appropriate AI instance based on which side AI plays
      const ai = playerColor === 'white' ? blackAI : whiteAI
      const result = await ai.getMove(currentGame.fen(), config, (progress) => {
        // Update eval bar progressively as each depth completes
        setCurrentEval(progress.evaluation)
      })
      // Enforce minimum move time
      const elapsed = Date.now() - startTime
      const remaining = minMoveTimeRef.current - elapsed
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining))
      }
      // Verify it's still the AI's turn (human may have moved or game was reset)
      if (gameRef.current.turn() !== expectedAiTurnChar) return
      // Track evaluation — result.eval is already from white's perspective (standard minimax)
      setCurrentEval(result.eval)
      applyMove(result.move)
    } catch (err) {
      if (import.meta.env.DEV) console.error('AI move error:', err)
    } finally {
      aiPendingRef.current = false
    }
  }, [blackAI, whiteAI, playerColor, applyMove])

  // Human vs AI: after human moves, trigger Stockfish response
  const makeStockfishResponse = useCallback(async (currentGame: Chess, expectedAiTurnChar: string) => {
    if (currentGame.isGameOver()) return
    const startTime = Date.now()

    try {
      const result = await stockfish.getMove(currentGame.fen(), stockfishSkillLevel, stockfishDepth)
      // Enforce minimum move time
      const elapsed = Date.now() - startTime
      const remaining = minMoveTimeRef.current - elapsed
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining))
      }
      // Verify it's still the AI's turn
      if (gameRef.current.turn() !== expectedAiTurnChar) return
      setCurrentEval(result.eval)
      applyMove(result.move)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Stockfish move error:', err)
    } finally {
      aiPendingRef.current = false
    }
  }, [stockfish, stockfishSkillLevel, stockfishDepth, applyMove])

  // Quick eval after human moves to keep eval bar smooth
  // Uses whichever AI instance is available (reuses the worker's idle time)
  const requestQuickEval = useCallback((fen: string, config: EvaluationConfig) => {
    const ai = mode === 'ai-vs-ai' ? whiteAI : (playerColor === 'white' ? blackAI : whiteAI)
    ai.getEval(fen, config).then(ev => setCurrentEval(ev)).catch(() => {})
  }, [mode, playerColor, whiteAI, blackAI])

  // Handle piece drop (human vs AI mode only)
  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    isDraggingRef.current = false
    if (!targetSquare) return false
    if (isGameOver) return false
    if (isReviewing) return false // Can't move while reviewing history
    if (mode === 'ai-vs-ai' && isRunning) return false

    // Pre-move: if it's AI's turn in human-vs-ai, queue the move if pseudo-legal
    if (mode === 'human-vs-ai' && game.turn() !== humanTurnChar) {
      const piece = game.get(sourceSquare as Square)
      if (piece && piece.color === humanTurnChar) {
        const pseudoLegal = getPseudoLegalSquares(piece.type, sourceSquare, piece.color)
        if (pseudoLegal.has(targetSquare)) {
          setPreMove({ from: sourceSquare, to: targetSquare, promotion: 'q' })
          setSelectedSquare(null)
        }
      }
      return false // Don't actually move the piece on the board
    }

    const moveSuccess = makeMove(sourceSquare as Square, targetSquare as Square)
    if (moveSuccess) {
      // Clear any pre-move when human successfully moves
      setPreMove(null)
    }
    return moveSuccess
  }

  // After human move in human-vs-ai mode, trigger AI + update eval bar
  // Also execute pre-moves when AI finishes (it becomes human's turn)
  useEffect(() => {
    if (mode !== 'human-vs-ai') return

    // When it's the human's turn, check for a queued pre-move
    if (game.turn() === humanTurnChar && preMoveRef.current && moveHistory.length > 0) {
      const pm = preMoveRef.current
      setPreMove(null)
      // Try to execute the pre-move on the current position
      const gameCopy = new Chess()
      gameCopy.loadPgn(game.pgn())
      try {
        const move = gameCopy.move({ from: pm.from as Square, to: pm.to as Square, promotion: (pm.promotion ?? 'q') as 'q' | 'r' | 'b' | 'n' })
        if (move) {
          setGame(gameCopy)
          gameRef.current = gameCopy
          setMoveHistory(prev => [...prev, move.san])
          setLastMove({ from: move.from, to: move.to })
          setSelectedSquare(null)
          setViewIndex(null)
          playSoundForMove(move.san, gameCopy.isGameOver(), gameCopy.isCheck())
        }
      } catch {
        // Pre-move is illegal in the new position — silently discard
      }
      return
    }

    if (game.turn() !== aiTurnChar) return
    if (game.isGameOver()) return
    if (aiPendingRef.current) return

    if (useStockfishEngine) {
      aiPendingRef.current = true
      makeStockfishResponse(game, aiTurnChar)
    } else {
      // Quick eval update so eval bar reflects the position immediately after human move
      requestQuickEval(game.fen(), personality.currentConfig)

      aiPendingRef.current = true
      makeAIResponse(game, personality.currentConfig, aiTurnChar)
    }
  }, [game, mode, aiTurnChar, humanTurnChar, makeAIResponse, makeStockfishResponse, personality.currentConfig, requestQuickEval, useStockfishEngine, moveHistory.length])

  // In human-vs-human mode, update eval bar after every move
  useEffect(() => {
    if (mode !== 'human-vs-human') return
    if (moveHistory.length === 0) return
    requestQuickEval(game.fen(), DEFAULT_CONFIG)
  }, [game, mode, moveHistory.length, requestQuickEval])

  // Draw detection: check for claimable draws after each move
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

    // Check claimable draws (threefold repetition, 50-move rule)
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

  // AI vs AI game loop
  const runAIvsAIStep = useCallback(async () => {
    if (!isRunningRef.current || isPausedRef.current) return

    const currentGame = gameRef.current
    if (currentGame.isGameOver()) {
      setIsRunning(false)
      isRunningRef.current = false
      return
    }

    const turn = currentGame.turn()
    const usesSF = turn === 'w' ? whiteUseStockfishRef.current : blackUseStockfishRef.current

    try {
      let resultMove: string
      let resultEval: number

      if (usesSF) {
        const sfInstance = turn === 'w' ? stockfish : stockfishBlack
        const skillLevel = turn === 'w' ? whiteStockfishSkillRef.current : blackStockfishSkillRef.current
        const depth = turn === 'w' ? whiteStockfishDepthRef.current : blackStockfishDepthRef.current
        const result = await sfInstance.getMove(currentGame.fen(), skillLevel, depth)
        resultMove = result.move
        resultEval = result.eval
      } else {
        const ai = turn === 'w' ? whiteAI : blackAI
        const config = turn === 'w' ? whiteConfigRef.current : blackConfigRef.current
        const result = await ai.getMove(currentGame.fen(), config, (progress) => {
          setCurrentEval(progress.evaluation)
        })
        resultMove = result.move
        resultEval = result.eval
      }

      if (!isRunningRef.current) return

      // Track eval — result.eval is already from white's perspective
      setCurrentEval(resultEval)
      applyMove(resultMove)

      if (isRunningRef.current && !isPausedRef.current) {
        loopTimeoutRef.current = setTimeout(() => {
          runAIvsAIStep()
        }, delayRef.current)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('AI vs AI move error:', err)
      setIsRunning(false)
      isRunningRef.current = false
    }
  }, [whiteAI, blackAI, stockfish, stockfishBlack, applyMove])

  const startAIvsAI = useCallback(() => {
    setIsRunning(true)
    setIsPaused(false)
    isRunningRef.current = true
    isPausedRef.current = false
    runAIvsAIStep()
  }, [runAIvsAIStep])

  const pauseAIvsAI = useCallback(() => {
    setIsPaused(true)
    isPausedRef.current = true
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current)
      loopTimeoutRef.current = null
    }
  }, [])

  const resumeAIvsAI = useCallback(() => {
    setIsPaused(false)
    isPausedRef.current = false
    runAIvsAIStep()
  }, [runAIvsAIStep])

  const stopAIvsAI = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    isRunningRef.current = false
    isPausedRef.current = false
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current)
      loopTimeoutRef.current = null
    }
  }, [])

  // Handle new game from modal
  const handleNewGameStart = (settings: NewGameSettings) => {
    stopAIvsAI()
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

    setMode(settings.mode)
    setPlayerColor(settings.playerColor)
    setTimeControl(settings.timeControl)
    timeControlRef.current = settings.timeControl

    // Reset clock
    if (settings.timeControl.type !== 'none') {
      clock.reset(settings.timeControl.initialTimeMs, settings.timeControl.initialTimeMs)
    } else {
      clock.reset(0, 0)
    }

    if (settings.mode === 'human-vs-ai') {
      personality.setConfig(settings.aiConfig)
      setUseStockfishEngine(settings.useStockfish ?? false)
      setStockfishSkillLevel(settings.stockfishSkillLevel ?? 10)
      setStockfishDepth(settings.stockfishDepth ?? 10)
      if (settings.minMoveTime !== undefined) {
        setMinMoveTime(settings.minMoveTime)
        minMoveTimeRef.current = settings.minMoveTime
      }
    } else if (settings.mode === 'ai-vs-ai') {
      setWhiteConfig(settings.whiteAIConfig)
      setWhiteLabel(settings.whiteAIPresetName)
      setBlackConfig(settings.blackAIConfig)
      setBlackLabel(settings.blackAIPresetName)
      setDelay(settings.delay)
      setWhiteUseStockfish(settings.whiteUseStockfish ?? false)
      setBlackUseStockfish(settings.blackUseStockfish ?? false)
      setWhiteStockfishSkillLevel(settings.whiteStockfishSkillLevel ?? 10)
      setWhiteStockfishDepth(settings.whiteStockfishDepth ?? 10)
      setBlackStockfishSkillLevel(settings.blackStockfishSkillLevel ?? 10)
      setBlackStockfishDepth(settings.blackStockfishDepth ?? 10)
    }
  }

  // Get game status
  const getStatus = () => {
    if (resignedColor) {
      const winner = resignedColor === 'white' ? 'Black' : 'White'
      return `${resignedColor === 'white' ? 'White' : 'Black'} resigned. ${winner} wins!`
    }
    if (drawClaimed) {
      return game.isThreefoldRepetition() ? 'Draw by threefold repetition!' : 'Draw by 50-move rule!'
    }
    if (timeoutLoser) {
      const winner = timeoutLoser === 'white' ? 'Black' : 'White'
      return `Time expired! ${winner} wins!`
    }
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`
    if (game.isStalemate()) return 'Stalemate!'
    if (game.isThreefoldRepetition()) return 'Draw by three-fold repetition!'
    if (game.isDraw()) return 'Draw!'
    if (game.isCheck()) return `${game.turn() === 'w' ? 'White' : 'Black'} is in check!`
    return `${game.turn() === 'w' ? 'White' : 'Black'} to move`
  }

  // Thinking indicator
  const isThinking = mode === 'human-vs-ai'
    ? (useStockfishEngine ? stockfish.isThinking : (playerColor === 'white' ? blackAI.isThinking : whiteAI.isThinking))
    : (whiteAI.isThinking || blackAI.isThinking || stockfish.isThinking || stockfishBlack.isThinking)

  // Search depth for thinking indicator
  const activeSearchDepth = mode === 'human-vs-ai'
    ? (useStockfishEngine ? null : (playerColor === 'white' ? blackAI.searchDepth : whiteAI.searchDepth))
    : (whiteAI.searchDepth || blackAI.searchDepth)

  // Last move stats
  const lastMoveStats = mode === 'human-vs-ai'
    ? (useStockfishEngine ? stockfish.lastMoveStats : (playerColor === 'white' ? blackAI.lastMoveStats : whiteAI.lastMoveStats))
    : (blackAI.lastMoveStats ?? whiteAI.lastMoveStats)

  // Show game result modal when game ends + save to history
  const gameSavedRef = useRef(false)
  const savedGameIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (isGameOver && !gameSavedRef.current) {
      gameSavedRef.current = true
      setShowResultModal(true)
      clock.pause()

      // Determine result detail
      let resultDetail = 'Unknown'
      if (drawClaimed) resultDetail = game.isThreefoldRepetition() ? 'Repetition' : '50-move rule'
      else if (resignedColor) resultDetail = 'Resignation'
      else if (timeoutLoser) resultDetail = 'Time expired'
      else if (game.isCheckmate()) resultDetail = 'Checkmate'
      else if (game.isStalemate()) resultDetail = 'Stalemate'
      else if (game.isThreefoldRepetition()) resultDetail = 'Repetition'
      else if (game.isInsufficientMaterial()) resultDetail = 'Insufficient material'
      else if (game.isDraw()) resultDetail = '50-move rule'

      // Determine winner color
      const winnerColor = resignedColor
        ? (resignedColor === 'white' ? 'black' : 'white')
        : timeoutLoser
        ? (timeoutLoser === 'white' ? 'black' : 'white')
        : (game.turn() === 'w' ? 'black' : 'white')

      // Determine result from player perspective
      let result: GameRecord['result'] = 'draw'
      if (game.isCheckmate() || timeoutLoser || resignedColor) {
        if (mode === 'human-vs-ai') {
          result = winnerColor === playerColor ? 'win' : 'loss'
        } else if (mode === 'human-vs-human') {
          // For 2P, record as win (white perspective by convention)
          result = winnerColor === 'white' ? 'win' : 'loss'
        } else {
          result = 'draw' // ai-vs-ai: neutral perspective
        }
      }

      const aiPresetName = useStockfishEngine
        ? 'Stockfish'
        : personality.activePreset
          ? personality.activePreset.charAt(0).toUpperCase() + personality.activePreset.slice(1).toLowerCase()
          : 'Custom'

      let wLabel = 'White'
      let bLabel = 'Black'
      let aiName: string | undefined
      if (mode === 'human-vs-ai') {
        wLabel = playerColor === 'white' ? 'You' : aiPresetName
        bLabel = playerColor === 'black' ? 'You' : aiPresetName
        aiName = aiPresetName
      } else if (mode === 'human-vs-human') {
        wLabel = 'White'
        bLabel = 'Black'
      } else {
        wLabel = whiteLabel
        bLabel = blackLabel
      }

      const record: GameRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        mode,
        result,
        resultDetail,
        pgn: game.pgn(),
        moves: moveHistory.length,
        whiteLabel: wLabel,
        blackLabel: bLabel,
        playerColor: mode === 'human-vs-ai' ? playerColor : undefined,
        aiPersonality: aiName,
        aiAvatar: mode === 'human-vs-ai' && !useStockfishEngine ? (personality.currentAvatar ?? undefined) : undefined,
        durationMs: Date.now() - gameStartTimeRef.current,
      }
      saveGame(record)
      savedGameIdRef.current = record.id

      // Track stats for human-vs-ai games only
      if (mode === 'human-vs-ai') {
        recordGame(result, mode)
      }
    }
    if (!isGameOver) {
      gameSavedRef.current = false
    }
  }, [isGameOver, game, mode, playerColor, personality.activePreset, whiteLabel, blackLabel, moveHistory.length])

  // onPieceClick is intentionally a no-op. All click-to-move logic is consolidated
  // in onSquareClick below. react-chessboard v5 fires onPieceClick (Piece onClick)
  // then onSquareClick (Square onClick) for the same click event. Handling move logic
  // in both caused intermittent failures — especially on diagonal moves (pawn captures,
  // bishop moves) where sub-pixel pointer drift during the click could trigger dnd-kit's
  // drag sensor, suppressing the Piece onClick while the Square onClick still fires.
  // When that happened, onSquareClick saw a piece on the target square and selected it
  // instead of completing the move. Consolidating in onSquareClick eliminates the race.
  const onPieceClick = useCallback(() => {
    // No-op: onSquareClick handles everything
  }, [])

  // Handle piece drag begin
  const onPieceDrag = useCallback(({ square }: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null }) => {
    if (!square || isGameOver) return
    isDraggingRef.current = true
    setSelectedSquare(square)
  }, [isGameOver])

  // Handle square click — single handler for ALL click-to-move logic
  const onSquareClick = useCallback(({ square }: { piece: { pieceType: string } | null; square: string }) => {
    // After a drag operation, dnd-kit fires a click on the source square. Ignore it.
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      return
    }

    // If a piece is selected and we click a different square, try to move there
    if (selectedSquare && selectedSquare !== square) {
      // Pre-move path: during AI's turn, queue without legality check (pseudo-legal only)
      if (mode === 'human-vs-ai' && game.turn() !== humanTurnChar) {
        const clickedPiece = game.get(square as Square)
        if (clickedPiece && clickedPiece.color === humanTurnChar) {
          // Clicking own piece switches selection
          setSelectedSquare(square)
          setPreMove(null)
        } else {
          // Check if the target is pseudo-legal for the selected piece
          const selectedPiece = game.get(selectedSquare as Square)
          if (selectedPiece && selectedPiece.color === humanTurnChar) {
            const pseudoLegal = getPseudoLegalSquares(selectedPiece.type, selectedSquare, selectedPiece.color)
            if (pseudoLegal.has(square)) {
              // Queue as pre-move (captures, empty squares, anything pseudo-legal)
              setPreMove({ from: selectedSquare, to: square, promotion: 'q' })
              setSelectedSquare(null)
            } else {
              // Not pseudo-legal, deselect
              setSelectedSquare(null)
              setPreMove(null)
            }
          } else {
            setSelectedSquare(null)
          }
        }
        return
      }

      // Normal move path: check legality first
      const legalMoves = game.moves({ square: selectedSquare as Square, verbose: true })
      const isLegalTarget = legalMoves.some(m => m.to === square)
      if (isLegalTarget) {
        if (!isGameOver) {
          if (mode === 'human-vs-ai' && game.turn() === humanTurnChar) {
            makeMove(selectedSquare as Square, square as Square)
            setPreMove(null)
          } else if (mode === 'human-vs-human') {
            makeMove(selectedSquare as Square, square as Square)
          } else if (mode === 'ai-vs-ai' && !isRunning) {
            makeMove(selectedSquare as Square, square as Square)
          }
        }
        setSelectedSquare(null)
        return
      }

      // Not a legal move from selectedSquare to this square.
      // If clicking on a friendly piece, switch selection to it.
      const piece = game.get(square as Square)
      const friendlyColor = mode === 'human-vs-ai' ? humanTurnChar : game.turn()
      if (piece && piece.color === friendlyColor) {
        setSelectedSquare(square)
        return
      }

      // Otherwise deselect
      setSelectedSquare(null)
      return
    }

    // Toggle selection on the same square
    if (selectedSquare === square) {
      setSelectedSquare(null)
      return
    }

    // No piece selected yet — try to select this square's piece
    const piece = game.get(square as Square)
    if (mode === 'human-vs-ai' && game.turn() !== humanTurnChar) {
      // During AI's turn, allow selecting own pieces for pre-move
      if (piece && piece.color === humanTurnChar) {
        setSelectedSquare(square)
      } else {
        setSelectedSquare(null)
        setPreMove(null)
      }
    } else if (piece && piece.color === game.turn()) {
      setSelectedSquare(square)
    } else {
      setSelectedSquare(null)
    }
  }, [selectedSquare, game, isGameOver, mode, isRunning, makeMove, humanTurnChar])

  // Compute custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    // Pre-move highlight (distinct cyan/blue overlay)
    if (preMove) {
      const preMoveStyle: React.CSSProperties = {
        backgroundColor: 'rgba(0, 180, 216, 0.4)',
        boxShadow: 'inset 0 0 8px rgba(0, 180, 216, 0.3)',
      }
      styles[preMove.from] = { ...styles[preMove.from], ...preMoveStyle }
      styles[preMove.to] = { ...styles[preMove.to], ...preMoveStyle }
    }

    if (lastMove && settings.highlightLastMove) {
      const lastMoveStyle: React.CSSProperties = {
        backgroundColor: 'rgba(155, 199, 0, 0.35)',
      }
      styles[lastMove.from] = { ...lastMoveStyle }
      styles[lastMove.to] = { ...lastMoveStyle }
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
      }
      if (settings.showLegalMoves) {
        // During AI's turn, show pseudo-legal targets for pre-move
        const isAiTurn = mode === 'human-vs-ai' && game.turn() !== humanTurnChar
        if (isAiTurn) {
          const piece = game.get(selectedSquare as Square)
          if (piece && piece.color === humanTurnChar) {
            const pseudoLegal = getPseudoLegalSquares(piece.type, selectedSquare, piece.color)
            for (const sq of pseudoLegal) {
              const targetPiece = game.get(sq as Square)
              if (targetPiece) {
                styles[sq] = {
                  ...styles[sq],
                  background: `${styles[sq]?.backgroundColor ? `${styles[sq].backgroundColor}, ` : ''}radial-gradient(transparent 55%, rgba(0, 180, 216, 0.4) 55%)`,
                  borderRadius: '50%',
                }
              } else {
                styles[sq] = {
                  ...styles[sq],
                  background: `${styles[sq]?.backgroundColor ? `${styles[sq].backgroundColor}, ` : ''}radial-gradient(rgba(0, 180, 216, 0.35) 22%, transparent 22%)`,
                }
              }
            }
          }
        } else {
        try {
          const legalMoves = game.moves({ square: selectedSquare as Square, verbose: true })
          for (const move of legalMoves) {
            const targetPiece = game.get(move.to as Square)
            if (targetPiece) {
              styles[move.to] = {
                ...styles[move.to],
                background: `${styles[move.to]?.backgroundColor ? `${styles[move.to].backgroundColor}, ` : ''}radial-gradient(transparent 55%, rgba(0, 0, 0, 0.3) 55%)`,
                borderRadius: '50%',
              }
            } else {
              styles[move.to] = {
                ...styles[move.to],
                background: `${styles[move.to]?.backgroundColor ? `${styles[move.to].backgroundColor}, ` : ''}radial-gradient(rgba(0, 0, 0, 0.25) 22%, transparent 22%)`,
              }
            }
          }
        } catch {
          // Not a valid square for the current turn
        }
        }
      }
    }

    if (game.isCheck()) {
      const turn = game.turn()
      const board = game.board()
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = board[r][c]
          if (sq && sq.type === 'k' && sq.color === turn) {
            const file = String.fromCharCode(97 + c)
            const rank = 8 - r
            const kingSquare = `${file}${rank}`
            styles[kingSquare] = {
              ...styles[kingSquare],
              backgroundColor: 'rgba(235, 50, 50, 0.55)',
              boxShadow: 'inset 0 0 12px rgba(255, 0, 0, 0.6)',
            }
          }
        }
      }
    }

    return styles
  }, [game, lastMove, preMove, selectedSquare, settings.highlightLastMove, settings.showLegalMoves, mode, humanTurnChar])

  // Get game result for modal
  const getGameResult = () => {
    if (drawClaimed) {
      const reason = game.isThreefoldRepetition() ? 'Threefold repetition.' : '50-move rule.'
      return { title: 'Draw!', message: reason }
    }
    if (resignedColor) {
      const winner = resignedColor === 'white' ? 'Black' : 'White'
      return { title: 'Resignation', message: `${resignedColor === 'white' ? 'White' : 'Black'} resigned. ${winner} wins!` }
    }
    if (timeoutLoser) {
      const winner = timeoutLoser === 'white' ? 'Black' : 'White'
      return { title: 'Time Expired!', message: `${winner} wins on time!` }
    }
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White'
      return { title: 'Checkmate!', message: `${winner} wins!` }
    }
    if (game.isStalemate()) return { title: 'Stalemate!', message: 'The game is a draw.' }
    if (game.isThreefoldRepetition()) return { title: 'Draw!', message: 'Threefold repetition.' }
    if (game.isInsufficientMaterial()) return { title: 'Draw!', message: 'Insufficient material.' }
    if (game.isDraw()) return { title: 'Draw!', message: 'The game is a draw.' }
    return { title: '', message: '' }
  }

  // Board orientation
  const boardOrientation = (mode === 'human-vs-ai' && playerColor === 'black') ? 'black' : 'white'

  const topColor = boardOrientation === 'white' ? 'black' : 'white'
  const bottomColor = boardOrientation === 'white' ? 'white' : 'black'

  const getPlayerBar = (position: 'top' | 'bottom') => {
    const color = position === 'top' ? topColor : bottomColor
    const aiPresetName = personality.activePreset
      ? personality.activePreset.charAt(0).toUpperCase() + personality.activePreset.slice(1).toLowerCase()
      : 'Custom'

    if (mode === 'human-vs-ai') {
      const isAI = color !== playerColor
      if (isAI) {
        const isStockfish = useStockfishEngine
        return {
          icon: isStockfish ? ('cpu' as const) : ('bot' as const),
          name: isStockfish ? 'Stockfish' : aiPresetName,
          avatar: isStockfish ? null : personality.currentAvatar,
          badge: isStockfish ? `Skill ${stockfishSkillLevel}` : 'AI',
          badgeClass: isStockfish ? 'bg-orange-500/20 text-orange-300' : 'bg-purple-500/20 text-purple-300',
          iconGradient: isStockfish ? 'from-orange-500 to-red-500' : 'from-red-500 to-orange-500',
          showThinking: true,
          showStats: true,
        }
      } else {
        return {
          icon: 'user' as const,
          name: 'You',
          avatar: null as string | null,
          badge: color === 'white' ? 'White' : 'Black',
          badgeClass: color === 'white' ? 'bg-slate-200/20 text-slate-300' : 'bg-slate-500/20 text-slate-400',
          iconGradient: 'from-blue-500 to-cyan-500',
          showThinking: false,
          showStats: false,
        }
      }
    } else if (mode === 'human-vs-human') {
      const label = color === 'white' ? 'White' : 'Black'
      const isCurrentTurn = (color === 'white' && game.turn() === 'w') || (color === 'black' && game.turn() === 'b')
      return {
        icon: 'user' as const,
        name: label,
        avatar: null as string | null,
        badge: isCurrentTurn && !isGameOver ? 'Your turn' : undefined,
        badgeClass: 'bg-green-500/20 text-green-300',
        iconGradient: color === 'white' ? 'from-slate-300 to-slate-400' : 'from-slate-600 to-slate-700',
        showThinking: false,
        showStats: false,
      }
    } else {
      const isWhite = color === 'white'
      const label = isWhite ? whiteLabel : blackLabel
      const usesSF = isWhite ? whiteUseStockfish : blackUseStockfish
      const gradientColor = usesSF
        ? 'from-orange-500 to-red-500'
        : (isWhite ? 'from-blue-500 to-cyan-500' : 'from-red-500 to-orange-500')
      const isCurrentTurn = (isWhite && game.turn() === 'w') || (!isWhite && game.turn() === 'b')
      return {
        icon: usesSF ? ('cpu' as const) : ('bot' as const),
        name: label,
        avatar: null as string | null,
        badge: usesSF ? `Skill ${isWhite ? whiteStockfishSkillLevel : blackStockfishSkillLevel}` : 'AI',
        badgeClass: usesSF ? 'bg-orange-500/20 text-orange-300' : 'bg-purple-500/20 text-purple-300',
        iconGradient: gradientColor,
        showThinking: isCurrentTurn,
        showStats: !isCurrentTurn,
      }
    }
  }

  const getSearchDepth = () => {
    if (mode === 'human-vs-ai') {
      return personality.currentConfig.search?.depth ?? 4
    }
    const lastMover = game.turn() === 'w' ? 'b' : 'w'
    const config = lastMover === 'w' ? whiteConfig : blackConfig
    return config.search?.depth ?? 4
  }

  // Clock management: start after first move, switch sides on each move
  const prevMoveCountRef = useRef(0)
  useEffect(() => {
    if (timeControlRef.current.type === 'none') {
      prevMoveCountRef.current = moveHistory.length
      return
    }
    const prevCount = prevMoveCountRef.current
    prevMoveCountRef.current = moveHistory.length

    if (moveHistory.length === 0) return

    // First move: start the clock for the other side (the one who now has to move)
    if (prevCount === 0 && moveHistory.length === 1) {
      clock.start('black')
      return
    }

    // Subsequent moves: switch sides with increment
    if (moveHistory.length > prevCount && prevCount > 0) {
      clock.switchSide(timeControlRef.current.incrementMs)
    }
  }, [moveHistory.length, clock])

  // Check for time expiry
  useEffect(() => {
    if (timeControl.type === 'none') return
    if (isGameOver) return
    if (mode === 'ai-vs-ai') return // informational only

    const checkExpiry = (side: 'white' | 'black') => {
      if (clock.timeLeft[side] <= 0 && clock.activeSide === side && moveHistory.length > 0) {
        clock.pause()
        // Flag the game as over by timeout — we'll set the result
        setTimeoutLoser(side)
      }
    }
    checkExpiry('white')
    checkExpiry('black')
  }, [clock.timeLeft, clock.activeSide, timeControl, isGameOver, mode, moveHistory.length, clock])

  // Format time for display
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '0:00'
    const totalSeconds = ms / 1000
    // Last 10 seconds: show tenths like "9.5"
    if (totalSeconds < 10) {
      return totalSeconds.toFixed(1)
    }
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Compute captured pieces
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

  // Compute current opening name from move history
  const opening = useMemo(() => {
    if (moveHistory.length === 0) return null
    return lookupOpening(moveHistory)
  }, [moveHistory])

  // Compute displayed FEN based on viewIndex
  const displayFen = useMemo(() => {
    if (viewIndex === null) return game.fen()
    if (viewIndex === 0) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    // Replay moves up to viewIndex
    const temp = new Chess()
    const allMoves = game.history()
    for (let i = 0; i < viewIndex && i < allMoves.length; i++) {
      temp.move(allMoves[i])
    }
    return temp.fen()
  }, [game, viewIndex])

  const totalHalfMoves = moveHistory.length

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

  // Undo last move (human-vs-ai undoes two moves so it's the human's turn again)
  const undoLastMove = useCallback(() => {
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
  }, [game, moveHistory, isGameOver, mode, isRunning])

  // Resign the current game (human-vs-ai only)
  const handleResign = useCallback(() => {
    if (mode !== 'human-vs-ai') return
    if (isGameOver) return
    if (!window.confirm('Resign this game? This counts as a loss.')) return
    setResignedColor(playerColor)
  }, [mode, isGameOver, playerColor])

  // Claim a draw (when claimable draw is available)
  const handleClaimDraw = useCallback(() => {
    if (isGameOver) return
    if (!drawAvailable) return
    setDrawClaimed(true)
  }, [isGameOver, drawAvailable])

  // Handle keyboard move input submission
  const handleMoveInputSubmit = useCallback(() => {
    const input = moveInput.trim()
    if (!input) return
    if (isGameOver || viewIndex !== null) {
      setMoveInput('')
      return
    }

    // Check if it's the player's turn
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
        // Re-focus input for continuous play
        setTimeout(() => moveInputRef.current?.focus(), 50)
        return
      }
    } catch {
      // Invalid move — fall through to error
    }

    // Show error feedback
    setMoveInputError(true)
    setMoveInput('')
    if (moveInputErrorTimerRef.current) clearTimeout(moveInputErrorTimerRef.current)
    moveInputErrorTimerRef.current = setTimeout(() => {
      setMoveInputError(false)
    }, 1500)
  }, [moveInput, game, isGameOver, viewIndex, mode, humanTurnChar, isRunning])

  // Auto-focus move input after each move for continuous play
  useEffect(() => {
    if (moveHistory.length > 0 && !isGameOver) {
      // Small delay to let React re-render
      setTimeout(() => moveInputRef.current?.focus(), 100)
    }
  }, [moveHistory.length, isGameOver])

  // Keyboard shortcuts for move navigation and game controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Escape always closes modals and cancels pre-moves (even from inputs)
      if (e.key === 'Escape') {
        e.preventDefault()
        setPreMove(null)
        setShowNewGameModal(false)
        setShowResultModal(false)
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          navBack()
          break
        case 'ArrowRight':
          e.preventDefault()
          navForward()
          break
        case 'Home':
          e.preventDefault()
          navToStart()
          break
        case 'End':
          e.preventDefault()
          navToLive()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          setFlipped(prev => !prev)
          break
        case 'n':
        case 'N':
          e.preventDefault()
          setShowNewGameModal(true)
          break
        case 'u':
        case 'U':
          e.preventDefault()
          undoLastMove()
          break
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            undoLastMove()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navBack, navForward, navToStart, navToLive, undoLastMove])

  const isAtStart = viewIndex === 0
  const isLive = viewIndex === null
  const isReviewing = viewIndex !== null

  const getCapturedByColor = (color: 'white' | 'black') => {
    return color === 'white' ? capturedPieces.blackCaptured : capturedPieces.whiteCaptured
  }

  const isColorTurn = (color: 'white' | 'black') => {
    return (color === 'white' && game.turn() === 'w') || (color === 'black' && game.turn() === 'b')
  }

  const effectiveOrientation: 'white' | 'black' = flipped
    ? (boardOrientation === 'white' ? 'black' : 'white')
    : boardOrientation

  const effectiveTopColor = effectiveOrientation === 'white' ? 'black' : 'white'
  const effectiveBottomColor = effectiveOrientation === 'white' ? 'white' : 'black'

  // Memoize board options to reduce unnecessary Chessboard re-renders
  const boardOptions = useMemo(() => ({
    id: 'chess-board',
    dragActivationDistance: 5,
    position: displayFen,
    boardOrientation: effectiveOrientation,
    onPieceDrop: onDrop,
    onPieceClick: onPieceClick,
    onPieceDrag: onPieceDrag,
    onSquareClick: onSquareClick,
    allowDragging: !isReviewing && !isGameOver && (mode === 'human-vs-human' || mode === 'human-vs-ai' || !isRunning),
    squareStyles: customSquareStyles,
    darkSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].dark },
    lightSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].light },
    showNotation: settings.showCoordinates,
    showAnimations: settings.pieceAnimation,
    boardStyle: {
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      ...(isReviewing ? { opacity: 0.85 } : {}),
    }
  }), [displayFen, effectiveOrientation, onDrop, onPieceClick, onPieceDrag, onSquareClick, isReviewing, isGameOver, mode, isRunning, customSquareStyles, settings.boardTheme, settings.showCoordinates, settings.pieceAnimation])

  const cardGlass = 'rounded-xl p-4 border border-white/[0.08]'
  const cardGlassStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
    backdropFilter: 'blur(10px)',
  }

  const renderPlayerBar = (position: 'top' | 'bottom') => {
    const color = position === 'top' ? effectiveTopColor : effectiveBottomColor
    const bar = getPlayerBar(position === 'top' ? (effectiveTopColor === topColor ? 'top' : 'bottom') : (effectiveBottomColor === bottomColor ? 'bottom' : 'top'))
    const captured = getCapturedByColor(color)
    const isTurn = isColorTurn(color) && !isGameOver

    return (
      <div className="w-full flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bar.iconGradient} flex items-center justify-center`}>
            {bar.avatar ? (
              <span className="text-xl">{bar.avatar}</span>
            ) : bar.icon === 'cpu' ? <Cpu className="w-5 h-5 text-white" /> : bar.icon === 'bot' ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
          </div>
          <div>
            <p className="font-medium flex items-center gap-2">
              {bar.name}
              {bar.badge && (
                <span className={`text-xs ${bar.badgeClass} px-2 py-0.5 rounded-full`}>{bar.badge}</span>
              )}
            </p>
            <div className="flex items-center gap-1 text-sm text-slate-400">
              {captured.length > 0 ? (
                <span className="text-base tracking-tight">{captured.join('')}</span>
              ) : (
                <span className="text-xs text-slate-600">No captures</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bar.showThinking && isThinking && !isGameOver && (
            <span className="text-xs text-yellow-400 animate-pulse flex items-center gap-1">
              <Loader className="w-3 h-3 animate-spin" /> Thinking{activeSearchDepth ? ` d${activeSearchDepth.current}/${activeSearchDepth.max}` : '...'}
            </span>
          )}
          {!bar.showThinking && isTurn && !isThinking && timeControl.type === 'none' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {mode === 'human-vs-ai' && color === playerColor ? 'Your turn' : 'To move'}
            </span>
          )}
          {bar.showStats && !isThinking && lastMoveStats && !isGameOver && timeControl.type === 'none' && (
            <span className="text-xs text-slate-500">
              {lastMoveStats.isBookMove
                ? '📖 Book'
                : <>D{getSearchDepth()} · {lastMoveStats.nodes.toLocaleString()}n · {(lastMoveStats.timeMs / 1000).toFixed(1)}s</>
              }
            </span>
          )}
          {timeControl.type !== 'none' && (() => {
            const ms = clock.timeLeft[color]
            const isCritical = ms > 0 && ms < 10000
            const isLow = ms > 0 && ms < 30000
            const expired = ms <= 0 && moveHistory.length > 0
            return (
              <div className={`font-mono text-lg font-semibold px-3 py-1 rounded-lg transition-colors ${
                isTurn ? 'bg-slate-700/80' : 'bg-slate-800/40'
              } ${
                expired ? 'text-red-500' :
                isCritical ? 'text-red-400 animate-pulse ring-1 ring-red-500/50' :
                isLow ? 'text-orange-400 animate-pulse' :
                isTurn ? 'text-white' : 'text-slate-400'
              }`}>
                {expired ? '0:00' : formatTime(ms)}
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Fullscreen game layout — no scroll */}
      {/* Mobile: h-[calc(100dvh-40px)] accounts for slim bottom nav */}
      {/* Desktop: h-[calc(100vh-48px)] accounts for compact top nav */}
      <div className="h-[calc(100dvh-40px)] lg:h-[calc(100vh-48px)] flex flex-col lg:flex-row overflow-hidden">

        {/* ===== Board Column (center) ===== */}
        <div className="flex-1 flex flex-col items-center min-h-0 px-2 lg:px-4 py-1 lg:py-2">

          {/* Top player bar */}
          <div className="w-full max-w-xl shrink-0">
            {renderPlayerBar('top')}
          </div>

          {useStockfishEngine && stockfish.error && (
            <div className="w-full max-w-xl bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-1 text-xs text-red-300 flex flex-wrap items-center gap-2 shrink-0">
              <span>⚠️ {stockfish.error}</span>
              <button onClick={() => { setUseStockfishEngine(false) }} className="underline text-red-400 hover:text-red-300 whitespace-nowrap">
                Switch to built-in AI
              </button>
            </div>
          )}

          {/* Board area — fills remaining vertical space */}
          <div className="flex-1 w-full max-w-xl flex items-center justify-center min-h-0">
            <div className="flex gap-1.5 w-full h-full items-center justify-center">
              {settings.showEvalBar && (
                <div className="h-full max-h-[min(calc(100vw-2rem),500px)] lg:max-h-full shrink-0 flex">
                  <EvalBar evaluation={currentEval} flipped={effectiveOrientation === 'black'} />
                </div>
              )}
              <div className="aspect-square max-w-full max-h-full" style={{ width: 'min(100%, 100%)' }}>
                <Chessboard
                  options={boardOptions}
                />
              </div>
            </div>
          </div>

          {/* Reviewing banner */}
          {isReviewing && (
            <div className="w-full max-w-xl shrink-0">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1 flex items-center justify-between">
                <span className="text-xs text-amber-400 font-medium">
                  Reviewing move {viewIndex} of {totalHalfMoves}
                </span>
                <button
                  onClick={navToLive}
                  className="text-xs text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded transition-colors"
                >
                  Back to live
                </button>
              </div>
            </div>
          )}

          {/* Draw available notification (mobile) */}
          {drawAvailable && !isGameOver && drawReason && (
            <div className="lg:hidden w-full max-w-xl shrink-0">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1 flex items-center gap-2">
                <Handshake className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-400 font-medium">{drawReason}</span>
              </div>
            </div>
          )}

          {/* Opening name */}
          {opening && (
            <div className="text-center text-xs text-slate-400 w-full max-w-xl shrink-0">
              <span className="text-blue-400/80 font-mono">{opening.eco}</span>
              {' '}
              <span className="text-slate-500">{opening.name}</span>
            </div>
          )}

          {/* Bottom player bar */}
          <div className="w-full max-w-xl shrink-0">
            {renderPlayerBar('bottom')}
          </div>

          {/* Keyboard move input — mobile */}
          {!isGameOver && !isReviewing && (mode !== 'ai-vs-ai' || !isRunning) && (
            <div className="w-full max-w-xl shrink-0 px-1 pb-1 lg:hidden">
              <form
                onSubmit={(e) => { e.preventDefault(); handleMoveInputSubmit(); }}
                className="flex gap-1.5"
              >
                <input
                  ref={moveInputRef}
                  type="text"
                  value={moveInput}
                  onChange={(e) => { setMoveInput(e.target.value); setMoveInputError(false); }}
                  placeholder="Type move (e.g. e4, Nf3)"
                  aria-label="Type a chess move in algebraic notation"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className={`flex-1 min-w-0 bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono ${
                    moveInputError
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                <button
                  type="submit"
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium px-3 rounded-lg transition-colors text-sm min-h-[44px]"
                  aria-label="Submit move"
                >
                  ↵
                </button>
              </form>
              {moveInputError && (
                <p className="text-xs text-red-400 mt-0.5 px-1">Invalid move</p>
              )}
            </div>
          )}

          {/* Mobile action row */}
          <div className="flex gap-1.5 lg:hidden w-full max-w-xl shrink-0 pb-1">
            <button
              onClick={() => setShowNewGameModal(true)}
              className="flex items-center justify-center gap-1 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium min-h-[44px] px-2 rounded-lg transition-colors text-xs"
              aria-label="New game"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
            <button
              onClick={() => setFlipped(f => !f)}
              className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs"
              aria-label="Flip board"
            >
              <FlipVertical className="w-3.5 h-3.5" />
            </button>
            {mode === 'human-vs-ai' && (
              <button
                onClick={undoLastMove}
                disabled={moveHistory.length === 0 || isThinking || isGameOver}
                className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs"
                title="Undo move"
                aria-label="Undo move"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
            {mode === 'human-vs-ai' && !isGameOver && moveHistory.length > 0 && (
              <button
                onClick={handleResign}
                disabled={isThinking}
                className="flex items-center justify-center gap-1 bg-red-900/40 hover:bg-red-800/50 disabled:bg-slate-800 disabled:text-slate-600 text-red-300 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs border border-red-500/20"
                title="Resign"
                aria-label="Resign"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
            {!isGameOver && drawAvailable && (
              <button
                onClick={handleClaimDraw}
                className="flex items-center justify-center gap-1 bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 font-medium min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors text-xs border border-amber-500/20 animate-pulse"
                title={drawReason ?? 'Claim draw'}
                aria-label={drawReason ?? 'Claim draw'}
              >
                <Handshake className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowMoveHistory(h => !h)}
              aria-label={showMoveHistory ? 'Hide move history' : 'Show move history'}
              className={`flex items-center justify-center gap-1 font-medium min-h-[44px] px-2 rounded-lg transition-colors text-xs ${
                showMoveHistory ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              {moveHistory.length > 0 && <span>{moveHistory.length}</span>}
              {showMoveHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
            {mode === 'ai-vs-ai' && (
              <>
                {!isRunning || isGameOver ? (
                  <button onClick={startAIvsAI} disabled={isGameOver} aria-label="Start AI match" className="flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-medium min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs">▶</button>
                ) : isPaused ? (
                  <button onClick={resumeAIvsAI} aria-label="Resume AI match" className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-medium min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs">▶</button>
                ) : (
                  <button onClick={pauseAIvsAI} aria-label="Pause AI match" className="flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 text-white font-medium min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs">⏸</button>
                )}
              </>
            )}
          </div>

          {/* Mobile: collapsible move history overlay */}
          {showMoveHistory && (
            <div className="lg:hidden absolute bottom-14 left-0 right-0 z-30 px-2 pb-1">
              <div className="rounded-xl border border-white/[0.08] p-3 max-h-48 overflow-y-auto" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.98))', backdropFilter: 'blur(10px)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-xs text-slate-400 flex items-center gap-1.5">
                    <ScrollText className="w-3.5 h-3.5" />
                    Moves ({moveHistory.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    {moveHistory.length > 0 && (
                      <button onClick={handleCopyPGN} className="text-slate-400 hover:text-white transition-colors" title="Copy PGN" aria-label="Copy PGN">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button onClick={() => setShowMoveHistory(false)} aria-label="Close move history" className="text-slate-400 hover:text-white">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="font-mono text-xs space-y-0.5">
                  {moveHistory.length === 0 ? (
                    <p className="text-slate-500 italic">No moves yet</p>
                  ) : (
                    Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                      <div key={i} className="flex items-center py-0.5 hover:bg-slate-800/50 rounded px-1 transition-colors">
                        <span className="text-slate-500 w-6">{i + 1}.</span>
                        <span
                          className={`flex-1 cursor-pointer rounded px-1 ${viewIndex === i * 2 + 1 ? 'bg-blue-500/30 text-blue-200' : 'text-white hover:bg-slate-700/50'}`}
                          onClick={() => setViewIndex(i * 2 + 1)}
                        >{moveHistory[i * 2]}</span>
                        <span
                          className={`flex-1 cursor-pointer rounded px-1 ${moveHistory[i * 2 + 1] ? (viewIndex === i * 2 + 2 ? 'bg-blue-500/30 text-blue-200' : 'text-slate-400 hover:bg-slate-700/50') : 'text-slate-600'}`}
                          onClick={() => moveHistory[i * 2 + 1] && setViewIndex(i * 2 + 2)}
                        >{moveHistory[i * 2 + 1] ?? ''}</span>
                      </div>
                    ))
                  )}
                </div>
                {/* Move nav buttons */}
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-700/50">
                  <button onClick={navToStart} disabled={isAtStart || totalHalfMoves === 0} aria-label="First move" className={`flex-1 min-h-[44px] min-w-[44px] p-1.5 rounded transition ${isAtStart || totalHalfMoves === 0 ? 'text-slate-600 opacity-50' : 'hover:bg-slate-800 text-slate-400'}`}><ChevronsLeft className="w-3.5 h-3.5 mx-auto" /></button>
                  <button onClick={navBack} disabled={isAtStart || totalHalfMoves === 0} aria-label="Previous move" className={`flex-1 min-h-[44px] min-w-[44px] p-1.5 rounded transition ${isAtStart || totalHalfMoves === 0 ? 'text-slate-600 opacity-50' : 'hover:bg-slate-800 text-slate-400'}`}><ChevronLeft className="w-3.5 h-3.5 mx-auto" /></button>
                  <button onClick={navForward} disabled={isLive || totalHalfMoves === 0} aria-label="Next move" className={`flex-1 min-h-[44px] min-w-[44px] p-1.5 rounded transition ${isLive || totalHalfMoves === 0 ? 'text-slate-600 opacity-50' : 'hover:bg-slate-800 text-slate-400'}`}><ChevronRight className="w-3.5 h-3.5 mx-auto" /></button>
                  <button onClick={navToLive} disabled={isLive || totalHalfMoves === 0} aria-label="Live position" className={`flex-1 min-h-[44px] min-w-[44px] p-1.5 rounded transition ${isLive || totalHalfMoves === 0 ? 'text-slate-600 opacity-50' : 'hover:bg-slate-800 text-slate-400'}`}><ChevronsRight className="w-3.5 h-3.5 mx-auto" /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== Desktop Sidebar ===== */}
        <div className="hidden lg:flex w-72 flex-col gap-3 p-3 overflow-y-auto shrink-0">
          {/* Status */}
          <div className={cardGlass} style={cardGlassStyle}>
            <div role="status" aria-live="polite" aria-atomic="true">
              <p className={`text-sm font-medium ${game.isCheck() ? 'text-red-400' : 'text-slate-300'}`}>
                {getStatus()}
              </p>
            </div>
            {mode === 'ai-vs-ai' && isRunning && !isPaused && (
              <p className="text-xs text-purple-400 mt-1 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> AI vs AI in progress</p>
            )}
            {mode === 'ai-vs-ai' && isPaused && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> Paused</p>
            )}
            {drawAvailable && !isGameOver && drawReason && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><Handshake className="w-3.5 h-3.5" /> {drawReason}</p>
            )}
          </div>

          {/* Controls */}
          <div className={`${cardGlass} space-y-3`} style={cardGlassStyle}>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewGameModal(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
              >
                New Game
              </button>
              <button
                onClick={() => setFlipped(f => !f)}
                className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white border border-slate-700"
                title="Flip board (F)"
                aria-label="Flip board"
              >
                <FlipVertical className="w-4 h-4" />
              </button>
              <div className="relative group">
                <button
                  className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white border border-slate-700"
                  title="Keyboard shortcuts"
                  aria-label="Keyboard shortcuts"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <div className="invisible group-hover:visible absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl z-40">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Keyboard Shortcuts</p>
                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between"><span>Flip board</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">F</kbd></div>
                    <div className="flex justify-between"><span>New game</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">N</kbd></div>
                    <div className="flex justify-between"><span>Undo</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Ctrl+Z</kbd></div>
                    <div className="flex justify-between"><span>← → moves</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Arrows</kbd></div>
                  </div>
                </div>
              </div>
            </div>

            {mode === 'human-vs-ai' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-500">Move Delay</p>
                  <span className="text-xs text-slate-400 font-mono">{minMoveTime === 0 ? 'Off' : `${(minMoveTime / 1000).toFixed(1)}s`}</span>
                </div>
                <input type="range" min={0} max={2000} step={250} value={minMoveTime} onChange={(e) => { setMinMoveTime(Number(e.target.value)); minMoveTimeRef.current = Number(e.target.value); }} aria-label="AI move delay" className="w-full h-1.5 accent-blue-500 cursor-pointer" />
                {!isGameOver && moveHistory.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={undoLastMove}
                      disabled={moveHistory.length === 0 || isThinking}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs"
                      title="Undo move (U)"
                      aria-label="Undo move"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Undo
                    </button>
                    <button
                      onClick={handleResign}
                      disabled={isThinking}
                      className="flex items-center justify-center gap-1.5 bg-red-900/40 hover:bg-red-800/50 disabled:bg-slate-800 disabled:text-slate-600 text-red-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-red-500/20"
                      title="Resign"
                      aria-label="Resign"
                    >
                      <Flag className="w-3.5 h-3.5" /> Resign
                    </button>
                  </div>
                )}
                {drawAvailable && !isGameOver && (
                  <button
                    onClick={handleClaimDraw}
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-amber-500/20 animate-pulse"
                    title={drawReason ?? 'Claim draw'}
                    aria-label={drawReason ?? 'Claim draw'}
                  >
                    <Handshake className="w-3.5 h-3.5" /> Claim Draw
                  </button>
                )}
              </div>
            )}

            {mode === 'ai-vs-ai' && (
              <>
                <div className="flex gap-2">
                  {!isRunning || isGameOver ? (
                    <button onClick={startAIvsAI} disabled={isGameOver} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">▶ Start</button>
                  ) : isPaused ? (
                    <button onClick={resumeAIvsAI} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">▶ Resume</button>
                  ) : (
                    <button onClick={pauseAIvsAI} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">⏸ Pause</button>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-500">Move Delay</p>
                    <span className="text-xs text-slate-400 font-mono">{delay}ms</span>
                  </div>
                  <input type="range" min={100} max={2000} step={100} value={delay} onChange={(e) => setDelay(Number(e.target.value))} aria-label="AI vs AI move delay" className="w-full h-1.5 accent-purple-500 cursor-pointer" />
                </div>
              </>
            )}
          </div>

          {/* Keyboard move input — desktop */}
          {!isGameOver && !isReviewing && (mode !== 'ai-vs-ai' || !isRunning) && (
            <div className={cardGlass} style={cardGlassStyle}>
              <form
                onSubmit={(e) => { e.preventDefault(); handleMoveInputSubmit(); }}
                className="flex gap-2"
              >
                <input
                  ref={moveInputRef}
                  type="text"
                  value={moveInput}
                  onChange={(e) => { setMoveInput(e.target.value); setMoveInputError(false); }}
                  placeholder="Type move (e.g. e4, Nf3)"
                  aria-label="Type a chess move in algebraic notation"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className={`flex-1 min-w-0 bg-slate-800 border rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono ${
                    moveInputError
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                <button
                  type="submit"
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
                  aria-label="Submit move"
                >
                  ↵
                </button>
              </form>
              {moveInputError && (
                <p className="text-xs text-red-400 mt-1">Invalid move</p>
              )}
            </div>
          )}

          {/* Move History — desktop sidebar */}
          <div className={`${cardGlass} flex-1 flex flex-col min-h-0`} style={cardGlassStyle}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-400 flex items-center gap-2">
                <ScrollText className="w-4 h-4" />
                Moves
                <span className="text-xs text-slate-600 font-normal">
                  {moveHistory.length}
                </span>
              </h3>
              {moveHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={handleCopyFEN} className="text-slate-400 hover:text-white transition-colors" title="Copy FEN" aria-label="Copy FEN">
                    {fenCopied ? <Check className="w-4 h-4 text-green-400" /> : <span className="text-[10px] font-mono font-bold">FEN</span>}
                  </button>
                  <button onClick={handleCopyPGN} className="text-slate-400 hover:text-white transition-colors" title="Copy PGN" aria-label="Copy PGN">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-y-auto flex-1 font-mono text-sm space-y-0.5 min-h-0">
              {moveHistory.length === 0 ? (
                <p className="text-slate-500 italic text-xs">No moves yet</p>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                  <div key={i} className="flex items-center py-1 hover:bg-slate-800/50 rounded px-2 transition-colors">
                    <span className="text-slate-500 w-7">{i + 1}.</span>
                    <span
                      className={`flex-1 cursor-pointer rounded px-1 transition-colors ${
                        viewIndex === i * 2 + 1
                          ? 'bg-blue-500/30 text-blue-200'
                          : viewIndex === null && i * 2 === moveHistory.length - 1 && moveHistory.length % 2 === 1
                          ? 'text-white'
                          : 'text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => setViewIndex(i * 2 + 1)}
                    >{moveHistory[i * 2]}</span>
                    <span
                      className={`flex-1 cursor-pointer rounded px-1 transition-colors ${
                        moveHistory[i * 2 + 1]
                          ? viewIndex === i * 2 + 2
                            ? 'bg-blue-500/30 text-blue-200'
                            : 'text-slate-400 hover:bg-slate-700/50'
                          : 'text-slate-600'
                      }`}
                      onClick={() => moveHistory[i * 2 + 1] && setViewIndex(i * 2 + 2)}
                    >{moveHistory[i * 2 + 1] ?? (i * 2 + 1 >= moveHistory.length ? '...' : '')}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50 shrink-0">
              <button onClick={navToStart} disabled={isAtStart || totalHalfMoves === 0} className={`flex-1 p-1.5 rounded-lg transition ${isAtStart || totalHalfMoves === 0 ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="First move" aria-label="First move"><ChevronsLeft className="w-4 h-4 mx-auto" /></button>
              <button onClick={navBack} disabled={isAtStart || totalHalfMoves === 0} className={`flex-1 p-1.5 rounded-lg transition ${isAtStart || totalHalfMoves === 0 ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Previous move" aria-label="Previous move"><ChevronLeft className="w-4 h-4 mx-auto" /></button>
              <button onClick={navForward} disabled={isLive || totalHalfMoves === 0} className={`flex-1 p-1.5 rounded-lg transition ${isLive || totalHalfMoves === 0 ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Next move" aria-label="Next move"><ChevronRight className="w-4 h-4 mx-auto" /></button>
              <button onClick={navToLive} disabled={isLive || totalHalfMoves === 0} className={`flex-1 p-1.5 rounded-lg transition ${isLive || totalHalfMoves === 0 ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Live position" aria-label="Live position"><ChevronsRight className="w-4 h-4 mx-auto" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* New Game Modal */}
      {showNewGameModal && (
        <NewGameModal
          onStart={handleNewGameStart}
          onClose={() => setShowNewGameModal(false)}
        />
      )}

      {/* Game Result Modal */}
      {showResultModal && isGameOver && (
        <GameResultModal
          result={getGameResult()}
          moveCount={moveHistory.length}
          durationMs={Date.now() - gameStartTimeRef.current}
          openingName={opening?.name}
          gameId={savedGameIdRef.current}
          pgn={game.pgn()}
          onNewGame={() => { setShowResultModal(false); setShowNewGameModal(true); }}
          onAnalyze={() => { setShowResultModal(false); if (savedGameIdRef.current) navigate(`/analysis/${savedGameIdRef.current}`); }}
          onDismiss={() => setShowResultModal(false)}
        />
      )}
    </>
  )
}
