import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { Chessboard } from 'react-chessboard'
import { Chess, type Square } from 'chess.js'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Bot, Flag, FlipVertical, Handshake, HelpCircle, Undo2 } from 'lucide-react'
import { getSettings } from '../utils/settings'
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
import { playSoundForMove } from '../utils/sounds'
import { useGameState } from '../hooks/useGameState'
import type { GameMode } from '../hooks/useGameState'
import { useAIvsAI } from '../hooks/useAIvsAI'
import { PlayerBar } from '../components/PlayerBar'
import type { PlayerBarInfo } from '../components/PlayerBar'
import { MoveHistoryPanel } from '../components/MoveHistoryPanel'
import { GameControls } from '../components/GameControls'

export default function GamePage() {
  usePageTitle('Play')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Determine initial mode/preset from URL params
  const initialMode = (searchParams.get('mode') as GameMode) || 'human-vs-ai'
  const initialPreset = searchParams.get('preset') as PresetName | null
  const initialLoadSaved = searchParams.get('loadSaved')
  const initialFen = searchParams.get('fen')

  // Core game state
  const gs = useGameState({ initialFen })

  // AI personality
  const personality = useAIPersonality()

  // Min AI move time
  const [minMoveTime, setMinMoveTime] = useState(500)
  const minMoveTimeRef = useRef(500)

  // Game mode
  const [mode, setMode] = useState<GameMode>(initialMode)

  // Player color for human-vs-ai
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')

  // AI instances for human-vs-ai
  const humanAI_white = useChessAI()
  const humanAI_black = useChessAI()
  const humanStockfish = useStockfish()

  // Stockfish mode state (human-vs-ai)
  const [useStockfishEngine, setUseStockfishEngine] = useState(false)
  const [stockfishSkillLevel, setStockfishSkillLevel] = useState(10)
  const [stockfishDepth, setStockfishDepth] = useState(10)

  // AI vs AI hook
  const aivsai = useAIvsAI(gs.applyMove, gs.setCurrentEval)

  // Time control
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[0])
  const clock = useChessClock()
  const timeControlRef = useRef<TimeControl>(TIME_CONTROLS[0])

  // User preferences from Settings page
  const [settings, setSettings] = useState(getSettings())

  // Determine the human's color character for turn checks
  const humanTurnChar = playerColor === 'white' ? 'w' : 'b'
  const aiTurnChar = playerColor === 'white' ? 'b' : 'w'

  // Keep AI vs AI game ref in sync
  useEffect(() => {
    aivsai.setGameRef(gs.game)
  }, [gs.game, aivsai.setGameRef])

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

  // Human vs AI: after human moves, trigger AI response (custom engine)
  const makeAIResponse = useCallback(async (currentGame: Chess, config: EvaluationConfig, expectedAiTurnChar: string) => {
    if (currentGame.isGameOver()) return
    const startTime = Date.now()
    try {
      const ai = playerColor === 'white' ? humanAI_black : humanAI_white
      const result = await ai.getMove(currentGame.fen(), config, (progress) => {
        gs.setCurrentEval(progress.evaluation)
      })
      const elapsed = Date.now() - startTime
      const remaining = minMoveTimeRef.current - elapsed
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining))
      }
      if (gs.gameRef.current.turn() !== expectedAiTurnChar) return
      gs.setCurrentEval(result.eval)
      gs.applyMove(result.move)
    } catch (err) {
      if (import.meta.env.DEV) console.error('AI move error:', err)
    } finally {
      gs.aiPendingRef.current = false
    }
  }, [humanAI_black, humanAI_white, playerColor, gs.applyMove, gs.setCurrentEval, gs.gameRef])

  // Human vs AI: after human moves, trigger Stockfish response
  const makeStockfishResponse = useCallback(async (currentGame: Chess, expectedAiTurnChar: string) => {
    if (currentGame.isGameOver()) return
    const startTime = Date.now()
    try {
      const result = await humanStockfish.getMove(currentGame.fen(), stockfishSkillLevel, stockfishDepth)
      const elapsed = Date.now() - startTime
      const remaining = minMoveTimeRef.current - elapsed
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining))
      }
      if (gs.gameRef.current.turn() !== expectedAiTurnChar) return
      gs.setCurrentEval(result.eval)
      gs.applyMove(result.move)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Stockfish move error:', err)
    } finally {
      gs.aiPendingRef.current = false
    }
  }, [humanStockfish, stockfishSkillLevel, stockfishDepth, gs.applyMove, gs.setCurrentEval, gs.gameRef])

  // Quick eval after human moves
  const requestQuickEval = useCallback((fen: string, config: EvaluationConfig) => {
    const ai = mode === 'ai-vs-ai' ? aivsai.whiteAI : (playerColor === 'white' ? humanAI_black : humanAI_white)
    ai.getEval(fen, config).then(ev => gs.setCurrentEval(ev)).catch(() => {})
  }, [mode, playerColor, humanAI_white, humanAI_black, aivsai.whiteAI, gs.setCurrentEval])

  // Handle piece drop
  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    gs.isDraggingRef.current = false
    if (!targetSquare) return false
    if (gs.isGameOver) return false
    if (gs.isReviewing) return false
    if (mode === 'ai-vs-ai' && aivsai.isRunning) return false

    // Pre-move
    if (mode === 'human-vs-ai' && gs.game.turn() !== humanTurnChar) {
      const piece = gs.game.get(sourceSquare as Square)
      if (piece && piece.color === humanTurnChar) {
        const pseudoLegal = getPseudoLegalSquares(piece.type, sourceSquare, piece.color)
        if (pseudoLegal.has(targetSquare)) {
          gs.setPreMove({ from: sourceSquare, to: targetSquare, promotion: 'q' })
          gs.setSelectedSquare(null)
        }
      }
      return false
    }

    const moveSuccess = gs.makeMove(sourceSquare as Square, targetSquare as Square)
    if (moveSuccess) gs.setPreMove(null)
    return moveSuccess
  }

  // After human move in human-vs-ai mode, trigger AI + update eval bar
  useEffect(() => {
    if (mode !== 'human-vs-ai') return

    // Pre-move execution
    if (gs.game.turn() === humanTurnChar && gs.preMoveRef.current && gs.moveHistory.length > 0) {
      const pm = gs.preMoveRef.current
      gs.setPreMove(null)
      const gameCopy = new Chess()
      gameCopy.loadPgn(gs.game.pgn())
      try {
        const move = gameCopy.move({ from: pm.from as Square, to: pm.to as Square, promotion: (pm.promotion ?? 'q') as 'q' | 'r' | 'b' | 'n' })
        if (move) {
          gs.setGame(gameCopy)
          gs.gameRef.current = gameCopy
          gs.setMoveHistory(prev => [...prev, move.san])
          gs.setLastMove({ from: move.from, to: move.to })
          gs.setSelectedSquare(null)
          gs.setViewIndex(null)
          playSoundForMove(move.san, gameCopy.isGameOver(), gameCopy.isCheck())
        }
      } catch { /* Pre-move is illegal in the new position */ }
      return
    }

    if (gs.game.turn() !== aiTurnChar) return
    if (gs.game.isGameOver()) return
    if (gs.aiPendingRef.current) return

    if (useStockfishEngine) {
      gs.aiPendingRef.current = true
      makeStockfishResponse(gs.game, aiTurnChar)
    } else {
      requestQuickEval(gs.game.fen(), personality.currentConfig)
      gs.aiPendingRef.current = true
      makeAIResponse(gs.game, personality.currentConfig, aiTurnChar)
    }
  }, [gs.game, mode, aiTurnChar, humanTurnChar, makeAIResponse, makeStockfishResponse, personality.currentConfig, requestQuickEval, useStockfishEngine, gs.moveHistory.length])

  // In human-vs-human mode, update eval bar after every move
  useEffect(() => {
    if (mode !== 'human-vs-human') return
    if (gs.moveHistory.length === 0) return
    requestQuickEval(gs.game.fen(), DEFAULT_CONFIG)
  }, [gs.game, mode, gs.moveHistory.length, requestQuickEval])

  // Handle new game from modal
  const handleNewGameStart = (settings: NewGameSettings) => {
    aivsai.stopAIvsAI()
    gs.resetGame()
    gs.prevMoveCountRef.current = 0

    setMode(settings.mode)
    setPlayerColor(settings.playerColor)
    setTimeControl(settings.timeControl)
    timeControlRef.current = settings.timeControl

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
      aivsai.setWhiteConfig(settings.whiteAIConfig)
      aivsai.setWhiteLabel(settings.whiteAIPresetName)
      aivsai.setBlackConfig(settings.blackAIConfig)
      aivsai.setBlackLabel(settings.blackAIPresetName)
      aivsai.setDelay(settings.delay)
      aivsai.setWhiteUseStockfish(settings.whiteUseStockfish ?? false)
      aivsai.setBlackUseStockfish(settings.blackUseStockfish ?? false)
      aivsai.setWhiteStockfishSkillLevel(settings.whiteStockfishSkillLevel ?? 10)
      aivsai.setWhiteStockfishDepth(settings.whiteStockfishDepth ?? 10)
      aivsai.setBlackStockfishSkillLevel(settings.blackStockfishSkillLevel ?? 10)
      aivsai.setBlackStockfishDepth(settings.blackStockfishDepth ?? 10)
    }
  }

  // Get game status
  const getStatus = () => {
    if (gs.resignedColor) {
      const winner = gs.resignedColor === 'white' ? 'Black' : 'White'
      return `${gs.resignedColor === 'white' ? 'White' : 'Black'} resigned. ${winner} wins!`
    }
    if (gs.drawClaimed) {
      return gs.game.isThreefoldRepetition() ? 'Draw by threefold repetition!' : 'Draw by 50-move rule!'
    }
    if (gs.timeoutLoser) {
      const winner = gs.timeoutLoser === 'white' ? 'Black' : 'White'
      return `Time expired! ${winner} wins!`
    }
    if (gs.game.isCheckmate()) return `Checkmate! ${gs.game.turn() === 'w' ? 'Black' : 'White'} wins!`
    if (gs.game.isStalemate()) return 'Stalemate!'
    if (gs.game.isThreefoldRepetition()) return 'Draw by three-fold repetition!'
    if (gs.game.isDraw()) return 'Draw!'
    if (gs.game.isCheck()) return `${gs.game.turn() === 'w' ? 'White' : 'Black'} is in check!`
    return `${gs.game.turn() === 'w' ? 'White' : 'Black'} to move`
  }

  // Thinking indicator
  const isThinking = mode === 'human-vs-ai'
    ? (useStockfishEngine ? humanStockfish.isThinking : (playerColor === 'white' ? humanAI_black.isThinking : humanAI_white.isThinking))
    : (aivsai.whiteAI.isThinking || aivsai.blackAI.isThinking || aivsai.stockfish.isThinking || aivsai.stockfishBlack.isThinking)

  const activeSearchDepth = mode === 'human-vs-ai'
    ? (useStockfishEngine ? null : (playerColor === 'white' ? humanAI_black.searchDepth : humanAI_white.searchDepth))
    : (aivsai.whiteAI.searchDepth || aivsai.blackAI.searchDepth)

  const lastMoveStats = mode === 'human-vs-ai'
    ? (useStockfishEngine ? humanStockfish.lastMoveStats : (playerColor === 'white' ? humanAI_black.lastMoveStats : humanAI_white.lastMoveStats))
    : (aivsai.blackAI.lastMoveStats ?? aivsai.whiteAI.lastMoveStats)

  // Save game when it ends
  useEffect(() => {
    gs.saveGameOnEnd({
      mode,
      playerColor,
      activePreset: personality.activePreset,
      currentAvatar: personality.currentAvatar,
      useStockfishEngine,
      stockfishSkillLevel,
      whiteLabel: aivsai.whiteLabel,
      blackLabel: aivsai.blackLabel,
      clock,
    })
  }, [gs.isGameOver])

  // onPieceClick is intentionally a no-op
  const onPieceClick = useCallback(() => {}, [])

  const onPieceDrag = useCallback(({ square }: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null }) => {
    if (!square || gs.isGameOver) return
    gs.isDraggingRef.current = true
    gs.setSelectedSquare(square)
  }, [gs.isGameOver])

  // Handle square click
  const onSquareClick = useCallback(({ square }: { piece: { pieceType: string } | null; square: string }) => {
    if (gs.isDraggingRef.current) {
      gs.isDraggingRef.current = false
      return
    }

    if (gs.selectedSquare && gs.selectedSquare !== square) {
      // Pre-move path
      if (mode === 'human-vs-ai' && gs.game.turn() !== humanTurnChar) {
        const clickedPiece = gs.game.get(square as Square)
        if (clickedPiece && clickedPiece.color === humanTurnChar) {
          gs.setSelectedSquare(square)
          gs.setPreMove(null)
        } else {
          const selectedPiece = gs.game.get(gs.selectedSquare as Square)
          if (selectedPiece && selectedPiece.color === humanTurnChar) {
            const pseudoLegal = getPseudoLegalSquares(selectedPiece.type, gs.selectedSquare, selectedPiece.color)
            if (pseudoLegal.has(square)) {
              gs.setPreMove({ from: gs.selectedSquare, to: square, promotion: 'q' })
              gs.setSelectedSquare(null)
            } else {
              gs.setSelectedSquare(null)
              gs.setPreMove(null)
            }
          } else {
            gs.setSelectedSquare(null)
          }
        }
        return
      }

      // Normal move path
      const legalMoves = gs.game.moves({ square: gs.selectedSquare as Square, verbose: true })
      const isLegalTarget = legalMoves.some(m => m.to === square)
      if (isLegalTarget) {
        if (!gs.isGameOver) {
          if (mode === 'human-vs-ai' && gs.game.turn() === humanTurnChar) {
            gs.makeMove(gs.selectedSquare as Square, square as Square)
            gs.setPreMove(null)
          } else if (mode === 'human-vs-human') {
            gs.makeMove(gs.selectedSquare as Square, square as Square)
          } else if (mode === 'ai-vs-ai' && !aivsai.isRunning) {
            gs.makeMove(gs.selectedSquare as Square, square as Square)
          }
        }
        gs.setSelectedSquare(null)
        return
      }

      const piece = gs.game.get(square as Square)
      const friendlyColor = mode === 'human-vs-ai' ? humanTurnChar : gs.game.turn()
      if (piece && piece.color === friendlyColor) {
        gs.setSelectedSquare(square)
        return
      }
      gs.setSelectedSquare(null)
      return
    }

    if (gs.selectedSquare === square) {
      gs.setSelectedSquare(null)
      return
    }

    const piece = gs.game.get(square as Square)
    if (mode === 'human-vs-ai' && gs.game.turn() !== humanTurnChar) {
      if (piece && piece.color === humanTurnChar) {
        gs.setSelectedSquare(square)
      } else {
        gs.setSelectedSquare(null)
        gs.setPreMove(null)
      }
    } else if (piece && piece.color === gs.game.turn()) {
      gs.setSelectedSquare(square)
    } else {
      gs.setSelectedSquare(null)
    }
  }, [gs.selectedSquare, gs.game, gs.isGameOver, mode, aivsai.isRunning, gs.makeMove, humanTurnChar])

  // Custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    if (gs.preMove) {
      const preMoveStyle: React.CSSProperties = {
        backgroundColor: 'rgba(0, 180, 216, 0.4)',
        boxShadow: 'inset 0 0 8px rgba(0, 180, 216, 0.3)',
      }
      styles[gs.preMove.from] = { ...styles[gs.preMove.from], ...preMoveStyle }
      styles[gs.preMove.to] = { ...styles[gs.preMove.to], ...preMoveStyle }
    }

    if (gs.lastMove && settings.highlightLastMove) {
      const lastMoveStyle: React.CSSProperties = { backgroundColor: 'rgba(155, 199, 0, 0.35)' }
      styles[gs.lastMove.from] = { ...lastMoveStyle }
      styles[gs.lastMove.to] = { ...lastMoveStyle }
    }

    if (gs.selectedSquare) {
      styles[gs.selectedSquare] = { ...styles[gs.selectedSquare], backgroundColor: 'rgba(255, 255, 0, 0.4)' }
      if (settings.showLegalMoves) {
        const isAiTurn = mode === 'human-vs-ai' && gs.game.turn() !== humanTurnChar
        if (isAiTurn) {
          const piece = gs.game.get(gs.selectedSquare as Square)
          if (piece && piece.color === humanTurnChar) {
            const pseudoLegal = getPseudoLegalSquares(piece.type, gs.selectedSquare, piece.color)
            for (const sq of pseudoLegal) {
              const targetPiece = gs.game.get(sq as Square)
              if (targetPiece) {
                styles[sq] = { ...styles[sq], background: `${styles[sq]?.backgroundColor ? `${styles[sq].backgroundColor}, ` : ''}radial-gradient(transparent 55%, rgba(0, 180, 216, 0.4) 55%)`, borderRadius: '50%' }
              } else {
                styles[sq] = { ...styles[sq], background: `${styles[sq]?.backgroundColor ? `${styles[sq].backgroundColor}, ` : ''}radial-gradient(rgba(0, 180, 216, 0.35) 22%, transparent 22%)` }
              }
            }
          }
        } else {
          try {
            const legalMoves = gs.game.moves({ square: gs.selectedSquare as Square, verbose: true })
            for (const move of legalMoves) {
              const targetPiece = gs.game.get(move.to as Square)
              if (targetPiece) {
                styles[move.to] = { ...styles[move.to], background: `${styles[move.to]?.backgroundColor ? `${styles[move.to].backgroundColor}, ` : ''}radial-gradient(transparent 55%, rgba(0, 0, 0, 0.3) 55%)`, borderRadius: '50%' }
              } else {
                styles[move.to] = { ...styles[move.to], background: `${styles[move.to]?.backgroundColor ? `${styles[move.to].backgroundColor}, ` : ''}radial-gradient(rgba(0, 0, 0, 0.25) 22%, transparent 22%)` }
              }
            }
          } catch { /* Not a valid square for the current turn */ }
        }
      }
    }

    if (gs.game.isCheck()) {
      const turn = gs.game.turn()
      const board = gs.game.board()
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = board[r][c]
          if (sq && sq.type === 'k' && sq.color === turn) {
            const file = String.fromCharCode(97 + c)
            const rank = 8 - r
            const kingSquare = `${file}${rank}`
            styles[kingSquare] = { ...styles[kingSquare], backgroundColor: 'rgba(235, 50, 50, 0.55)', boxShadow: 'inset 0 0 12px rgba(255, 0, 0, 0.6)' }
          }
        }
      }
    }

    return styles
  }, [gs.game, gs.lastMove, gs.preMove, gs.selectedSquare, settings.highlightLastMove, settings.showLegalMoves, mode, humanTurnChar])

  // Get game result for modal
  const getGameResult = () => {
    if (gs.drawClaimed) {
      const reason = gs.game.isThreefoldRepetition() ? 'Threefold repetition.' : '50-move rule.'
      return { title: 'Draw!', message: reason }
    }
    if (gs.resignedColor) {
      const winner = gs.resignedColor === 'white' ? 'Black' : 'White'
      return { title: 'Resignation', message: `${gs.resignedColor === 'white' ? 'White' : 'Black'} resigned. ${winner} wins!` }
    }
    if (gs.timeoutLoser) {
      const winner = gs.timeoutLoser === 'white' ? 'Black' : 'White'
      return { title: 'Time Expired!', message: `${winner} wins on time!` }
    }
    if (gs.game.isCheckmate()) {
      const winner = gs.game.turn() === 'w' ? 'Black' : 'White'
      return { title: 'Checkmate!', message: `${winner} wins!` }
    }
    if (gs.game.isStalemate()) return { title: 'Stalemate!', message: 'The game is a draw.' }
    if (gs.game.isThreefoldRepetition()) return { title: 'Draw!', message: 'Threefold repetition.' }
    if (gs.game.isInsufficientMaterial()) return { title: 'Draw!', message: 'Insufficient material.' }
    if (gs.game.isDraw()) return { title: 'Draw!', message: 'The game is a draw.' }
    return { title: '', message: '' }
  }

  // Board orientation
  const boardOrientation = (mode === 'human-vs-ai' && playerColor === 'black') ? 'black' : 'white'
  const topColor = boardOrientation === 'white' ? 'black' : 'white'
  const bottomColor = boardOrientation === 'white' ? 'white' : 'black'

  const effectiveOrientation: 'white' | 'black' = gs.flipped
    ? (boardOrientation === 'white' ? 'black' : 'white')
    : boardOrientation
  const effectiveTopColor = effectiveOrientation === 'white' ? 'black' : 'white'
  const effectiveBottomColor = effectiveOrientation === 'white' ? 'white' : 'black'

  // Player bar info helper
  const getPlayerBar = (position: 'top' | 'bottom'): PlayerBarInfo => {
    const color = position === 'top' ? topColor : bottomColor
    const aiPresetName = personality.activePreset
      ? personality.activePreset.charAt(0).toUpperCase() + personality.activePreset.slice(1).toLowerCase()
      : 'Custom'

    if (mode === 'human-vs-ai') {
      const isAI = color !== playerColor
      if (isAI) {
        const isStockfish = useStockfishEngine
        return {
          icon: isStockfish ? 'cpu' : 'bot',
          name: isStockfish ? 'Stockfish' : aiPresetName,
          avatar: isStockfish ? null : personality.currentAvatar,
          badge: isStockfish ? `Skill ${stockfishSkillLevel}` : 'AI',
          badgeClass: isStockfish ? 'bg-orange-500/20 text-orange-300' : 'bg-purple-500/20 text-purple-300',
          iconGradient: isStockfish ? 'from-orange-500 to-red-500' : 'from-red-500 to-orange-500',
          showThinking: true, showStats: true,
        }
      } else {
        return {
          icon: 'user', name: 'You', avatar: null,
          badge: color === 'white' ? 'White' : 'Black',
          badgeClass: color === 'white' ? 'bg-slate-200/20 text-slate-300' : 'bg-slate-500/20 text-slate-400',
          iconGradient: 'from-blue-500 to-cyan-500',
          showThinking: false, showStats: false,
        }
      }
    } else if (mode === 'human-vs-human') {
      const label = color === 'white' ? 'White' : 'Black'
      const isCurrentTurn = (color === 'white' && gs.game.turn() === 'w') || (color === 'black' && gs.game.turn() === 'b')
      return {
        icon: 'user', name: label, avatar: null,
        badge: isCurrentTurn && !gs.isGameOver ? 'Your turn' : undefined,
        badgeClass: 'bg-green-500/20 text-green-300',
        iconGradient: color === 'white' ? 'from-slate-300 to-slate-400' : 'from-slate-600 to-slate-700',
        showThinking: false, showStats: false,
      }
    } else {
      const isWhite = color === 'white'
      const label = isWhite ? aivsai.whiteLabel : aivsai.blackLabel
      const usesSF = isWhite ? aivsai.whiteUseStockfish : aivsai.blackUseStockfish
      const gradientColor = usesSF ? 'from-orange-500 to-red-500' : (isWhite ? 'from-blue-500 to-cyan-500' : 'from-red-500 to-orange-500')
      const isCurrentTurn = (isWhite && gs.game.turn() === 'w') || (!isWhite && gs.game.turn() === 'b')
      return {
        icon: usesSF ? 'cpu' : 'bot', name: label, avatar: null,
        badge: usesSF ? `Skill ${isWhite ? aivsai.whiteStockfishSkillLevel : aivsai.blackStockfishSkillLevel}` : 'AI',
        badgeClass: usesSF ? 'bg-orange-500/20 text-orange-300' : 'bg-purple-500/20 text-purple-300',
        iconGradient: gradientColor,
        showThinking: isCurrentTurn, showStats: !isCurrentTurn,
      }
    }
  }

  const getSearchDepth = () => {
    if (mode === 'human-vs-ai') return personality.currentConfig.search?.depth ?? 4
    const lastMover = gs.game.turn() === 'w' ? 'b' : 'w'
    const config = lastMover === 'w' ? aivsai.whiteConfig : aivsai.blackConfig
    return config.search?.depth ?? 4
  }

  // Clock management
  useEffect(() => {
    if (timeControlRef.current.type === 'none') {
      gs.prevMoveCountRef.current = gs.moveHistory.length
      return
    }
    const prevCount = gs.prevMoveCountRef.current
    gs.prevMoveCountRef.current = gs.moveHistory.length
    if (gs.moveHistory.length === 0) return
    if (prevCount === 0 && gs.moveHistory.length === 1) {
      clock.start('black')
      return
    }
    if (gs.moveHistory.length > prevCount && prevCount > 0) {
      clock.switchSide(timeControlRef.current.incrementMs)
    }
  }, [gs.moveHistory.length, clock])

  // Check for time expiry
  useEffect(() => {
    if (timeControl.type === 'none') return
    if (gs.isGameOver) return
    if (mode === 'ai-vs-ai') return
    const checkExpiry = (side: 'white' | 'black') => {
      if (clock.timeLeft[side] <= 0 && clock.activeSide === side && gs.moveHistory.length > 0) {
        clock.pause()
        gs.setTimeoutLoser(side)
      }
    }
    checkExpiry('white')
    checkExpiry('black')
  }, [clock.timeLeft, clock.activeSide, timeControl, gs.isGameOver, mode, gs.moveHistory.length, clock])

  // Format time for display
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '0:00'
    const totalSeconds = ms / 1000
    if (totalSeconds < 10) return totalSeconds.toFixed(1)
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const getCapturedByColor = (color: 'white' | 'black') => {
    return color === 'white' ? gs.capturedPieces.blackCaptured : gs.capturedPieces.whiteCaptured
  }

  const isColorTurn = (color: 'white' | 'black') => {
    return (color === 'white' && gs.game.turn() === 'w') || (color === 'black' && gs.game.turn() === 'b')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Escape') {
        e.preventDefault()
        gs.setPreMove(null)
        gs.setShowNewGameModal(false)
        gs.setShowResultModal(false)
        return
      }
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); gs.navBack(); break
        case 'ArrowRight': e.preventDefault(); gs.navForward(); break
        case 'Home': e.preventDefault(); gs.navToStart(); break
        case 'End': e.preventDefault(); gs.navToLive(); break
        case 'f': case 'F': e.preventDefault(); gs.setFlipped(prev => !prev); break
        case 'n': case 'N': e.preventDefault(); gs.setShowNewGameModal(true); break
        case 'u': case 'U': e.preventDefault(); gs.undoLastMove(mode, aivsai.isRunning); break
        case 'z': case 'Z':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); gs.undoLastMove(mode, aivsai.isRunning) }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gs.navBack, gs.navForward, gs.navToStart, gs.navToLive, gs.undoLastMove, mode, aivsai.isRunning])

  // Board options
  const boardOptions = useMemo(() => ({
    id: 'chess-board',
    dragActivationDistance: 5,
    position: gs.displayFen,
    boardOrientation: effectiveOrientation,
    onPieceDrop: onDrop,
    onPieceClick: onPieceClick,
    onPieceDrag: onPieceDrag,
    onSquareClick: onSquareClick,
    allowDragging: !gs.isReviewing && !gs.isGameOver && (mode === 'human-vs-human' || mode === 'human-vs-ai' || !aivsai.isRunning),
    squareStyles: customSquareStyles,
    darkSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].dark },
    lightSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].light },
    showNotation: settings.showCoordinates,
    showAnimations: settings.pieceAnimation,
    boardStyle: {
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      ...(gs.isReviewing ? { opacity: 0.85 } : {}),
    }
  }), [gs.displayFen, effectiveOrientation, onDrop, onPieceClick, onPieceDrag, onSquareClick, gs.isReviewing, gs.isGameOver, mode, aivsai.isRunning, customSquareStyles, settings.boardTheme, settings.showCoordinates, settings.pieceAnimation])

  const cardGlass = 'rounded-xl p-4 border border-white/[0.08]'
  const cardGlassStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
    backdropFilter: 'blur(10px)',
  }

  // Render helpers for player bars
  const renderPlayerBar = (position: 'top' | 'bottom') => {
    const color = position === 'top' ? effectiveTopColor : effectiveBottomColor
    const bar = getPlayerBar(position === 'top' ? (effectiveTopColor === topColor ? 'top' : 'bottom') : (effectiveBottomColor === bottomColor ? 'bottom' : 'top'))
    return (
      <PlayerBar
        bar={bar}
        captured={getCapturedByColor(color)}
        isTurn={isColorTurn(color) && !gs.isGameOver}
        isGameOver={gs.isGameOver}
        isThinking={isThinking}
        activeSearchDepth={activeSearchDepth}
        lastMoveStats={lastMoveStats}
        searchDepth={getSearchDepth()}
        timeControl={timeControl}
        timeLeftMs={clock.timeLeft[color]}
        moveCount={gs.moveHistory.length}
        mode={mode}
        color={color}
        playerColor={playerColor}
        formatTime={formatTime}
      />
    )
  }

  // Move input form (shared between mobile and desktop)
  const renderMoveInput = (variant: 'mobile' | 'desktop') => {
    if (gs.isGameOver || gs.isReviewing || (mode === 'ai-vs-ai' && aivsai.isRunning)) return null
    const isMobile = variant === 'mobile'
    return (
      <div className={isMobile ? 'w-full max-w-xl shrink-0 px-1 pb-1 lg:hidden' : cardGlass} style={isMobile ? undefined : cardGlassStyle}>
        <form
          onSubmit={(e) => { e.preventDefault(); gs.handleMoveInputSubmit(mode, humanTurnChar, aivsai.isRunning) }}
          className={`flex ${isMobile ? 'gap-1.5' : 'gap-2'}`}
        >
          <input
            ref={gs.moveInputRef}
            type="text"
            value={gs.moveInput}
            onChange={(e) => { gs.setMoveInput(e.target.value); gs.setMoveInputError(false) }}
            placeholder="Type move (e.g. e4, Nf3)"
            aria-label="Type a chess move in algebraic notation"
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            className={`flex-1 min-w-0 bg-slate-800 border rounded-lg px-3 ${isMobile ? 'py-2' : 'py-1.5'} text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono ${
              gs.moveInputError ? 'border-red-500 bg-red-500/10' : 'border-slate-700 focus:border-blue-500'
            }`}
          />
          <button
            type="submit"
            className={`bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium px-3 ${isMobile ? 'rounded-lg min-h-[44px]' : 'py-1.5 rounded-lg'} transition-colors text-sm`}
            aria-label="Submit move"
          >↵</button>
        </form>
        {gs.moveInputError && (
          <p className={`text-xs text-red-400 ${isMobile ? 'mt-0.5 px-1' : 'mt-1'}`}>Invalid move</p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="h-[calc(100dvh-40px)] lg:h-[calc(100vh-48px)] flex flex-col lg:flex-row overflow-hidden">

        {/* ===== Board Column (center) ===== */}
        <div className="flex-1 flex flex-col items-center min-h-0 px-2 lg:px-4 py-1 lg:py-2">

          {/* Top player bar */}
          <div className="w-full max-w-xl shrink-0">{renderPlayerBar('top')}</div>

          {useStockfishEngine && humanStockfish.error && (
            <div className="w-full max-w-xl bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-1 text-xs text-red-300 flex flex-wrap items-center gap-2 shrink-0">
              <span>⚠️ {humanStockfish.error}</span>
              <button onClick={() => setUseStockfishEngine(false)} className="underline text-red-400 hover:text-red-300 whitespace-nowrap">
                Switch to built-in AI
              </button>
            </div>
          )}

          {/* Board area */}
          <div className="flex-1 w-full max-w-xl flex items-center justify-center min-h-0">
            <div className="flex gap-1.5 w-full h-full items-center justify-center">
              {settings.showEvalBar && (
                <div className="h-full max-h-[min(calc(100vw-2rem),500px)] lg:max-h-full shrink-0 flex">
                  <EvalBar evaluation={gs.currentEval} flipped={effectiveOrientation === 'black'} />
                </div>
              )}
              <div className="aspect-square max-w-full max-h-full" style={{ width: 'min(100%, 100%)' }}>
                <Chessboard options={boardOptions} />
              </div>
            </div>
          </div>

          {/* Reviewing banner */}
          {gs.isReviewing && (
            <div className="w-full max-w-xl shrink-0">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1 flex items-center justify-between">
                <span className="text-xs text-amber-400 font-medium">
                  Reviewing move {gs.viewIndex} of {gs.totalHalfMoves}
                </span>
                <button onClick={gs.navToLive} className="text-xs text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded transition-colors">
                  Back to live
                </button>
              </div>
            </div>
          )}

          {/* Draw available notification (mobile) */}
          {gs.drawAvailable && !gs.isGameOver && gs.drawReason && (
            <div className="lg:hidden w-full max-w-xl shrink-0">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1 flex items-center gap-2">
                <Handshake className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-400 font-medium">{gs.drawReason}</span>
              </div>
            </div>
          )}

          {/* Opening name */}
          {gs.opening && (
            <div className="text-center text-xs text-slate-400 w-full max-w-xl shrink-0">
              <span className="text-blue-400/80 font-mono">{gs.opening.eco}</span>
              {' '}
              <span className="text-slate-500">{gs.opening.name}</span>
            </div>
          )}

          {/* Bottom player bar */}
          <div className="w-full max-w-xl shrink-0">{renderPlayerBar('bottom')}</div>

          {/* Keyboard move input — mobile */}
          {renderMoveInput('mobile')}

          {/* Mobile action row */}
          <GameControls
            mode={mode}
            isGameOver={gs.isGameOver}
            isThinking={isThinking}
            isRunning={aivsai.isRunning}
            isPaused={aivsai.isPaused}
            moveCount={gs.moveHistory.length}
            drawAvailable={gs.drawAvailable}
            drawReason={gs.drawReason}
            showMoveHistory={gs.showMoveHistory}
            onNewGame={() => gs.setShowNewGameModal(true)}
            onFlip={() => gs.setFlipped(f => !f)}
            onUndo={() => gs.undoLastMove(mode, aivsai.isRunning)}
            onResign={() => gs.handleResign(mode, playerColor)}
            onClaimDraw={gs.handleClaimDraw}
            onToggleMoveHistory={() => gs.setShowMoveHistory(h => !h)}
            onStartAI={aivsai.startAIvsAI}
            onPauseAI={aivsai.pauseAIvsAI}
            onResumeAI={aivsai.resumeAIvsAI}
          />

          {/* Mobile: collapsible move history overlay */}
          {gs.showMoveHistory && (
            <MoveHistoryPanel
              variant="mobile"
              moveHistory={gs.moveHistory}
              viewIndex={gs.viewIndex}
              setViewIndex={gs.setViewIndex}
              copied={gs.copied}
              fenCopied={gs.fenCopied}
              handleCopyPGN={gs.handleCopyPGN}
              handleCopyFEN={gs.handleCopyFEN}
              navToStart={gs.navToStart}
              navBack={gs.navBack}
              navForward={gs.navForward}
              navToLive={gs.navToLive}
              isAtStart={gs.isAtStart}
              isLive={gs.isLive}
              totalHalfMoves={gs.totalHalfMoves}
              onClose={() => gs.setShowMoveHistory(false)}
            />
          )}
        </div>

        {/* ===== Desktop Sidebar ===== */}
        <div className="hidden lg:flex w-72 flex-col gap-3 p-3 overflow-y-auto shrink-0">
          {/* Status */}
          <div className={cardGlass} style={cardGlassStyle}>
            <div role="status" aria-live="polite" aria-atomic="true">
              <p className={`text-sm font-medium ${gs.game.isCheck() ? 'text-red-400' : 'text-slate-300'}`}>
                {getStatus()}
              </p>
            </div>
            {mode === 'ai-vs-ai' && aivsai.isRunning && !aivsai.isPaused && (
              <p className="text-xs text-purple-400 mt-1 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> AI vs AI in progress</p>
            )}
            {mode === 'ai-vs-ai' && aivsai.isPaused && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> Paused</p>
            )}
            {gs.drawAvailable && !gs.isGameOver && gs.drawReason && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><Handshake className="w-3.5 h-3.5" /> {gs.drawReason}</p>
            )}
          </div>

          {/* Controls */}
          <div className={`${cardGlass} space-y-3`} style={cardGlassStyle}>
            <div className="flex gap-2">
              <button onClick={() => gs.setShowNewGameModal(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm">New Game</button>
              <button onClick={() => gs.setFlipped(f => !f)} className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white border border-slate-700" title="Flip board (F)" aria-label="Flip board">
                <FlipVertical className="w-4 h-4" />
              </button>
              <div className="relative group">
                <button className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white border border-slate-700" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">
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
                <input type="range" min={0} max={2000} step={250} value={minMoveTime} onChange={(e) => { setMinMoveTime(Number(e.target.value)); minMoveTimeRef.current = Number(e.target.value) }} aria-label="AI move delay" className="w-full h-1.5 accent-blue-500 cursor-pointer" />
                {!gs.isGameOver && gs.moveHistory.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => gs.undoLastMove(mode, aivsai.isRunning)} disabled={gs.moveHistory.length === 0 || isThinking} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs" title="Undo move (U)" aria-label="Undo move">
                      <Undo2 className="w-3.5 h-3.5" /> Undo
                    </button>
                    <button onClick={() => gs.handleResign(mode, playerColor)} disabled={isThinking} className="flex items-center justify-center gap-1.5 bg-red-900/40 hover:bg-red-800/50 disabled:bg-slate-800 disabled:text-slate-600 text-red-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-red-500/20" title="Resign" aria-label="Resign">
                      <Flag className="w-3.5 h-3.5" /> Resign
                    </button>
                  </div>
                )}
                {gs.drawAvailable && !gs.isGameOver && (
                  <button onClick={gs.handleClaimDraw} className="w-full flex items-center justify-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-amber-500/20 animate-pulse" title={gs.drawReason ?? 'Claim draw'} aria-label={gs.drawReason ?? 'Claim draw'}>
                    <Handshake className="w-3.5 h-3.5" /> Claim Draw
                  </button>
                )}
              </div>
            )}

            {mode === 'ai-vs-ai' && (
              <>
                <div className="flex gap-2">
                  {!aivsai.isRunning || gs.isGameOver ? (
                    <button onClick={aivsai.startAIvsAI} disabled={gs.isGameOver} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">▶ Start</button>
                  ) : aivsai.isPaused ? (
                    <button onClick={aivsai.resumeAIvsAI} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">▶ Resume</button>
                  ) : (
                    <button onClick={aivsai.pauseAIvsAI} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">⏸ Pause</button>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-500">Move Delay</p>
                    <span className="text-xs text-slate-400 font-mono">{aivsai.delay}ms</span>
                  </div>
                  <input type="range" min={100} max={2000} step={100} value={aivsai.delay} onChange={(e) => aivsai.setDelay(Number(e.target.value))} aria-label="AI vs AI move delay" className="w-full h-1.5 accent-purple-500 cursor-pointer" />
                </div>
              </>
            )}
          </div>

          {/* Keyboard move input — desktop */}
          {renderMoveInput('desktop')}

          {/* Move History — desktop sidebar */}
          <MoveHistoryPanel
            variant="desktop"
            moveHistory={gs.moveHistory}
            viewIndex={gs.viewIndex}
            setViewIndex={gs.setViewIndex}
            copied={gs.copied}
            fenCopied={gs.fenCopied}
            handleCopyPGN={gs.handleCopyPGN}
            handleCopyFEN={gs.handleCopyFEN}
            navToStart={gs.navToStart}
            navBack={gs.navBack}
            navForward={gs.navForward}
            navToLive={gs.navToLive}
            isAtStart={gs.isAtStart}
            isLive={gs.isLive}
            totalHalfMoves={gs.totalHalfMoves}
            cardGlass={cardGlass}
            cardGlassStyle={cardGlassStyle}
          />
        </div>
      </div>

      {/* New Game Modal */}
      {gs.showNewGameModal && (
        <NewGameModal
          onStart={handleNewGameStart}
          onClose={() => gs.setShowNewGameModal(false)}
        />
      )}

      {/* Game Result Modal */}
      {gs.showResultModal && gs.isGameOver && (
        <GameResultModal
          result={getGameResult()}
          moveCount={gs.moveHistory.length}
          durationMs={Date.now() - gs.gameStartTimeRef.current}
          openingName={gs.opening?.name}
          gameId={gs.savedGameIdRef.current}
          pgn={gs.game.pgn()}
          onNewGame={() => { gs.setShowResultModal(false); gs.setShowNewGameModal(true) }}
          onAnalyze={() => { gs.setShowResultModal(false); if (gs.savedGameIdRef.current) navigate(`/analysis/${gs.savedGameIdRef.current}`) }}
          onDismiss={() => gs.setShowResultModal(false)}
        />
      )}
    </>
  )
}
