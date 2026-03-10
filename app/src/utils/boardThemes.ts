import type { AppSettings } from './settings'

export interface BoardThemeOption {
  key: AppSettings['boardTheme']
  light: string
  dark: string
}

export const BOARD_THEMES: BoardThemeOption[] = [
  { key: 'classic', light: '#f0d9b5', dark: '#b58863' },
  { key: 'green', light: '#eeeed2', dark: '#769656' },
  { key: 'ice', light: '#dee3e6', dark: '#8ca2ad' },
  { key: 'dark', light: '#4b5563', dark: '#1f2937' },
]

export const BOARD_THEME_COLORS: Record<AppSettings['boardTheme'], { light: string; dark: string }> =
  Object.fromEntries(BOARD_THEMES.map(t => [t.key, { light: t.light, dark: t.dark }])) as Record<AppSettings['boardTheme'], { light: string; dark: string }>
