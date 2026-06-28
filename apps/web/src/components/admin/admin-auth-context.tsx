'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'sir-admin-key'

interface AdminAuthCtx {
  isAuthenticated: boolean
  isValidating: boolean
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthCtx | null>(null)

export function useAdminAuth(): AdminAuthCtx {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}

interface ProviderProps {
  children: React.ReactNode
  onAuthenticated: (authenticated: boolean) => void
}

export function AdminAuthProvider({ children, onAuthenticated }: ProviderProps) {
  const [adminKey, setAdminKey] = useState<string>('')
  const [isValidating, setIsValidating] = useState(true)

  // Hydrate from localStorage and validate
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setIsValidating(false)
      onAuthenticated(false)
      return
    }
    fetch('/api/admin/stats', { headers: { 'x-admin-key': stored } })
      .then((res) => {
        if (res.ok) {
          setAdminKey(stored)
          onAuthenticated(true)
        } else {
          localStorage.removeItem(STORAGE_KEY)
          onAuthenticated(false)
        }
      })
      .catch(() => {
        onAuthenticated(false)
      })
      .finally(() => setIsValidating(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const apiFetch = useCallback(
    (path: string, opts: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(opts.headers)
      headers.set('x-admin-key', adminKey)
      if (!headers.has('Content-Type') && opts.body) {
        headers.set('Content-Type', 'application/json')
      }
      return fetch(path, { ...opts, headers })
    },
    [adminKey],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAdminKey('')
    onAuthenticated(false)
  }, [onAuthenticated])

  return (
    <AdminAuthContext.Provider
      value={{ isAuthenticated: !!adminKey, isValidating, apiFetch, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

// Standalone hook for pages that need to set the key after login
export function useAdminLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login(key: string, onSuccess: () => void) {
    const trimmed = key.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-key': trimmed },
      })
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, trimmed)
        onSuccess()
      } else {
        setError(res.status === 401 ? 'Invalid admin key.' : 'Unable to verify key. Try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return { login, loading, error }
}
