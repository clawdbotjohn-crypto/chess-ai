import { useEffect, useRef } from 'react'
import { X, Keyboard } from 'lucide-react'

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string; description: string }[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: '?', description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Play Page',
    shortcuts: [
      { keys: 'F', description: 'Flip board' },
      { keys: 'N', description: 'New game' },
      { keys: 'Ctrl+Z', description: 'Undo move' },
      { keys: 'Esc', description: 'Close modal' },
    ],
  },
  {
    title: 'Analysis Page',
    shortcuts: [
      { keys: '←', description: 'Previous move' },
      { keys: '→', description: 'Next move' },
      { keys: 'Home', description: 'Jump to start' },
      { keys: 'End', description: 'Jump to end' },
      { keys: 'Space', description: 'Auto-play moves' },
    ],
  },
]

interface KeyboardHelpModalProps {
  open: boolean
  onClose: () => void
}

export default function KeyboardHelpModal({ open, onClose }: KeyboardHelpModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="p-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{s.description}</span>
                    <kbd className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs font-mono text-slate-300">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <p className="text-xs text-slate-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
