import React from 'react'
import './ErrorBoundary.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Optionally log error to an external service
    // console.error('Captured error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onRecover) this.props.onRecover()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-card">
            <h3>Something went wrong</h3>
            <p>We encountered an error while rendering this section.</p>
            <div className="error-actions">
              <button onClick={this.handleReload} className="btn-primary">Try again</button>
              <button onClick={() => window.location.reload()} className="btn-muted">Reload page</button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
