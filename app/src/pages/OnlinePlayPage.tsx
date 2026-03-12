import { useState, useCallback, useMemo, useEffect } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useMultiplayer } from '../hooks/useMultiplayer'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Globe, Copy, Check, Flag, Handshake, Wifi, WifiOff, Loader2, ArrowLeft } from 'lucide-react'
import { getSettings } from '../utils/settings'
import { BOARD_THEME_COLORS } from '../utils/boardThemes'
import type { PlayerColor } from '../types/multiplayer'

type Phase = 'lobby' | 'game'

export default function OnlinePlayPage() {
  usePageTitle('Online Play')
  const settings = getSettings()
  const mp = useMultiplayer()

  const [phase, setPhase] = useState<Phase>('lobby')
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('chess-online-name') || '')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [copied, setCopied] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)

  // Derive room ID from gameRoom
  const roomId = mp.gameRoom?.id ?? null

  // Once we have a gameRoom, move to game phase
  useEffect(() => {
    if (mp.gameRoom && phase === 'lobby') {
      setPhase('game')
    }
  }, [mp.gameRoom, phase])

  // Show game over modal when game ends
  useEffect(() => {
    if (mp.gameRoom?.status === 'completed') {
      setShowGameOver(true)
    }
  }, [mp.gameRoom?.status])

  // Save name to localStorage
  const saveName = useCallback((name: string) => {
    setPlayerName(name)
    localStorage.setItem('chess-online-name', name)
  }, [])

  const handleCreate = useCallback(() => {
    const name = playerName.trim() || 'Player'
    saveName(name)
    mp.createGame(name)
  }, [playerName, mp, saveName])

  const handleJoin = useCallback(() => {
    const name = playerName.trim() || 'Player'
    const room = joinRoomId.trim()
    if (!room) return
    saveName(name)
    mp.joinGame(room, name)
  }, [playerName, joinRoomId, mp, saveName])

  const handleCopyLink = useCallback(() => {
    if (!roomId) return
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [roomId])

  const handleLeave = useCallback(() => {
    mp.disconnect()
    setPhase('lobby')
    setShowGameOver(false)
  }, [mp])

  // Read room from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) {
      setJoinRoomId(room)
    }
  }, [])

  // Chess.js instance for board interaction (derived from server FEN)
  const chess = useMemo(() => {
    const c = new Chess()
    if (mp.gameRoom?.fen) {
      try {
        c.load(mp.gameRoom.fen)
      } catch { /* fallback to starting position */ }
    }
    return c
  }, [mp.gameRoom?.fen])

  const isMyTurn = useMemo(() => {
    if (!mp.myColor || mp.myColor === 'spectator' || !mp.gameRoom || mp.gameRoom.status !== 'active') return false
    const turn = chess.turn()
    return (turn === 'w' && mp.myColor === 'white') || (turn === 'b' && mp.myColor === 'black')
  }, [mp.myColor, mp.gameRoom, chess])

  const orientation: 'white' | 'black' = mp.myColor === 'black' ? 'black' : 'white'

  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!isMyTurn || !targetSquare) return false
      // Check for promotion
      const fen = mp.gameRoom?.fen || ''
      const isPawnMove = (() => {
        try {
          const c = new Chess(fen)
          const piece = c.get(sourceSquare as any)
          return piece?.type === 'p'
        } catch {
          return false
        }
      })()
      const isPromotion =
        isPawnMove &&
        ((targetSquare[1] === '8') || (targetSquare[1] === '1'))
      const promotion = isPromotion ? 'q' : undefined
      mp.makeMove(sourceSquare, targetSquare, promotion)
      return true // optimistic — server will reject if invalid
    },
    [isMyTurn, mp]
  )

  const boardOptions = useMemo(
    () => ({
      id: 'online-board',
      position: mp.gameRoom?.fen || 'start',
      boardOrientation: orientation,
      onPieceDrop: onDrop,
      allowDragging: isMyTurn,
      darkSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].dark },
      lightSquareStyle: { backgroundColor: BOARD_THEME_COLORS[settings.boardTheme].light },
      showNotation: settings.showCoordinates,
      showAnimations: settings.pieceAnimation,
      boardStyle: {
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
    }),
    [mp.gameRoom?.fen, orientation, onDrop, isMyTurn, settings]
  )

  // Player info helpers
  const myPlayer = mp.myColor === 'white' ? mp.gameRoom?.white : mp.myColor === 'black' ? mp.gameRoom?.black : null
  const opponentPlayer = mp.myColor === 'white' ? mp.gameRoom?.black : mp.myColor === 'black' ? mp.gameRoom?.white : null
  const turnLabel = mp.gameRoom?.status === 'active'
    ? isMyTurn
      ? 'Your turn'
      : "Opponent's turn"
    : mp.gameRoom?.status === 'waiting'
    ? 'Waiting for opponent...'
    : mp.gameRoom?.status === 'completed'
    ? 'Game over'
    : ''

  // Result text
  const resultText = useMemo(() => {
    if (!mp.gameRoom || mp.gameRoom.status !== 'completed') return ''
    const { result, endReason } = mp.gameRoom
    const reasonMap: Record<string, string> = {
      checkmate: 'Checkmate',
      stalemate: 'Stalemate',
      resignation: 'Resignation',
      timeout: 'Timeout',
      draw_agreement: 'Draw agreed',
      insufficient_material: 'Insufficient material',
      threefold_repetition: 'Threefold repetition',
      fifty_move_rule: 'Fifty-move rule',
      abandonment: 'Abandonment',
    }
    const reason = endReason ? reasonMap[endReason] || endReason : ''
    if (result === '1/2-1/2') return `Draw — ${reason}`
    const winnerColor: PlayerColor = result === '1-0' ? 'white' : 'black'
    const isWin = winnerColor === mp.myColor
    return isWin ? `You win! — ${reason}` : `You lose — ${reason}`
  }, [mp.gameRoom, mp.myColor])

  // ---- RENDER ----

  if (phase === 'lobby') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Online Play</h1>
          <p className="text-slate-400">Play chess with a friend in real-time</p>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Create Game */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Create a Game</h2>
          <p className="text-slate-400 text-sm mb-4">Start a new game and share the room code with a friend.</p>
          <button
            onClick={handleCreate}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Create Game
          </button>
        </div>

        {/* Join Game */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Join a Game</h2>
          <p className="text-slate-400 text-sm mb-4">Enter the room code to join an existing game.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Room code"
              maxLength={20}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin()
              }}
            />
            <button
              onClick={handleJoin}
              disabled={!joinRoomId.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        {mp.error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
            {mp.error}
          </div>
        )}
      </div>
    )
  }

  // Game phase
  return (
    <div className="flex flex-col items-center px-2 py-4 lg:py-6 h-full">
      {/* Connection & status bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-3">
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave
        </button>
        <div className="flex items-center gap-2">
          {mp.isConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <Wifi className="w-3.5 h-3.5" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-400 text-xs">
              <WifiOff className="w-3.5 h-3.5" /> Disconnected
            </span>
          )}
          {roomId && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-xs bg-slate-800 px-2 py-1 rounded transition"
              title="Copy invite link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {roomId}
            </button>
          )}
        </div>
      </div>

      {/* Opponent disconnected banner */}
      {mp.opponentDisconnected && (
        <div className="w-full max-w-xl bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 mb-3 text-amber-300 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>
            Opponent disconnected.{' '}
            {mp.reconnectCountdown != null && `Reconnecting... ${mp.reconnectCountdown}s`}
          </span>
        </div>
      )}

      {/* Draw offered banner */}
      {mp.drawOfferedBy && mp.myColor !== 'spectator' && (
        <div className="w-full max-w-xl bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 mb-3 text-blue-300 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Handshake className="w-4 h-4" />
            {mp.drawOfferedBy === mp.myColor ? 'Draw offered — waiting for response...' : 'Opponent offers a draw'}
          </span>
          {mp.drawOfferedBy !== mp.myColor && (
            <div className="flex gap-2">
              <button
                onClick={() => mp.respondDraw(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition"
              >
                Accept
              </button>
              <button
                onClick={() => mp.respondDraw(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1 rounded transition"
              >
                Decline
              </button>
            </div>
          )}
        </div>
      )}

      {/* Waiting for opponent */}
      {mp.gameRoom?.status === 'waiting' && (
        <div className="w-full max-w-xl bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 mb-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <div>
            <p className="text-white text-sm font-medium">Waiting for opponent...</p>
            <p className="text-slate-400 text-xs">Share the room code: <span className="text-blue-400 font-mono">{roomId}</span></p>
          </div>
        </div>
      )}

      {/* Top player (opponent) */}
      <div className="w-full max-w-xl mb-2">
        <div className="bg-slate-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${orientation === 'white' ? 'bg-gray-800 border border-gray-600' : 'bg-white'}`} />
            <span className="text-sm font-medium text-slate-200">
              {opponentPlayer?.name || 'Waiting...'}
            </span>
          </div>
          {mp.gameRoom?.status === 'active' && !isMyTurn && (
            <span className="text-xs text-blue-400 font-medium">Thinking...</span>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="w-full max-w-xl flex items-center justify-center">
        <div className="aspect-square w-full">
          <Chessboard options={boardOptions} />
        </div>
      </div>

      {/* Bottom player (me) */}
      <div className="w-full max-w-xl mt-2">
        <div className="bg-slate-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${orientation === 'white' ? 'bg-white' : 'bg-gray-800 border border-gray-600'}`} />
            <span className="text-sm font-medium text-slate-200">
              {myPlayer?.name || playerName || 'You'}
            </span>
          </div>
          {mp.gameRoom?.status === 'active' && isMyTurn && (
            <span className="text-xs text-emerald-400 font-medium">Your turn</span>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div className="w-full max-w-xl text-center mt-3">
        <span className="text-sm text-slate-400">{turnLabel}</span>
      </div>

      {/* Game controls */}
      {mp.gameRoom?.status === 'active' && mp.myColor !== 'spectator' && (
        <div className="w-full max-w-xl flex justify-center gap-3 mt-4">
          <button
            onClick={mp.offerDraw}
            disabled={!!mp.drawOfferedBy}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg transition"
          >
            <Handshake className="w-4 h-4" />
            Offer Draw
          </button>
          <button
            onClick={mp.resign}
            className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg transition"
          >
            <Flag className="w-4 h-4" />
            Resign
          </button>
        </div>
      )}

      {/* Error */}
      {mp.error && (
        <div className="w-full max-w-xl mt-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-300 text-sm">
          {mp.error}
        </div>
      )}

      {/* Game Over Modal */}
      {showGameOver && mp.gameRoom?.status === 'completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">
              {mp.gameRoom.result === '1/2-1/2' ? '🤝' : resultText.startsWith('You win') ? '🎉' : '😔'}
            </div>
            <h2 className="text-xl font-bold mb-2">{resultText}</h2>
            <p className="text-slate-400 text-sm mb-1">
              Result: <span className="text-white font-mono">{mp.gameRoom.result}</span>
            </p>
            {mp.gameRoom.moves.length > 0 && (
              <p className="text-slate-500 text-xs mb-6">
                {mp.gameRoom.moves.length} moves played
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowGameOver(false)
                  handleLeave()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition"
              >
                New Game
              </button>
              <button
                onClick={() => setShowGameOver(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-6 rounded-lg transition"
              >
                Review Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
