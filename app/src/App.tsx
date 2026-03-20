import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import Layout from './components/Layout'

class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; resetKey?: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('ErrorBoundary caught:', error, info)
  }

  componentDidUpdate(prevProps: { resetKey?: string }) {
    // Reset error state when the route changes (resetKey changes)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
          <div className="text-5xl mb-4">♞</div>
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-slate-400 mb-6 max-w-md">
            An unexpected error occurred. This might be caused by a corrupted game state.
            Try reloading, or clear your browser data if the problem persists.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Reload
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/' }}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Clear Data &amp; Restart
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/** Wrapper that passes location as resetKey to ErrorBoundary */
function RouteAwareErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
}

// Retry wrapper for lazy imports — handles chunk load failures on fresh deploys
function lazyRetry<T extends { default: React.ComponentType<unknown> }>(
  importFn: () => Promise<T>,
  retries = 2
): React.LazyExoticComponent<T['default']> {
  return lazy(() =>
    importFn().catch((err) => {
      if (retries > 0) {
        return new Promise<T>((resolve) => setTimeout(() => resolve(importFn()), 500))
      }
      throw err
    })
  )
}

const HomePage = lazyRetry(() => import('./pages/HomePage'))
const GamePage = lazyRetry(() => import('./pages/GamePage'))
const LibraryPage = lazyRetry(() => import('./pages/LibraryPage'))
const HistoryPage = lazyRetry(() => import('./pages/HistoryPage'))
const SettingsPage = lazyRetry(() => import('./pages/SettingsPage'))
const EditorPage = lazyRetry(() => import('./pages/EditorPage'))
const AnalysisPage = lazyRetry(() => import('./pages/AnalysisPage'))
const PositionSetupPage = lazyRetry(() => import('./pages/PositionSetupPage'))
const BotArenaPage = lazyRetry(() => import('./pages/BotArenaPage'))
const OnlinePlayPage = lazyRetry(() => import('./pages/OnlinePlayPage'))
const NotFoundPage = lazyRetry(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <BrowserRouter basename={(import.meta.env.VITE_BASE_PATH || "/").replace(/\/$/, "") || "/"}>
      <RouteAwareErrorBoundary>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      }>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/play" element={<GamePage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/analysis/:gameId" element={<AnalysisPage />} />
            <Route path="/setup" element={<PositionSetupPage />} />
            <Route path="/arena" element={<BotArenaPage />} />
            <Route path="/online" element={<OnlinePlayPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      </RouteAwareErrorBoundary>
    </BrowserRouter>
  )
}

export default App
