'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

function reportError(error: Error, info: React.ErrorInfo): void {
  // TODO: wire up to analytics / error-tracking (e.g. Sentry) — GH issue #42
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, info)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          role="alert"
          className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-6 py-12 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-900">Something went wrong</h2>
            <p className="text-sm text-gray-500">
              An unexpected error occurred. Try refreshing the page.
            </p>
          </div>

          <button
            onClick={this.handleReset}
            className="hover:bg-[var(--color-primary)]/90 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 w-full max-w-md text-left">
              <summary className="cursor-pointer text-xs text-gray-400">
                Error details (dev only)
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
