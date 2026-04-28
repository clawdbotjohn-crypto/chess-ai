import React from 'react'

const PIECE_KEYS = ['wP','wR','wN','wB','wQ','wK','bP','bR','bN','bB','bQ','bK'] as const

function makeBlindfoldPieces(): Record<string, () => React.JSX.Element> {
  const pieces: Record<string, () => React.JSX.Element> = {}
  for (const key of PIECE_KEYS) {
    pieces[key] = () => (
      <div style={{ width: '100%', height: '100%', opacity: 0 }} />
    )
  }
  return pieces
}

export const BLINDFOLD_PIECES = makeBlindfoldPieces()
