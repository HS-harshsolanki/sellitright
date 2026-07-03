import { redirect } from 'next/navigation'

// /register and /login both use the same Google OAuth flow.
// Redirect to /login to avoid a confusing two-page split.
export default function RegisterPage() {
  redirect('/login')
}
