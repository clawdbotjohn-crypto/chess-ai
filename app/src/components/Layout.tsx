import { useEffect, useState, useCallback } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, ScrollText, Settings, Sliders, CircleHelp } from 'lucide-react'
import KeyboardHelpModal from './KeyboardHelpModal'

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/editor', label: 'AI Creator', mobileLabel: 'Create', icon: Sliders },
  { to: '/play', label: 'Play', mobileLabel: 'Play', icon: PlusCircle },
  { to: '/history', label: 'History', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const isPlayPage = location.pathname === '/play'
  const [helpOpen, setHelpOpen] = useState(false)

  const openHelp = useCallback(() => setHelpOpen(true), [])
  const closeHelp = useCallback(() => setHelpOpen(false), [])

  // Global ? key listener
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't trigger when typing in inputs/textareas or when a modal is already open
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setHelpOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Focus main content on route changes for screen reader accessibility
  useEffect(() => {
    const main = document.getElementById('main-content')
    if (main) main.focus({ preventScroll: true })
  }, [location.pathname])

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      {/* Skip navigation link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      {/* Desktop Navigation — compact on play page */}
      <nav className={`hidden lg:flex items-center justify-between bg-slate-900 border-b border-slate-800 sticky top-0 z-40 ${isPlayPage ? 'px-4 py-2' : 'px-6 py-4'}`}>
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl">♞</span>
            {!isPlayPage && <span>Chess AI</span>}
          </Link>
          <div className="flex items-center gap-6 text-slate-300">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 transition ${
                  isActive(to) ? 'text-white font-medium' : 'hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={openHelp}
          className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <CircleHelp className="w-5 h-5" />
        </button>
      </nav>

      {/* Mobile Header — hidden on play page */}
      {!isPlayPage && (
        <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-slate-900 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl">♞</span>
            <span>Chess AI</span>
          </Link>
          <button
            onClick={openHelp}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <CircleHelp className="w-4 h-4" />
          </button>
        </header>
      )}

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className={`flex-1 ${isPlayPage ? 'pb-14 lg:pb-0 overflow-hidden' : 'pb-24 lg:pb-0'}`} style={{ outline: 'none' }}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation — slim on play page */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 ${isPlayPage ? 'px-1 py-1' : 'px-2 py-2'}`}>
        <div className="flex justify-around items-center">
          {navLinks.map(({ to, label, mobileLabel, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 ${isPlayPage ? 'py-1' : 'py-2'} ${
                isActive(to) ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <Icon className={isPlayPage ? 'w-4 h-4' : 'w-5 h-5'} />
              <span className={`font-medium ${isPlayPage ? 'text-[10px]' : 'text-xs'}`}>{mobileLabel ?? label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Keyboard Help Modal */}
      <KeyboardHelpModal open={helpOpen} onClose={closeHelp} />
    </div>
  )
}
