import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
    this.retryTimer = null
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
    this.retryTimer = setTimeout(() => {
      this.setState(s => ({ hasError: false, retryCount: s.retryCount + 1 }))
    }, 30000)
  }

  componentWillUnmount() {
    clearTimeout(this.retryTimer)
  }

  retry() {
    clearTimeout(this.retryTimer)
    this.setState(s => ({ hasError: false, retryCount: s.retryCount + 1 }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-[var(--text-secondary)]">
          <div className="text-4xl">⚠️</div>
          <p className="text-lg">Failed to load data</p>
          <p className="text-sm text-[var(--text-muted)]">Auto-retrying in 30 seconds</p>
          <button
            onClick={() => this.retry()}
            className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:bg-[var(--accent-dim)] transition-colors"
          >
            Retry Now
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
