import { useState, useRef } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { Chessboard } from 'react-chessboard'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Handshake } from 'lucide-react'
import { GameResultModal } from '../components/GameResultModal'
import { EvalBar } from '../components/EvalBar'
import { NewGameModal } from '../components/NewGameModal'
import { useAIPersonality } from '../hooks/useAIPersonality'
import { useChessAI } from '../hooks/useChessAI'
import { useStockfish } from '../hooks/useStockfish'
import type { TimeControl } from '../engine/types'
import { TIME_CONTROLS } from '../engine/types'
import type { PresetName } from '../engine/presets'
import { useChessClock } from '../hooks/useChessClock'
import { useGameState } from '../hooks/useGameState'
import type { GameMode } from '../hooks/useGameState'
import { useAIvsAI } from '../hooks/useAIvsAI'
import { PlayerBar } from '../components/PlayerBar'
import type { PlayerBarInfo } from '../components/PlayerBar'
import { MoveHistoryPanel } from '../components/MoveHistoryPanel'
import { GameControls } from '../components/GameControls'
import { useGameLogic } from '../hooks/useGameLogic'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useCustomSquareStyles, useBoardOptions } from '../hooks/useBoardConfig'
import { GameSidebar } from '../components/GameSidebar'
import { BlindfoldMoveLog } from '../components/BlindfoldMoveLog'

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

  // Blindfold mode — resets on new game
  const [blindfoldMode, setBlindfoldMode] = useState(false)

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

  // Core game logic hook (AI responses, move handling, clock, save, status, etc.)
  const {
    settings, humanTurnChar, aiDisplayName,
    onDrop, onPieceClick, onPieceDrag, onSquareClick,
    isThinking, activeSearchDepth, lastMoveStats,
    getStatus, getGameResult, getSearchDepth,
    handleNewGameStart, formatTime, getCapturedByColor, isColorTurn,
  } = useGameLogic({
    gs, personality, aivsai,
    humanAI_white, humanAI_black, humanStockfish, clock,
    mode, setMode, playerColor, setPlayerColor,
    useStockfishEngine, setUseStockfishEngine,
    stockfishSkillLevel, setStockfishSkillLevel,
    stockfishDepth, setStockfishDepth,
    minMoveTimeRef, setMinMoveTime,
    timeControl, setTimeControl, timeControlRef,
    initialPreset, initialLoadSaved, searchParams,
  })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    navBack: gs.navBack,
    navForward: gs.navForward,
    navToStart: gs.navToStart,
    navToLive: gs.navToLive,
    undoLastMove: gs.undoLastMove,
    setFlipped: gs.setFlipped,
    setShowNewGameModal: gs.setShowNewGameModal,
    setShowResultModal: gs.setShowResultModal,
    setPreMove: gs.setPreMove,
    mode,
    isRunning: aivsai.isRunning,
  })

  // Custom square styles
  const customSquareStyles = useCustomSquareStyles({
    game: gs.game,
    lastMove: gs.lastMove,
    preMove: gs.preMove,
    selectedSquare: gs.selectedSquare,
    settings,
    mode,
    humanTurnChar,
  })

  // Board orientation
  const boardOrientation = (mode === 'human-vs-ai' && playerColor === 'black') ? 'black' : 'white'
  const topColor = boardOrientation === 'white' ? 'black' : 'white'
  const bottomColor = boardOrientation === 'white' ? 'white' : 'black'

  const effectiveOrientation: 'white' | 'black' = gs.flipped
    ? (boardOrientation === 'white' ? 'black' : 'white')
    : boardOrientation
  const effectiveTopColor = effectiveOrientation === 'white' ? 'black' : 'white'
  const effectiveBottomColor = effectiveOrientation === 'white' ? 'white' : 'black'

  // Board options
  const boardOptions = useBoardOptions({
    displayFen: gs.displayFen,
    effectiveOrientation,
    isReviewing: gs.isReviewing,
    isGameOver: gs.isGameOver,
    mode,
    isRunning: aivsai.isRunning,
    customSquareStyles,
    settings,
    onDrop,
    onPieceClick,
    onPieceDrag,
    onSquareClick,
    blindfoldMode,
  })

  const cardGlass = 'rounded-xl p-4 border border-white/[0.08]'
  const cardGlassStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
    backdropFilter: 'blur(10px)',
  }

  // Player bar info helper
  const getPlayerBar = (position: 'top' | 'bottom'): PlayerBarInfo => {
    const color = position === 'top' ? topColor : bottomColor
    const resolvedAiName = aiDisplayName
      ?? (personality.activePreset
        ? personality.activePreset.charAt(0).toUpperCase() + personality.activePreset.slice(1).toLowerCase()
        : 'Custom')

    if (mode === 'human-vs-ai') {
      const isAI = color !== playerColor
      if (isAI) {
        const isStockfish = useStockfishEngine
        return {
          icon: isStockfish ? 'cpu' : 'bot',
          name: isStockfish ? 'Stockfish' : resolvedAiName,
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

          {/* Blindfold move log — mobile */}
          {blindfoldMode && (
            <div className="w-full max-w-xl shrink-0 lg:hidden">
              <BlindfoldMoveLog moveHistory={gs.moveHistory} maxMoves={6} />
            </div>
          )}

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
            blindfoldMode={blindfoldMode}
            onNewGame={() => gs.setShowNewGameModal(true)}
            onFlip={() => gs.setFlipped(f => !f)}
            onUndo={() => gs.undoLastMove(mode, aivsai.isRunning)}
            onResign={() => gs.handleResign(mode, playerColor)}
            onClaimDraw={gs.handleClaimDraw}
            onToggleMoveHistory={() => gs.setShowMoveHistory(h => !h)}
            onToggleBlindfold={() => setBlindfoldMode(b => !b)}
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
        <GameSidebar
          mode={mode}
          isGameOver={gs.isGameOver}
          isThinking={isThinking}
          getStatus={getStatus}
          game={gs.game}
          aivsaiIsRunning={aivsai.isRunning}
          aivsaiIsPaused={aivsai.isPaused}
          aivsaiDelay={aivsai.delay}
          aivsaiSetDelay={aivsai.setDelay}
          aivsaiStartAIvsAI={aivsai.startAIvsAI}
          aivsaiPauseAIvsAI={aivsai.pauseAIvsAI}
          aivsaiResumeAIvsAI={aivsai.resumeAIvsAI}
          drawAvailable={gs.drawAvailable}
          drawReason={gs.drawReason}
          handleClaimDraw={gs.handleClaimDraw}
          setShowNewGameModal={gs.setShowNewGameModal}
          setFlipped={gs.setFlipped}
          undoLastMove={gs.undoLastMove}
          handleResign={gs.handleResign}
          playerColor={playerColor}
          minMoveTime={minMoveTime}
          setMinMoveTime={setMinMoveTime}
          minMoveTimeRef={minMoveTimeRef}
          moveHistoryLength={gs.moveHistory.length}
          renderMoveInput={renderMoveInput}
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
          blindfoldMode={blindfoldMode}
          onToggleBlindfold={() => setBlindfoldMode(b => !b)}
        />
      </div>

      {/* New Game Modal */}
      {gs.showNewGameModal && (
        <NewGameModal
          onStart={(settings) => { setBlindfoldMode(false); handleNewGameStart(settings) }}
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
