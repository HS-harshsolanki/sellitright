import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {/* pb-24 on mobile covers h-16 nav + safe-area inset (up to ~34px on iPhone X) */}
      <main className="min-h-screen pb-24 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  )
}
