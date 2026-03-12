import { useState, useCallback, useRef, useEffect } from 'react'
import PartySocket from 'partysocket'
import type {
  GameRoom,
  PlayerColor,
  ServerMessage,
  ClientMessage,
} from '../types/multiplayer'

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999'

export interface UseMultiplayerReturn {
  // State
  gameRoom: GameRoom | null
  myColor: PlayerColor | 'spectator' | null
  myPlayerId: string | null
  isConnected: boolean
  error: string | null
  opponentDisconnected: boolean
  reconnectCountdown: number | null
  drawOfferedBy: PlayerColor | null

  // Actions
  createGame: (name: string) => void
  joinGame: (roomId: string, name: string) => void
  makeMove: (from: string, to: string, promotion?: string) => void
  resign: () => void
  offerDraw: () => void
  respondDraw: (accept: boolean) => void
  disconnect: () => void
}

export function useMultiplayer(): UseMultiplayerReturn {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null)
  const [myColor, setMyColor] = useState<PlayerColor | 'spectator' | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null)
  const [drawOfferedBy, setDrawOfferedBy] = useState<PlayerColor | null>(null)

  const socketRef = useRef<PartySocket | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playerNameRef = useRef<string>('')

  // Clear countdown timer
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setReconnectCountdown(null)
  }, [])

  // Send a message to the server
  const send = useCallback((msg: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg))
    }
  }, [])

  // Handle incoming server messages
  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: ServerMessage
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }

    switch (msg.type) {
      case 'welcome':
        setMyPlayerId(msg.playerId)
        setMyColor(msg.color)
        setGameRoom(msg.gameState)
        setError(null)
        break

      case 'error':
        setError(msg.message)
        break

      case 'game_start':
        setGameRoom((prev) =>
          prev
            ? { ...prev, status: 'active', white: msg.white, black: msg.black, fen: msg.fen }
            : prev
        )
        setDrawOfferedBy(null)
        break

      case 'game_end':
        setGameRoom((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                result: msg.result as GameRoom['result'],
                endReason: msg.reason,
                fen: msg.fen,
                pgn: msg.pgn,
              }
            : prev
        )
        setDrawOfferedBy(null)
        clearCountdown()
        setOpponentDisconnected(false)
        break

      case 'move_made':
        setGameRoom((prev) =>
          prev
            ? {
                ...prev,
                fen: msg.fen,
                pgn: msg.pgn,
                moves: [...prev.moves, msg.move],
                whiteTimeMs: msg.whiteTimeMs,
                blackTimeMs: msg.blackTimeMs,
                lastMoveAt: msg.move.timestamp,
              }
            : prev
        )
        setDrawOfferedBy(null)
        break

      case 'invalid_move':
        setError(msg.reason)
        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000)
        break

      case 'state_sync':
        setGameRoom(msg.gameState)
        break

      case 'draw_offered':
        setDrawOfferedBy(msg.by)
        break

      case 'draw_declined':
        setDrawOfferedBy(null)
        break

      case 'opponent_connected':
        setOpponentDisconnected(false)
        clearCountdown()
        break

      case 'opponent_disconnected':
        setOpponentDisconnected(true)
        setReconnectCountdown(msg.reconnectTimeoutSec)
        // Start countdown
        clearCountdown()
        let remaining = msg.reconnectTimeoutSec
        countdownRef.current = setInterval(() => {
          remaining--
          if (remaining <= 0) {
            clearCountdown()
            setOpponentDisconnected(false)
          } else {
            setReconnectCountdown(remaining)
          }
        }, 1000)
        break

      case 'opponent_reconnected':
        setOpponentDisconnected(false)
        clearCountdown()
        break

      case 'spectator_count':
        setGameRoom((prev) => (prev ? { ...prev } : prev))
        break

      case 'chat_message':
        // Chat not implemented in UI yet, but handled
        break
    }
  }, [clearCountdown])

  // Connect to a room
  const connectToRoom = useCallback(
    (roomId: string, name: string) => {
      // Disconnect existing socket
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }

      setError(null)
      setGameRoom(null)
      setMyColor(null)
      setMyPlayerId(null)
      setOpponentDisconnected(false)
      setDrawOfferedBy(null)
      clearCountdown()
      playerNameRef.current = name

      const socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomId,
        party: 'game',
      })

      socket.addEventListener('open', () => {
        setIsConnected(true)
        // Send join message
        const joinMsg: ClientMessage = { type: 'join', name }
        socket.send(JSON.stringify(joinMsg))
      })

      socket.addEventListener('message', handleMessage)

      socket.addEventListener('close', () => {
        setIsConnected(false)
      })

      socket.addEventListener('error', () => {
        setError('Connection error. Please try again.')
        setIsConnected(false)
      })

      socketRef.current = socket
    },
    [handleMessage, clearCountdown]
  )

  // Create a new game (generates a random room ID)
  const createGame = useCallback(
    (name: string) => {
      const roomId = generateRoomId()
      connectToRoom(roomId, name)
    },
    [connectToRoom]
  )

  // Join an existing game
  const joinGame = useCallback(
    (roomId: string, name: string) => {
      connectToRoom(roomId.trim(), name)
    },
    [connectToRoom]
  )

  // Game actions
  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      send({ type: 'move', from, to, ...(promotion ? { promotion } : {}) })
    },
    [send]
  )

  const resign = useCallback(() => {
    send({ type: 'resign' })
  }, [send])

  const offerDraw = useCallback(() => {
    send({ type: 'offer_draw' })
  }, [send])

  const respondDraw = useCallback(
    (accept: boolean) => {
      send(accept ? { type: 'accept_draw' } : { type: 'decline_draw' })
    },
    [send]
  )

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      send({ type: 'leave' })
      socketRef.current.close()
      socketRef.current = null
    }
    setIsConnected(false)
    setGameRoom(null)
    setMyColor(null)
    setMyPlayerId(null)
    setOpponentDisconnected(false)
    setDrawOfferedBy(null)
    clearCountdown()
    setError(null)
  }, [send, clearCountdown])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      clearCountdown()
    }
  }, [clearCountdown])

  return {
    gameRoom,
    myColor,
    myPlayerId,
    isConnected,
    error,
    opponentDisconnected,
    reconnectCountdown,
    drawOfferedBy,
    createGame,
    joinGame,
    makeMove,
    resign,
    offerDraw,
    respondDraw,
    disconnect,
  }
}

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
