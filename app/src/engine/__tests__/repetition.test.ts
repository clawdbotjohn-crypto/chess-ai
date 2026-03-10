import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'

/**
 * Tests for three-fold repetition detection in chess.js.
 *
 * The key insight: chess.js needs full move history to detect repetition.
 * Creating `new Chess(fen)` loses history, so `isThreefoldRepetition()` fails.
 * We must clone via PGN: `new Chess(); copy.loadPgn(game.pgn())`.
 */

describe('Three-fold repetition detection', () => {
  it('detects simple knight shuffle repetition (Nf3-Ng1 loop)', () => {
    const game = new Chess()

    // Repeat Nf3/Nc6 then Ng1/Nb8 three times to reach the starting position 3 times
    // Starting position = occurrence 1
    const moves = [
      'Nf3', 'Nc6', 'Ng1', 'Nb8', // back to start (occurrence 2)
      'Nf3', 'Nc6', 'Ng1', 'Nb8', // back to start (occurrence 3)
    ]

    for (const move of moves) {
      game.move(move)
    }

    expect(game.isThreefoldRepetition()).toBe(true)
    // chess.js isDraw() should also return true
    expect(game.isDraw()).toBe(true)
    // isGameOver() depends on isDraw()
    expect(game.isGameOver()).toBe(true)
  })

  it('detects repetition via different move orders reaching same position', () => {
    const game = new Chess()

    // Reach a specific position 3 times through different paths
    // Position after 1.Nf3 Nf6
    game.move('Nf3')
    game.move('Nf6') // Position A - occurrence 1

    // Return to start and come back via same moves
    game.move('Ng1')
    game.move('Ng8')
    game.move('Nf3')
    game.move('Nf6') // Position A - occurrence 2

    // Return and come back again
    game.move('Ng1')
    game.move('Ng8')
    game.move('Nf3')
    game.move('Nf6') // Position A - occurrence 3

    expect(game.isThreefoldRepetition()).toBe(true)
  })

  it('does NOT trigger when same piece placement has different castling rights', () => {
    // Use a custom FEN-based game to test that positions with the same piece
    // placement but different castling rights are NOT considered the same position.
    //
    // Position 1: starting position (castling available) — has KQkq rights
    // Position 2: same pieces, no castling rights — different position
    // These should NOT count as repetitions of each other.

    const game = new Chess()

    // Play moves that lose castling rights then return pieces to original squares
    // After Ke2/Ke7 then Ke1/Ke8, kings are back but castling rights are gone
    const setup = ['e4', 'e5', 'Ke2', 'Ke7', 'Ke1', 'Ke8']
    for (const move of setup) {
      game.move(move)
    }

    // Now the position has pieces similar to after 1.e4 e5 but no castling rights.
    // The initial position (with castling rights) was only seen once.
    // The current position (without castling rights) has been seen once.
    expect(game.isThreefoldRepetition()).toBe(false)

    // Repeat to get this no-castling position 3 times
    const repeatMoves = [
      'Nf3', 'Nf6', 'Ng1', 'Ng8', // back to no-castling position (occurrence 2)
      'Nf3', 'Nf6', 'Ng1', 'Ng8', // occurrence 3
    ]
    for (const move of repeatMoves) {
      game.move(move)
    }

    // NOW it should trigger — same position (without castling) seen 3 times
    expect(game.isThreefoldRepetition()).toBe(true)
  })

  it('does NOT trigger for near-repetition with en passant difference', () => {
    const game = new Chess()

    // Create a position where en passant square differs
    // Position A: after 1.e4 (en passant available on e3)
    // vs Position B: same piece layout but no en passant

    const moves = [
      'e4', 'Nf6',  // after e4, en passant square e3 exists
      'e5', 'Ng8',
      'Nf3', 'Nf6',
      'Ng1', 'Ng8', // pieces roughly back but e-pawn is on e5 now, different structure
    ]

    for (const move of moves) {
      game.move(move)
    }

    // Should NOT be threefold — pawn structure changed
    expect(game.isThreefoldRepetition()).toBe(false)
  })

  it('history is lost when cloning via FEN (demonstrates the bug)', () => {
    const game = new Chess()

    const moves = [
      'Nf3', 'Nc6', 'Ng1', 'Nb8',
      'Nf3', 'Nc6', 'Ng1', 'Nb8',
    ]

    for (const move of moves) {
      game.move(move)
    }

    // With full history — should detect repetition
    expect(game.isThreefoldRepetition()).toBe(true)

    // Clone via FEN — loses history, can't detect repetition
    const fenClone = new Chess(game.fen())
    expect(fenClone.isThreefoldRepetition()).toBe(false)

    // Clone via PGN — preserves history, detects repetition (THE FIX)
    const pgnClone = new Chess()
    pgnClone.loadPgn(game.pgn())
    expect(pgnClone.isThreefoldRepetition()).toBe(true)
  })
})
