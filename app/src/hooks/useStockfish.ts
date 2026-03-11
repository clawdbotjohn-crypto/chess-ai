/**
 * useStockfish Hook
 *
 * Manages a Stockfish WASM web worker and provides an API for requesting moves.
 * Uses the UCI protocol to communicate with Stockfish.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'

interface StockfishMoveResult {
  move: string // SAN format for the game
  uciMove: string // UCI format (e.g. "e2e4")
  eval: number // centipawns from white's perspective (approximate)
}

export function useStockfish() {
  const [isThinking, setIsThinking] = useState(false)
  const [lastMoveStats, setLastMoveStats] = useState<{ nodes: number; timeMs: number; isBookMove?: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const readyRef = useRef(false)
  const pendingResolve = useRef<((result: StockfishMoveResult) => void) | null>(null)
  const pendingReject = useRef<((err: Error) => void) | null>(null)
  const currentFenRef = useRef<string>('')
  const moveStartTimeRef = useRef(0)

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL || '/'
    const worker = new Worker(`${basePath}stockfish/stockfish-18-lite-single.js`)
    workerRef.current = worker

    let bestMove = ''
    let evalScore = 0

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : ''

      if (line === 'uciok' || line === 'readyok') {
        readyRef.current = true
      }

      // Parse eval from info lines
      if (line.startsWith('info') && line.includes(' score cp ')) {
        const cpMatch = line.match(/score cp (-?\d+)/)
        if (cpMatch) {
          evalScore = parseInt(cpMatch[1], 10)
        }
      }

      // Parse mate score
      if (line.startsWith('info') && line.includes(' score mate ')) {
        const mateMatch = line.match(/score mate (-?\d+)/)
        if (mateMatch) {
          const mateIn = parseInt(mateMatch[1], 10)
          evalScore = mateIn > 0 ? 10000 : -10000
        }
      }

      // Parse nodes from info
      let nodes = 0
      if (line.startsWith('info')) {
        const nodesMatch = line.match(/\bnodes (\d+)/)
        if (nodesMatch) nodes = parseInt(nodesMatch[1], 10)
      }

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ')
        bestMove = parts[1] || ''

        if (bestMove && pendingResolve.current) {
          const timeMs = Date.now() - moveStartTimeRef.current

          // Convert UCI move to SAN
          let sanMove = bestMove
          try {
            const tempGame = new Chess(currentFenRef.current)
            const from = bestMove.substring(0, 2)
            const to = bestMove.substring(2, 4)
            const promotion = bestMove.length > 4 ? bestMove[4] : undefined
            const move = tempGame.move({ from, to, promotion })
            if (move) sanMove = move.san
          } catch {
            // If conversion fails, return the UCI move as-is
          }

          // Adjust eval to always be from white's perspective
          // Stockfish reports relative to side to move, so flip if black moved
          const fen = currentFenRef.current
          const sideToMove = fen.split(' ')[1]
          const evalFromWhite = sideToMove === 'b' ? -evalScore : evalScore

          setLastMoveStats({ nodes, timeMs })
          setIsThinking(false)

          pendingResolve.current({
            move: sanMove,
            uciMove: bestMove,
            eval: evalFromWhite,
          })
          pendingResolve.current = null
          pendingReject.current = null
        }
      }
    }

    worker.onerror = (err) => {
      setIsThinking(false)
      setError('Stockfish engine failed to load. Try refreshing or use the built-in AI.')
      if (pendingReject.current) {
        pendingReject.current(new Error(err.message))
        pendingResolve.current = null
        pendingReject.current = null
      }
    }

    // Initialize UCI
    worker.postMessage('uci')

    // Timeout: if readyok isn't received within 10 seconds, set error
    const readyTimeout = setTimeout(() => {
      if (!readyRef.current) {
        setError('Stockfish engine failed to load. Try refreshing or use the built-in AI.')
      }
    }, 10000)

    return () => {
      clearTimeout(readyTimeout)
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const getMove = useCallback(
    (fen: string, skillLevel: number, depth: number): Promise<StockfishMoveResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Stockfish worker not initialized'))
          return
        }

        if (error) {
          reject(new Error(error))
          return
        }

        // Reject any previous pending promise to prevent leaks from rapid calls
        if (pendingReject.current) {
          pendingReject.current(new Error('Stockfish request cancelled: superseded by new request'))
          pendingResolve.current = null
          pendingReject.current = null
        }

        setIsThinking(true)
        pendingResolve.current = resolve
        pendingReject.current = reject
        currentFenRef.current = fen
        moveStartTimeRef.current = Date.now()

        const worker = workerRef.current

        // Configure skill level
        worker.postMessage(`setoption name Skill Level value ${skillLevel}`)
        worker.postMessage('isready')
        worker.postMessage(`position fen ${fen}`)
        worker.postMessage(`go depth ${depth}`)
      })
    },
    [error]
  )

  return { getMove, isThinking, lastMoveStats, error }
}
