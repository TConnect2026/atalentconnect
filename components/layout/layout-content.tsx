'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from './header'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile } = useAuth()

  // Don't show header on auth pages, client portal, or portal preview
  const hideHeader = pathname?.startsWith('/login') ||
                     pathname?.startsWith('/signup') ||
                     pathname?.startsWith('/forgot-password') ||
                     pathname?.startsWith('/auth/') ||
                     pathname?.startsWith('/client/') ||
                     /^\/searches\/[^/]+\/portal/.test(pathname || '')

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  )
}
