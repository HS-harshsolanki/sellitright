/**
 * One-time script to seed locality_price_benchmarks from existing active listings.
 * Run with: pnpm tsx scripts/seed-price-benchmarks.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Fetching active listings with price and area data...')

  // Fetch all active listings with price and built_up_area
  const { data: listings, error } = await admin
    .from('listings')
    .select('city, locality, property_type, price, built_up_area')
    .eq('status', 'ACTIVE')
    .gt('built_up_area', 0)
    .gt('price', 0)

  if (error || !listings) {
    console.error('Failed to fetch listings:', error?.message)
    process.exit(1)
  }

  console.log(`Fetched ${listings.length} listings`)

  // Group by (city, locality, property_type) and compute stats
  type GroupKey = string
  const groups = new Map<GroupKey, number[]>()

  for (const l of listings) {
    if (!l.city || !l.locality || !l.property_type || !l.built_up_area || !l.price) continue
    const priceSqft = l.price / l.built_up_area
    const key: GroupKey = `${l.city}|||${l.locality}|||${l.property_type}`
    const arr = groups.get(key) ?? []
    arr.push(priceSqft)
    groups.set(key, arr)
  }

  console.log(`Found ${groups.size} (city, locality, property_type) groups`)

  const upsertRows: {
    city: string
    locality: string
    property_type: string
    median_price_sqft: number
    stddev_price_sqft: number
    sample_count: number
    computed_at: string
  }[] = []

  for (const [key, prices] of groups) {
    if (prices.length < 10) continue // Need at least 10 data points

    const parts = key.split('|||')
    const city = parts[0] ?? ''
    const locality = parts[1] ?? ''
    const property_type = parts[2] ?? ''
    if (!city || !locality || !property_type) continue

    // Compute median
    const sorted = [...prices].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const medianA = sorted[mid - 1] ?? 0
    const medianB = sorted[mid] ?? 0
    const median = sorted.length % 2 === 0 ? (medianA + medianB) / 2 : (sorted[mid] ?? 0)

    // Compute stddev
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    const stddev = Math.sqrt(variance)

    upsertRows.push({
      city,
      locality,
      property_type,
      median_price_sqft: Math.round(median * 100) / 100,
      stddev_price_sqft: Math.round(stddev * 100) / 100,
      sample_count: prices.length,
      computed_at: new Date().toISOString(),
    })
  }

  console.log(`Computed benchmarks for ${upsertRows.length} groups (with >= 10 listings each)`)

  if (upsertRows.length === 0) {
    console.log('No groups with sufficient data. Nothing to upsert.')
    return
  }

  // Upsert in batches of 100
  const BATCH_SIZE = 100
  let upserted = 0
  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const batch = upsertRows.slice(i, i + BATCH_SIZE)
    const { error: upsertErr } = await admin
      .from('locality_price_benchmarks')
      .upsert(batch, { onConflict: 'city,locality,property_type' })

    if (upsertErr) {
      console.error('Upsert error:', upsertErr.message)
    } else {
      upserted += batch.length
    }
  }

  console.log(`Done. Upserted ${upserted} benchmark rows.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
