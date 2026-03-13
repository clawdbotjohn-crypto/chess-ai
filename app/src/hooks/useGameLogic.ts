import { useState, useCallback, useRef, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import type { EvaluationConfig } from '../engine/types'
import { DEFAULT_CONFIG } from '../engine/types'
import type { TimeControl } from '../engine/types'
// TIME_CONTROLS removed - unused
import { PRESETS, type PresetName } from '../engine/presets'
import { getSettings } from '../utils/settings'
import { getPseudoLegalSquares } from '../utils/pseudoLegalMoves'
import { playSoundForMove } from '../utils/sounds'
import type { GameMode } from '../hooks/useGameState'
import type { NewGameSettings } from '../components/NewGameModal'

interface UseGameLogicParams {
  gs: ReturnType<typeof import('../hooks/useGameState').useGameState>
  personality: ReturnType<typeof import('../hooks/useAIPersonality').useAIPersonality>
  aivsai: ReturnType<typeof import('../hooks/useAIvsAI').useAIvsAI>
  humanAI_white: ReturnType<typeof import('../hooks/useChessAI').useChessAI>
  humanAI_black: ReturnType<typeof import('../hooks/useChessAI').useChessAI>
  humanStockfish: ReturnType<typeof import('../hooks/useStockfish').useStockfish>
  clock: ReturnType<typeof import('../hooks/useChessClock').useChessClock>
  mode: GameMode
  setMode: React.Dispatch<React.SetStateAction<GameMode>>
  playerColor: 'white' | 'black'
  setPlayerColor: React.Dispatch<React.SetStateAction<'white' | 'black'>>
  useStockfishEngine: boolean
  setUseStockfishEngine: React.Dispatch<React.SetStateAction<boolean>>
  stockfishSkillLevel: number
  setStockfishSkillLevel: React.Dispatch<React.SetStateAction<number>>
  stockfishDepth: number
  setStockfishDepth: React.Dispatch<React.SetStateAction<number>>
  minMoveTimeRef: React.MutableRefObject<number>
  setMinMoveTime: React.Dispatch<React.SetStateAction<number>>
  timeControl: TimeControl
  setTimeControl: React.Dispatch<React.SetStateAction<TimeControl>>
  timeControlRef: React.MutableRefObject<TimeControl>
  initialPreset: PresetName | null
  initialLoadSaved: string | null
  searchParams: URLSearchParams
}

export function useGameLogic({
  gs, personality, aivsai,
  humanAI_white, humanAI_black, humanStockfish, clock,
  mode, setMode, playerColor, setPlayerColor,
  useStockfishEngine, setUseStockfishEngine,
  stockfishSkillLevel, setStockfishSkillLevel,
  stockfishDepth, setStockfishDepth,
  minMoveTimeRef, setMinMoveTime,
  timeControl, setTimeControl, timeControlRef,
  initialPreset, initialLoadSaved, searchParams,
}: UseGameLogicParams) {
  const humanTurnChar = playerColor === 'white' ? 'w' : 'b'
  const aiTurnChar = playerColor === 'white' ? 'b' : 'w'

  // User preferences from Settings page
  const [settings, setSettings] = useState(getSettings())

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
  const handleNewGameStart = (newSettings: NewGameSettings) => {
    aivsai.stopAIvsAI()
    gs.resetGame()
    gs.prevMoveCountRef.current = 0

    setMode(newSettings.mode)
    setPlayerColor(newSettings.playerColor)
    setTimeControl(newSettings.timeControl)
    timeControlRef.current = newSettings.timeControl

    if (newSettings.timeControl.type !== 'none') {
      clock.reset(newSettings.timeControl.initialTimeMs, newSettings.timeControl.initialTimeMs)
    } else {
      clock.reset(0, 0)
    }

    if (newSettings.mode === 'human-vs-ai') {
      personality.setConfig(newSettings.aiConfig)
      setUseStockfishEngine(newSettings.useStockfish ?? false)
      setStockfishSkillLevel(newSettings.stockfishSkillLevel ?? 10)
      setStockfishDepth(newSettings.stockfishDepth ?? 10)
      if (newSettings.minMoveTime !== undefined) {
        setMinMoveTime(newSettings.minMoveTime)
        minMoveTimeRef.current = newSettings.minMoveTime
      }
    } else if (newSettings.mode === 'ai-vs-ai') {
      aivsai.setWhiteConfig(newSettings.whiteAIConfig)
      aivsai.setWhiteLabel(newSettings.whiteAIPresetName)
      aivsai.setBlackConfig(newSettings.blackAIConfig)
      aivsai.setBlackLabel(newSettings.blackAIPresetName)
      aivsai.setDelay(newSettings.delay)
      aivsai.setWhiteUseStockfish(newSettings.whiteUseStockfish ?? false)
      aivsai.setBlackUseStockfish(newSettings.blackUseStockfish ?? false)
      aivsai.setWhiteStockfishSkillLevel(newSettings.whiteStockfishSkillLevel ?? 10)
      aivsai.setWhiteStockfishDepth(newSettings.whiteStockfishDepth ?? 10)
      aivsai.setBlackStockfishSkillLevel(newSettings.blackStockfishSkillLevel ?? 10)
      aivsai.setBlackStockfishDepth(newSettings.blackStockfishDepth ?? 10)
    }
  }

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

  return {
    settings,
    humanTurnChar,
    aiTurnChar,
    onDrop,
    onPieceClick,
    onPieceDrag,
    onSquareClick,
    isThinking,
    activeSearchDepth,
    lastMoveStats,
    getStatus,
    getGameResult,
    getSearchDepth,
    handleNewGameStart,
    formatTime,
    getCapturedByColor,
    isColorTurn,
  }
}
