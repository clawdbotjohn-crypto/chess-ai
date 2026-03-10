/**
 * Pseudo-legal move generation for pre-moves.
 * 
 * Returns all squares a piece TYPE could reach from a given square,
 * ignoring board state (other pieces, pins, checks, etc.).
 * Only respects board edges.
 * 
 * This matches Lichess pre-move behavior: any theoretically reachable
 * square is a valid pre-move target. Legality is checked at execution time.
 */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

function fileIndex(square: string): number {
  return FILES.indexOf(square[0] as typeof FILES[number])
}

function rankIndex(square: string): number {
  return RANKS.indexOf(square[1] as typeof RANKS[number])
}

function toSquare(file: number, rank: number): string | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${FILES[file]}${RANKS[rank]}`
}

function addRaySquares(squares: Set<string>, file: number, rank: number, df: number, dr: number) {
  let f = file + df
  let r = rank + dr
  while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
    squares.add(`${FILES[f]}${RANKS[r]}`)
    f += df
    r += dr
  }
}

/**
 * Get all pseudo-legal target squares for a piece type from a given square.
 * 
 * @param pieceType - lowercase piece type: 'p', 'n', 'b', 'r', 'q', 'k'
 * @param fromSquare - e.g. 'e4'
 * @param color - 'w' or 'b' (needed for pawn direction)
 * @returns Set of square strings that are pseudo-legal targets
 */
export function getPseudoLegalSquares(pieceType: string, fromSquare: string, color: string): Set<string> {
  const squares = new Set<string>()
  const f = fileIndex(fromSquare)
  const r = rankIndex(fromSquare)

  switch (pieceType) {
    case 'p': {
      // Pawns: forward 1, forward 2 (from starting rank), diagonal captures
      const dir = color === 'w' ? 1 : -1
      const startRank = color === 'w' ? 1 : 6

      // Forward 1
      const fwd1 = toSquare(f, r + dir)
      if (fwd1) squares.add(fwd1)

      // Forward 2 from starting rank
      if (r === startRank) {
        const fwd2 = toSquare(f, r + 2 * dir)
        if (fwd2) squares.add(fwd2)
      }

      // Diagonal captures (including en passant squares)
      const capLeft = toSquare(f - 1, r + dir)
      if (capLeft) squares.add(capLeft)
      const capRight = toSquare(f + 1, r + dir)
      if (capRight) squares.add(capRight)
      break
    }

    case 'n': {
      // Knight: L-shapes
      const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
      for (const [df, dr] of offsets) {
        const sq = toSquare(f + df, r + dr)
        if (sq) squares.add(sq)
      }
      break
    }

    case 'b': {
      // Bishop: diagonals
      addRaySquares(squares, f, r, 1, 1)
      addRaySquares(squares, f, r, 1, -1)
      addRaySquares(squares, f, r, -1, 1)
      addRaySquares(squares, f, r, -1, -1)
      break
    }

    case 'r': {
      // Rook: ranks and files
      addRaySquares(squares, f, r, 1, 0)
      addRaySquares(squares, f, r, -1, 0)
      addRaySquares(squares, f, r, 0, 1)
      addRaySquares(squares, f, r, 0, -1)
      break
    }

    case 'q': {
      // Queen: all 8 directions
      addRaySquares(squares, f, r, 1, 0)
      addRaySquares(squares, f, r, -1, 0)
      addRaySquares(squares, f, r, 0, 1)
      addRaySquares(squares, f, r, 0, -1)
      addRaySquares(squares, f, r, 1, 1)
      addRaySquares(squares, f, r, 1, -1)
      addRaySquares(squares, f, r, -1, 1)
      addRaySquares(squares, f, r, -1, -1)
      break
    }

    case 'k': {
      // King: 1 square in all 8 directions + castling squares
      const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
      for (const [df, dr] of offsets) {
        const sq = toSquare(f + df, r + dr)
        if (sq) squares.add(sq)
      }
      // Castling: allow king to target g1/c1 or g8/c8
      if (color === 'w' && fromSquare === 'e1') {
        squares.add('g1')
        squares.add('c1')
      } else if (color === 'b' && fromSquare === 'e8') {
        squares.add('g8')
        squares.add('c8')
      }
      break
    }
  }

  return squares
}
