import { test, expect } from '@playwright/test'

test('debug - page errors and supabase requests', async ({ page }) => {
  const errors: string[] = []
  const supabaseReqs: string[] = []

  page.on('pageerror', (err) => errors.push(err.message.substring(0, 200)))
  page.on('request', (req) => {
    if (req.url().includes('supabase') && !req.url().includes('storage')) {
      supabaseReqs.push(req.method() + ' ' + req.url().substring(0, 100))
    }
  })
  page.on('response', async (resp) => {
    if (resp.url().includes('api/listings')) {
      console.log('API RESP:', resp.status(), resp.url().substring(0, 100))
    }
  })

  await page.goto('/')
  await page.waitForTimeout(6000)

  console.log('ERRORS:', JSON.stringify(errors.slice(0, 3)))
  console.log('SUPABASE_REQS:', JSON.stringify(supabaseReqs.slice(0, 5)))
})
