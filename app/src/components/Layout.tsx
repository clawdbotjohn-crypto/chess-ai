import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, ScrollText, Settings, Sliders } from 'lucide-react'

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

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
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
      </nav>

      {/* Mobile Header — hidden on play page */}
      {!isPlayPage && (
        <header className="lg:hidden flex items-center justify-center py-4 bg-slate-900 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl">♞</span>
            <span>Chess AI</span>
          </Link>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isPlayPage ? 'pb-14 lg:pb-0 overflow-hidden' : 'pb-24 lg:pb-0'}`}>
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
    </div>
  )
}
