const STORAGE_KEY = 'chess-ai-game-stats'

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

function defaultStats(): GameStats {
  return {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    longestWinStreak: 0,
    gamesVsAI: 0,
    gamesVsHuman: 0,
    gamesAIvsAI: 0,
  }
}

export function getStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStats()
    const parsed = JSON.parse(raw) as Partial<GameStats>
    return { ...defaultStats(), ...parsed }
  } catch {
    return defaultStats()
  }
}

export function recordGame(result: 'win' | 'loss' | 'draw', mode: string): void {
  const stats = getStats()

  stats.totalGames++

  if (result === 'win') {
    stats.wins++
    stats.winStreak++
    if (stats.winStreak > stats.longestWinStreak) {
      stats.longestWinStreak = stats.winStreak
    }
  } else if (result === 'loss') {
    stats.losses++
    stats.winStreak = 0
  } else {
    stats.draws++
    stats.winStreak = 0
  }

  if (mode === 'human-vs-ai') {
    stats.gamesVsAI++
  } else if (mode === 'human-vs-human') {
    stats.gamesVsHuman++
  } else if (mode === 'ai-vs-ai') {
    stats.gamesAIvsAI++
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}

export function resetStats(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getWinRate(stats: GameStats): number {
  if (stats.totalGames === 0) return 0
  return Math.round((stats.wins / stats.totalGames) * 100)
}
