import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// POST /api/upload/photo
// Accepts a multipart/form-data request with a single `file` field.
// Uploads to Supabase Storage using the service-role key (bypasses RLS).
// Returns { url: string }.
export async function POST(request: NextRequest) {
  // Auth check — must be logged in
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to upload photos.' }, { status: 401 })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to upload photos.' }, { status: 401 })
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.` },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: `File too large. Max size is 10MB.` }, { status: 400 })
  }

  // Use service-role client so Storage RLS doesn't block the upload
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Storage not configured. Paste an image URL instead.' },
      { status: 503 },
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const uuid = crypto.randomUUID()
  const path = `listings/${user.id}/${uuid}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await admin.storage.from('photos').upload(path, buffer, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) {
    console.error('[upload/photo] storage error:', uploadError.message)
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: publicUrlData } = admin.storage.from('photos').getPublicUrl(path)

  return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 201 })
}
