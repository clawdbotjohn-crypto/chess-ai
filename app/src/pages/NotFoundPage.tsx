import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-7xl mb-4">♞</div>
      <h1 className="text-3xl font-bold text-white mb-2">Position Not Found</h1>
      <p className="text-slate-400 mb-8 max-w-md">
        That square doesn't exist on the board. The page you're looking for may have been moved or captured.
      </p>
      <Link
        to="/"
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
      >
        Back to Home
      </Link>
    </div>
  )
}
