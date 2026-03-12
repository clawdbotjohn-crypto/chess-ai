import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import Layout from './components/Layout'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('ErrorBoundary caught:', error, info)
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

const HomePage = lazy(() => import('./pages/HomePage'))
const GamePage = lazy(() => import('./pages/GamePage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const EditorPage = lazy(() => import('./pages/EditorPage'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'))
const PositionSetupPage = lazy(() => import('./pages/PositionSetupPage'))
const BotArenaPage = lazy(() => import('./pages/BotArenaPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter basename={(import.meta.env.VITE_BASE_PATH || "/").replace(/\/$/, "") || "/"}>
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
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
