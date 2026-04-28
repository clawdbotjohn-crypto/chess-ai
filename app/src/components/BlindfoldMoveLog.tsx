import React from 'react'
import { EyeOff } from 'lucide-react'

interface BlindfoldMoveLogProps {
  moveHistory: string[]
  maxMoves?: number
}

export const BlindfoldMoveLog = React.memo(function BlindfoldMoveLog({
  moveHistory,
  maxMoves = 6,
}: BlindfoldMoveLogProps) {
  if (moveHistory.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <EyeOff style={{ width: '0.875rem', height: '0.875rem', color: '#a78bfa' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#a78bfa' }}>
            Blindfold Mode
          </span>
        </div>
        <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
          Visualize the position mentally. Moves will appear here.
        </p>
      </div>
    )
  }

  // Build move pairs (1. e4 e5, 2. Nf3 Nc6, etc.)
  // Show only the last maxMoves individual half-moves
  const startIdx = Math.max(0, moveHistory.length - maxMoves)
  const recentMoves = moveHistory.slice(startIdx)

  // Build display entries
  const entries: { moveNum: number; white?: string; black?: string }[] = []
  let currentIdx = startIdx
  
  // If starting on a black move (odd index), add partial entry
  if (currentIdx % 2 === 1) {
    entries.push({ moveNum: Math.floor(currentIdx / 2) + 1, black: recentMoves[0] })
    currentIdx++
  }

  // Process remaining pairs
  for (let i = currentIdx - startIdx; i < recentMoves.length; i += 2) {
    const moveNum = Math.floor((startIdx + i) / 2) + 1
    entries.push({
      moveNum,
      white: recentMoves[i],
      black: i + 1 < recentMoves.length ? recentMoves[i + 1] : undefined,
    })
  }

  const lastMoveIdx = moveHistory.length - 1
  const lastMoveIsWhite = lastMoveIdx % 2 === 0

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <EyeOff style={{ width: '0.875rem', height: '0.875rem', color: '#a78bfa' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#a78bfa' }}>
          Blindfold Mode — Recent Moves
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {entries.map((entry) => (
          <div key={entry.moveNum} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          }}>
            <span style={{ color: '#475569', minWidth: '1.5rem', textAlign: 'right' }}>
              {entry.moveNum}.
            </span>
            {entry.white && (
              <span style={{
                color: lastMoveIsWhite && entry.moveNum === Math.floor(lastMoveIdx / 2) + 1 && entry.white === moveHistory[lastMoveIdx]
                  ? '#e2e8f0' : '#94a3b8',
                fontWeight: lastMoveIsWhite && entry.moveNum === Math.floor(lastMoveIdx / 2) + 1 && entry.white === moveHistory[lastMoveIdx]
                  ? 600 : 400,
                minWidth: '2.5rem',
              }}>
                {entry.white}
              </span>
            )}
            {!entry.white && (
              <span style={{ color: '#475569', minWidth: '2.5rem' }}>...</span>
            )}
            {entry.black && (
              <span style={{
                color: !lastMoveIsWhite && entry.moveNum === Math.floor(lastMoveIdx / 2) + 1 && entry.black === moveHistory[lastMoveIdx]
                  ? '#e2e8f0' : '#94a3b8',
                fontWeight: !lastMoveIsWhite && entry.moveNum === Math.floor(lastMoveIdx / 2) + 1 && entry.black === moveHistory[lastMoveIdx]
                  ? 600 : 400,
              }}>
                {entry.black}
              </span>
            )}
          </div>
        ))}
      </div>
      {startIdx > 0 && (
        <p style={{ fontSize: '0.625rem', color: '#475569', marginTop: '0.25rem' }}>
          … {startIdx} earlier move{startIdx !== 1 ? 's' : ''} hidden
        </p>
      )}
    </div>
  )
})
