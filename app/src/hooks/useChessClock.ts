import { useState, useRef, useCallback, useEffect } from 'react'

interface ChessClockState {
  timeLeft: { white: number; black: number }
  isRunning: boolean
  activeSide: 'white' | 'black' | null
}

export function useChessClock() {
  const [state, setState] = useState<ChessClockState>({
    timeLeft: { white: 0, black: 0 },
    isRunning: false,
    activeSide: null,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickRef = useRef<number>(0)
  const stateRef = useRef(state)
  stateRef.current = state

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    lastTickRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastTickRef.current
      lastTickRef.current = now
      const { activeSide } = stateRef.current
      if (!activeSide) return
      setState(prev => {
        const newTime = Math.max(0, prev.timeLeft[activeSide] - elapsed)
        return {
          ...prev,
          timeLeft: { ...prev.timeLeft, [activeSide]: newTime },
        }
      })
    }, 100)
  }, [clearTimer])

  const start = useCallback((side: 'white' | 'black') => {
    setState(prev => ({ ...prev, isRunning: true, activeSide: side }))
    lastTickRef.current = Date.now()
    startTimer()
  }, [startTimer])

  const switchSide = useCallback((incrementMs: number = 0) => {
    setState(prev => {
      if (!prev.activeSide) return prev
      const finishedSide = prev.activeSide
      const newSide = finishedSide === 'white' ? 'black' : 'white'
      return {
        ...prev,
        activeSide: newSide,
        timeLeft: {
          ...prev.timeLeft,
          [finishedSide]: prev.timeLeft[finishedSide] + incrementMs,
        },
      }
    })
    lastTickRef.current = Date.now()
    if (!intervalRef.current) startTimer()
  }, [startTimer])

  const pause = useCallback(() => {
    clearTimer()
    setState(prev => ({ ...prev, isRunning: false }))
  }, [clearTimer])

  const resume = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: true }))
    startTimer()
  }, [startTimer])

  const reset = useCallback((whiteMs: number, blackMs: number) => {
    clearTimer()
    setState({
      timeLeft: { white: whiteMs, black: blackMs },
      isRunning: false,
      activeSide: null,
    })
  }, [clearTimer])

  const isExpired = useCallback((side: 'white' | 'black') => {
    return stateRef.current.timeLeft[side] <= 0
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return {
    timeLeft: state.timeLeft,
    isRunning: state.isRunning,
    activeSide: state.activeSide,
    start,
    switchSide,
    pause,
    resume,
    reset,
    isExpired,
  }
}
