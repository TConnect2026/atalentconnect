'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Check, X, Filter, ClipboardList, Globe } from 'lucide-react'
import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface SearchContextBarProps {
  searchId: string
  companyName: string
  positionTitle: string
  clientLogoUrl?: string | null
  launchDate?: string | null
  targetFillDate?: string | null
  status?: string | null
  activePage: 'pipeline' | 'search-details' | 'client-portal'
  onDatesUpdated?: () => void
}

export function SearchContextBar({
  searchId,
  companyName,
  positionTitle,
  clientLogoUrl,
  launchDate,
  targetFillDate,
  status,
  activePage,
  onDatesUpdated,
}: SearchContextBarProps) {
  const router = useRouter()

  // Date editing
  const [isEditingDates, setIsEditingDates] = useState(false)
  const [editLaunchDate, setEditLaunchDate] = useState('')
  const [editTargetClose, setEditTargetClose] = useState('')
  const [isSavingDates, setIsSavingDates] = useState(false)

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const startEditingDates = () => {
    setEditLaunchDate(launchDate || '')
    setEditTargetClose(targetFillDate || '')
    setIsEditingDates(true)
  }

  const saveDates = async () => {
    setIsSavingDates(true)
    try {
      const { error } = await supabase
        .from('searches')
        .update({
          launch_date: editLaunchDate || null,
          target_fill_date: editTargetClose || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', searchId)
      if (error) throw error
      setIsEditingDates(false)
      onDatesUpdated?.()
    } catch (err) {
      console.error('Error saving dates:', err)
      alert('Failed to save dates')
    } finally {
      setIsSavingDates(false)
    }
  }

  const tabs: { id: typeof activePage; label: string; href: string; icon: ReactNode }[] = [
    { id: 'pipeline', label: 'Candidate Pipeline', href: `/searches/${searchId}/candidates`, icon: <Filter className="w-3.5 h-3.5" /> },
    { id: 'search-details', label: 'Search Details', href: `/searches/${searchId}/pipeline`, icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'client-portal', label: 'Client Portal', href: `/searches/${searchId}/portal`, icon: <Globe className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="bg-white border-b-2 border-ds-border">
      <div className="px-6 py-2 flex items-center gap-4">
        {/* Back to Searches */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/searches')}
          className="text-text-secondary hover:text-text-primary flex-shrink-0 -ml-2 h-8"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="text-sm">Searches</span>
        </Button>

        <div className="h-5 w-px bg-ds-border flex-shrink-0" />

        {/* Company logo + info + dates */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {clientLogoUrl && (
            <img
              src={clientLogoUrl}
              alt={companyName}
              className="h-7 max-w-[100px] object-contain flex-shrink-0"
            />
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-navy text-sm whitespace-nowrap">{companyName}</span>
            <span className="text-navy text-xs">—</span>
            <span className="font-bold text-navy text-sm truncate">{positionTitle}</span>
          </div>

          <div className="h-4 w-px bg-ds-border flex-shrink-0 ml-1" />

          {/* Dates */}
          {isEditingDates ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="flex items-center gap-1 text-xs">
                <span className="font-medium text-text-primary">Launch:</span>
                <input
                  type="date"
                  value={editLaunchDate}
                  onChange={(e) => setEditLaunchDate(e.target.value)}
                  className="px-1.5 py-0.5 border border-ds-border rounded text-xs text-black bg-white"
                />
              </label>
              <label className="flex items-center gap-1 text-xs">
                <span className="font-medium text-text-primary">Target:</span>
                <input
                  type="date"
                  value={editTargetClose}
                  onChange={(e) => setEditTargetClose(e.target.value)}
                  className="px-1.5 py-0.5 border border-ds-border rounded text-xs text-black bg-white"
                />
              </label>
              <button
                onClick={saveDates}
                disabled={isSavingDates}
                className="p-0.5 rounded hover:bg-green-50 text-green-600"
                title="Save dates"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditingDates(false)}
                className="p-0.5 rounded hover:bg-red-50 text-red-500"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-navy">
                <span className="font-semibold">Launch:</span>{' '}
                {launchDate ? formatDate(launchDate) : '—'}
              </span>
              <span className="text-navy/40 mx-1.5">|</span>
              <span className="text-xs text-navy">
                <span className="font-semibold">Target:</span>{' '}
                {targetFillDate ? formatDate(targetFillDate) : '—'}
              </span>
              {status === 'on_hold' && (
                <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange/15 text-orange">
                  On Hold
                </span>
              )}
              {status === 'filled' && (
                <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                  Filled
                </span>
              )}
              <button
                onClick={startEditingDates}
                className="p-0.5 ml-0.5 rounded hover:bg-bg-section text-text-muted hover:text-text-primary"
                title="Edit dates"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation tabs — hide current page */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {tabs.filter((tab) => tab.id !== activePage).map((tab) => (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md border-2 border-gray-400 bg-white text-navy hover:border-navy hover:bg-bg-section transition-colors shadow-sm"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
