export interface AppSettings {
  // Board
  showLegalMoves: boolean
  highlightLastMove: boolean
  showCoordinates: boolean
  pieceAnimation: boolean

  // Sound
  soundEnabled: boolean
  volume: number

  // AI
  defaultSearchDepth: number
  showEvalBar: boolean
  openingBookEnabled: boolean

  // Board theme
  boardTheme: 'classic' | 'green' | 'ice' | 'dark'

  // Game
  aiMoveDelay: number
}

const STORAGE_KEY = 'chess-ai-settings'

const DEFAULTS: AppSettings = {
  showLegalMoves: true,
  highlightLastMove: true,
  showCoordinates: true,
  pieceAnimation: true,
  soundEnabled: true,
  volume: 80,
  defaultSearchDepth: 4,
  showEvalBar: false,
  openingBookEnabled: true,
  boardTheme: 'classic',
  aiMoveDelay: 500,
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated = { ...current, ...partial }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function resetSettings(): AppSettings {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS))
  return { ...DEFAULTS }
}
