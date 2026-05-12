import { getGames } from './gameHistory'

export interface GameStats {
  totalGames: number
  wins: number
  losses: number
  draws: number
  winStreak: number
  longestWinStreak: number
  gamesVsAI: number
  gamesVsHuman: number
  gamesAIvsAI: number
}

export function getStats(): GameStats {
  const games = getGames()

  let wins = 0
  let losses = 0
  let draws = 0
  let gamesVsAI = 0
  let gamesVsHuman = 0
  let gamesAIvsAI = 0

  for (const g of games) {
    if (g.result === 'win') wins++
    else if (g.result === 'loss') losses++
    else draws++

    if (g.mode === 'human-vs-ai') gamesVsAI++
    else if (g.mode === 'human-vs-human') gamesVsHuman++
    else if (g.mode === 'ai-vs-ai') gamesAIvsAI++
  }

  // Calculate win streak and longest win streak from most recent games
  // Games are sorted newest-first from getGames()
  let winStreak = 0
  for (const g of games) {
    if (g.result === 'win') winStreak++
    else break
  }

  let longestWinStreak = 0
  let currentStreak = 0
  // Iterate oldest-first for longest streak calculation
  for (let i = games.length - 1; i >= 0; i--) {
    if (games[i].result === 'win') {
      currentStreak++
      if (currentStreak > longestWinStreak) longestWinStreak = currentStreak
    } else {
      currentStreak = 0
    }
  }

  return {
    totalGames: games.length,
    wins,
    losses,
    draws,
    winStreak,
    longestWinStreak,
    gamesVsAI,
    gamesVsHuman,
    gamesAIvsAI,
  }
}

/** @deprecated Stats are now derived from game history. This is a no-op. */
export function recordGame(_result: 'win' | 'loss' | 'draw', _mode: string): void {
  // No-op: stats are derived from game history
}

export function resetStats(): void {
  // Clean up the legacy stats key if it exists
  try { localStorage.removeItem('chess-ai-game-stats') } catch { /* ignore */ }
}

export function getWinRate(stats: GameStats): number {
  if (stats.totalGames === 0) return 0
  return Math.round((stats.wins / stats.totalGames) * 100)
}
