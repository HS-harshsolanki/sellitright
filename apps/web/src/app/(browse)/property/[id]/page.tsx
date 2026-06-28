import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PropertyRedirectPage({ params }: Props) {
  const { id } = await params
  redirect(`/listing/${id}`)
}
