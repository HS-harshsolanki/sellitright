import { Footer } from '@/components/layout/footer'
import { GlobalMessagesBubble } from '@/components/layout/global-messages-bubble'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <GlobalMessagesBubble />
    </>
  )
}
