export interface GameRecord {
  id: string
  date: string
  mode: 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai'
  result: 'win' | 'loss' | 'draw'
  resultDetail: string
  pgn: string
  moves: number
  whiteLabel: string
  blackLabel: string
  playerColor?: 'white' | 'black'
  aiPersonality?: string
  aiAvatar?: string
  durationMs?: number
}

const STORAGE_KEY = 'chess-ai-game-history'

export function saveGame(record: GameRecord): void {
  const games = getGames()
  games.unshift(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export function getGames(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const games: GameRecord[] = JSON.parse(raw)
    return games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch {
    return []
  }
}

export function deleteGame(id: string): void {
  const games = getGames().filter(g => g.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getStats(): { wins: number; losses: number; draws: number } {
  const games = getGames()
  return {
    wins: games.filter(g => g.result === 'win').length,
    losses: games.filter(g => g.result === 'loss').length,
    draws: games.filter(g => g.result === 'draw').length,
  }
}
