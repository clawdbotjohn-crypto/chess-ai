import { useEffect } from 'react'
import type { GameMode } from './useGameState'

interface UseKeyboardShortcutsParams {
  navBack: () => void
  navForward: () => void
  navToStart: () => void
  navToLive: () => void
  undoLastMove: (mode: GameMode, isRunning: boolean) => void
  setFlipped: React.Dispatch<React.SetStateAction<boolean>>
  setShowNewGameModal: React.Dispatch<React.SetStateAction<boolean>>
  setShowResultModal: React.Dispatch<React.SetStateAction<boolean>>
  setPreMove: React.Dispatch<React.SetStateAction<{ from: string; to: string; promotion?: string } | null>>
  mode: GameMode
  isRunning: boolean
}

export function useKeyboardShortcuts({
  navBack, navForward, navToStart, navToLive,
  undoLastMove, setFlipped, setShowNewGameModal,
  setShowResultModal, setPreMove, mode, isRunning,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Escape') {
        e.preventDefault()
        setPreMove(null)
        setShowNewGameModal(false)
        setShowResultModal(false)
        return
      }
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); navBack(); break
        case 'ArrowRight': e.preventDefault(); navForward(); break
        case 'Home': e.preventDefault(); navToStart(); break
        case 'End': e.preventDefault(); navToLive(); break
        case 'f': case 'F': e.preventDefault(); setFlipped(prev => !prev); break
        case 'n': case 'N': e.preventDefault(); setShowNewGameModal(true); break
        case 'u': case 'U': e.preventDefault(); undoLastMove(mode, isRunning); break
        case 'z': case 'Z':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); undoLastMove(mode, isRunning) }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navBack, navForward, navToStart, navToLive, undoLastMove, mode, isRunning, setFlipped, setShowNewGameModal, setShowResultModal, setPreMove])
}
