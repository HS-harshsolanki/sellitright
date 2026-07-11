import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  app_env: string
  timestamp: string
  checks: {
    database: 'ok' | 'error'
    serviceClient: 'ok' | 'missing'
  }
  version: string
}

export async function GET() {
  const checks: HealthStatus['checks'] = {
    database: 'error',
    serviceClient: 'missing',
  }

  const admin = createServiceClient()

  if (admin) {
    checks.serviceClient = 'ok'
    try {
      // Lightweight liveness query — just checks DB is reachable
      const { error } = await admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .limit(1)
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

  return NextResponse.json(
    {
      status,
      app_env: process.env.NEXT_PUBLIC_APP_ENV ?? 'production',
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.npm_package_version ?? '0.1.0',
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
