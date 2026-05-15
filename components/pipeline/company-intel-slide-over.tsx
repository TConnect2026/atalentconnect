'use client'

// Thin slide-over wrapper around CompanyDetailsPanel. The panel itself
// owns its loading, editing, and Latest News behavior — this just provides
// the slide-in shell, backdrop, and Escape/close handling.

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { CompanyDetailsPanel } from '@/components/pipeline/company-details-panel'

const supabase = createClient()

interface CompanyIntelSlideOverProps {
  isOpen: boolean
  onClose: () => void
  searchId: string
  onUpdate?: () => void
}

export function CompanyIntelSlideOver({ isOpen, onClose, searchId, onUpdate }: CompanyIntelSlideOverProps) {
  const [search, setSearch] = useState<any>(null)

  useEffect(() => {
    if (!isOpen || !searchId) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('searches').select('*').eq('id', searchId).single()
      if (!cancelled && data) setSearch(data)
    })()
    return () => { cancelled = true }
  }, [isOpen, searchId])

  // Global Escape close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-label="Company Intel"
        className={`absolute right-0 top-0 bottom-0 w-[68%] min-w-[480px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="px-6 py-4 bg-navy flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-xl font-bold text-white">Company Intel</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {isOpen && search && (
            <CompanyDetailsPanel
              searchId={searchId}
              search={search}
              hideOwnHeader
              onUpdate={async () => {
                const { data } = await supabase.from('searches').select('*').eq('id', searchId).single()
                if (data) setSearch(data)
                onUpdate?.()
              }}
            />
          )}
        </div>
      </aside>
    </div>
  )
}
