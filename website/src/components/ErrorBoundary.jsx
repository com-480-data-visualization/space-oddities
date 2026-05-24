import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '1.5rem',
          color: '#ef4444',
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: '0.85rem',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px',
          marginTop: '0.75rem',
        }}>
          <strong>Something went wrong.</strong> Try selecting a different conjunction event.
          <br />
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: '0.6rem',
              padding: '0.3rem 0.9rem',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px',
              color: '#ef4444',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
