import { createClient } from '@/lib/supabase/server'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { EditListingForm } from './edit-listing-form'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Listing — SellItRight',
}

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditPageProps) {
  const { id } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    redirect(`/login?next=/dashboard/listings/${id}/edit`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/dashboard/listings/${id}/edit`)
  }

  const { data: row } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!row) {
    redirect('/dashboard')
  }

  const status: string = row.status as string
  if (status === 'ACTIVE' || status === 'SOLD') {
    redirect('/dashboard')
  }

  const listing = mapSupabaseListingToMock(row)

  return <EditListingForm listing={listing} />
}
