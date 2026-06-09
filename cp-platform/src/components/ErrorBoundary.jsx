import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Crash:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fall">
          <div className="error-boundary-content">
            <AlertCircle size={48} color="var(--fail)" />
            <h2>Something went wrong</h2>
            <p>The application encountered an unexpected error. Your work in the current session might be affected.</p>
            <div className="error-details">
              {this.state.error?.toString()}
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} />
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
