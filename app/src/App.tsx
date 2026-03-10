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
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-slate-400 mb-6">An unexpected error occurred. Please reload the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Reload
          </button>
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

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter basename={(import.meta.env.VITE_BASE_PATH || "/").replace(/\/$/, "") || "/"}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
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
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
