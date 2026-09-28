import * as React from 'react'
import ErrorPage from '@/pages/ErrorPage'

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('MediAssist AI caught an error:', error)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage code="500" message="Something unexpected happened while rendering this page." />
    }
    return this.props.children
  }
}
