import { useMemo } from 'react'
import type { Square } from 'chess.js'
import type { Chess } from 'chess.js'
import { BOARD_THEME_COLORS } from '../utils/boardThemes'
import { getPseudoLegalSquares } from '../utils/pseudoLegalMoves'

// UseBoardConfigParams interface removed - was unused

export function useCustomSquareStyles({
  game, lastMove, preMove, selectedSquare,
  settings, mode, humanTurnChar,
}: {
  game: Chess
  lastMove: { from: string; to: string } | null
  preMove: { from: string; to: string; promotion?: string } | null
  selectedSquare: string | null
  settings: { highlightLastMove: boolean; showLegalMoves: boolean }
  mode: string
  humanTurnChar: string
}) {
  return useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    if (preMove) {
      const preMoveStyle: React.CSSProperties = {
        backgroundColor: 'rgba(0, 180, 216, 0.4)',
        boxShadow: 'inset 0 0 8px rgba(0, 180, 216, 0.3)',
      }
      styles[preMove.from] = { ...styles[preMove.from], ...preMoveStyle }
      styles[preMove.to] = { ...styles[preMove.to], ...preMoveStyle }
    }

    if (lastMove && settings.highlightLastMove) {
      const lastMoveStyle: React.CSSProperties = { backgroundColor: 'rgba(155, 199, 0, 0.35)' }
      styles[lastMove.from] = { ...lastMoveStyle }
      styles[lastMove.to] = { ...lastMoveStyle }
    }

    if (selectedSquare) {
      styles[selectedSquare] = { ...styles[selectedSquare], backgroundColor: 'rgba(255, 255, 0, 0.4)' }
      if (settings.showLegalMoves) {
        const isAiTurn = mode === 'human-vs-ai' && game.turn() !== humanTurnChar
        if (isAiTurn) {
          const piece = game.get(selectedSquare as Square)
          if (piece && piece.color === humanTurnChar) {
            const pseudoLegal = getPseudoLegalSquares(piece.type, selectedSquare, piece.color)
            for (const sq of pseudoLegal) {
              const targetPiece = game.get(sq as Square)
              if (targetPiece) {
                styles[sq] = { ...styles[sq], background: `${styles[sq]?.backgroundColor ? `${styles[sq].backgroundColor}, ` : ''}radial-gradient(transparent 55%, rgba(0, 180, 216, 0.4) 55%)`, borderRadius: '50%' }
              } else {
                styles[sq] = { ...styles[sq], background: `${styles[sq]?.backgroundColor ? `${styles[sq].backgroundColor}, ` : ''}radial-gradient(rgba(0, 180, 216, 0.35) 22%, transparent 22%)` }
              }
            }
          }
        } else {
          try {
            const legalMoves = game.moves({ square: selectedSquare as Square, verbose: true })
            for (const move of legalMoves) {
              const targetPiece = game.get(move.to as Square)
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
            styles[kingSquare] = { ...styles[kingSquare], backgroundColor: 'rgba(235, 50, 50, 0.55)', boxShadow: 'inset 0 0 12px rgba(255, 0, 0, 0.6)' }
          }
        }
      }
    }

    return styles
  }, [game, lastMove, preMove, selectedSquare, settings.highlightLastMove, settings.showLegalMoves, mode, humanTurnChar])
}

export function useBoardOptions({
  displayFen, effectiveOrientation, isReviewing, isGameOver,
  mode, isRunning, customSquareStyles, settings,
  onDrop, onPieceClick, onPieceDrag, onSquareClick,
}: {
  displayFen: string
  effectiveOrientation: 'white' | 'black'
  isReviewing: boolean
  isGameOver: boolean
  mode: string
  isRunning: boolean
  customSquareStyles: Record<string, React.CSSProperties>
  settings: { boardTheme: keyof typeof BOARD_THEME_COLORS; showCoordinates: boolean; pieceAnimation: boolean }
  onDrop: (args: { sourceSquare: string; targetSquare: string | null }) => boolean
  onPieceClick: () => void
  onPieceDrag: (args: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null }) => void
  onSquareClick: (args: { piece: { pieceType: string } | null; square: string }) => void
}) {
  return useMemo(() => ({
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
    darkSquareStyle: { backgroundColor: (BOARD_THEME_COLORS as Record<string, { light: string; dark: string }>)[settings.boardTheme].dark },
    lightSquareStyle: { backgroundColor: (BOARD_THEME_COLORS as Record<string, { light: string; dark: string }>)[settings.boardTheme].light },
    showNotation: settings.showCoordinates,
    showAnimations: settings.pieceAnimation,
    boardStyle: {
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      ...(isReviewing ? { opacity: 0.85 } : {}),
    }
  }), [displayFen, effectiveOrientation, onDrop, onPieceClick, onPieceDrag, onSquareClick, isReviewing, isGameOver, mode, isRunning, customSquareStyles, settings.boardTheme, settings.showCoordinates, settings.pieceAnimation])
}
