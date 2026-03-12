import { useState, useCallback, useRef } from 'react'
import type { EvaluationConfig } from '../engine/types'
import { DEFAULT_CONFIG } from '../engine/types'
import { PRESETS } from '../engine/presets'
import { useChessAI } from './useChessAI'
import { useStockfish } from './useStockfish'
import type { Chess } from 'chess.js'

export function useAIvsAI(
  applyMove: (moveStr: string) => boolean,
  setCurrentEval: (val: number) => void
) {
  const whiteAI = useChessAI()
  const blackAI = useChessAI()
  const sfWhite = useStockfish()
  const sfBlack = useStockfish()

  const [whiteConfig, setWhiteConfig] = useState<EvaluationConfig>(structuredClone(DEFAULT_CONFIG))
  const [blackConfig, setBlackConfig] = useState<EvaluationConfig>(
    structuredClone(PRESETS.AGGRESSIVE.config)
  )
  const [whiteLabel, setWhiteLabel] = useState('Classical')
  const [blackLabel, setBlackLabel] = useState('Aggressive')
  const [delay, setDelay] = useState(500)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const [whiteUseStockfish, setWhiteUseStockfish] = useState(false)
  const [blackUseStockfish, setBlackUseStockfish] = useState(false)
  const [whiteStockfishSkillLevel, setWhiteStockfishSkillLevel] = useState(10)
  const [whiteStockfishDepth, setWhiteStockfishDepth] = useState(10)
  const [blackStockfishSkillLevel, setBlackStockfishSkillLevel] = useState(10)
  const [blackStockfishDepth, setBlackStockfishDepth] = useState(10)

  const isRunningRef = useRef(false)
  const isPausedRef = useRef(false)
  const delayRef = useRef(delay)
  const whiteConfigRef = useRef(whiteConfig)
  const blackConfigRef = useRef(blackConfig)
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const whiteUseStockfishRef = useRef(false)
  const blackUseStockfishRef = useRef(false)
  const whiteStockfishSkillRef = useRef(10)
  const whiteStockfishDepthRef = useRef(10)
  const blackStockfishSkillRef = useRef(10)
  const blackStockfishDepthRef = useRef(10)
  const gameRef = useRef<Chess | null>(null)

  // Keep refs in sync
  delayRef.current = delay
  whiteConfigRef.current = whiteConfig
  blackConfigRef.current = blackConfig
  whiteUseStockfishRef.current = whiteUseStockfish
  blackUseStockfishRef.current = blackUseStockfish
  whiteStockfishSkillRef.current = whiteStockfishSkillLevel
  whiteStockfishDepthRef.current = whiteStockfishDepth
  blackStockfishSkillRef.current = blackStockfishSkillLevel
  blackStockfishDepthRef.current = blackStockfishDepth

  const setGameRef = useCallback((g: Chess) => {
    gameRef.current = g
  }, [])

  const runAIvsAIStep = useCallback(async () => {
    if (!isRunningRef.current || isPausedRef.current) return

    const currentGame = gameRef.current
    if (!currentGame || currentGame.isGameOver()) {
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
        const sfInstance = turn === 'w' ? sfWhite : sfBlack
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
  }, [whiteAI, blackAI, sfWhite, sfBlack, applyMove, setCurrentEval])

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

  return {
    // AI instances (exposed for thinking indicators, eval, etc.)
    whiteAI, blackAI,
    stockfish: sfWhite, stockfishBlack: sfBlack,

    // Config state
    whiteConfig, setWhiteConfig,
    blackConfig, setBlackConfig,
    whiteLabel, setWhiteLabel,
    blackLabel, setBlackLabel,
    delay, setDelay,
    isRunning, isPaused,

    // Stockfish state
    whiteUseStockfish, setWhiteUseStockfish,
    blackUseStockfish, setBlackUseStockfish,
    whiteStockfishSkillLevel, setWhiteStockfishSkillLevel,
    whiteStockfishDepth, setWhiteStockfishDepth,
    blackStockfishSkillLevel, setBlackStockfishSkillLevel,
    blackStockfishDepth, setBlackStockfishDepth,

    // Controls
    startAIvsAI, pauseAIvsAI, resumeAIvsAI, stopAIvsAI,
    setGameRef,
  }
}
