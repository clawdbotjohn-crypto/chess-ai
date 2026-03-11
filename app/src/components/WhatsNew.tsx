import { useState } from 'react'
import { X } from 'lucide-react'

const CURRENT_VERSION = '1.4.0'
const STORAGE_KEY = 'chess-ai-whats-new-seen'

const features = [
  '🆕 PWA Support — Install Chess AI as an app on your phone!',
  '♟️ Pre-moves — Queue moves while AI is thinking',
  '🔍 Position Setup — Create custom board positions',
  '📊 Progressive Evaluation — Watch the eval bar update in real-time',
]

function hasSeenVersion(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === CURRENT_VERSION
  } catch {
    return false
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION)
  } catch {
    // ignore
  }
}

export default function WhatsNew() {
  const [dismissed, setDismissed] = useState(hasSeenVersion)

  if (dismissed) return null

  const handleDismiss = () => {
    markSeen()
    setDismissed(true)
  }

  return (
    <div className="relative bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-5 mb-6">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-white transition min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-3">
        What&apos;s New
      </h3>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li key={f} className="text-sm text-slate-300">{f}</li>
        ))}
      </ul>
    </div>
  )
}
