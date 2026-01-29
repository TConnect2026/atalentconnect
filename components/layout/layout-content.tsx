'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Don't show header on auth pages
  const hideHeader = pathname?.startsWith('/login') ||
                     pathname?.startsWith('/signup') ||
                     pathname?.startsWith('/forgot-password') ||
                     pathname?.startsWith('/auth/')

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  )
}
