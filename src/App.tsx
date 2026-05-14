import { Component } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useUiStore } from './stores/uiStore'
import './App.css'

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-xl font-bold text-red-600">应用出错了</h1>
          <p className="max-w-md text-center text-sm text-gray-500">
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppContent() {
  const languageReady = useUiStore((s) => s.languageReady)

  if (!languageReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-400">Loading...</span>
      </div>
    )
  }

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}
