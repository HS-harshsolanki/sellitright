import { NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  checks: {
    database: 'ok' | 'error'
    serviceClient: 'ok' | 'missing'
  }
  version: string
}

// In-memory cache: deduplicates burst DB checks under high concurrency.
// At 250+ concurrent users, all requests within 30s return the cached result
// without opening additional Supabase connections.
let cachedResult: { status: HealthStatus['status']; checks: HealthStatus['checks'] } | null = null
let cacheExpiresAt = 0
let inflightCheck: Promise<{
  status: HealthStatus['status']
  checks: HealthStatus['checks']
}> | null = null

async function checkHealth() {
  const checks: HealthStatus['checks'] = {
    database: 'error',
    serviceClient: 'missing',
  }

  const admin = createServiceClient()

  if (admin) {
    checks.serviceClient = 'ok'
    try {
      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), 5_000)
      const { error } = await admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .limit(1)
        .abortSignal(ac.signal)
      clearTimeout(t)
      checks.database = error ? 'error' : 'ok'
    } catch {
      checks.database = 'error'
    }
  }

  const allOk = checks.database === 'ok' && checks.serviceClient === 'ok'
  const status: HealthStatus['status'] = allOk
    ? 'ok'
    : checks.database === 'error'
      ? 'down'
      : 'degraded'

  return { status, checks }
}

export async function GET() {
  const now = Date.now()

  if (cachedResult && now < cacheExpiresAt) {
    return NextResponse.json(
      { status: cachedResult.status, timestamp: new Date(cacheExpiresAt - 30_000).toISOString() },
      {
        status: cachedResult.status === 'ok' ? 200 : 503,
        headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
      },
    )
  }

  // Deduplicate concurrent cache-miss requests to a single DB check
  if (!inflightCheck) {
    inflightCheck = checkHealth().finally(() => {
      inflightCheck = null
    })
  }

  const result = await inflightCheck
  cachedResult = result
  cacheExpiresAt = Date.now() + 30_000

  return NextResponse.json(
    { status: result.status, timestamp: new Date().toISOString() },
    {
      status: result.status === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
    },
  )
}
