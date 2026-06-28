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

  const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 })
  }

  // Read buffer once for magic byte validation and upload
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  const magicOk =
    (file.type === 'image/jpeg' && isJpeg) ||
    (file.type === 'image/png' && isPng) ||
    (file.type === 'image/webp' && isWebp)
  if (!magicOk) {
    return NextResponse.json(
      { error: 'File content does not match declared type.' },
      { status: 400 },
    )
  }

  const uuid = crypto.randomUUID()
  const path = `listings/${user.id}/${uuid}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('photos')
    .upload(path, new Blob([buffer], { type: file.type }), {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    console.error('[upload/photo] storage error:', uploadError.message)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }

  const { data: publicUrlData } = admin.storage.from('photos').getPublicUrl(path)

  return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 201 })
}
