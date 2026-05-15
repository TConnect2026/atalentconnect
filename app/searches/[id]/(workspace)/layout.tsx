"use client"

// Workspace layout: persistent header + left nav for the internal search
// workspace. Routes outside this group (/portal, /playbook, candidate
// detail) keep their own chrome.

import { useEffect, useState, useCallback } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase-client"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, ClipboardList, Globe, Search, Users } from "lucide-react"

const supabase = createClient()

interface SearchHeaderData {
  id: string
  company_name: string | null
  position_title: string | null
  launch_date: string | null
  target_fill_date: string | null
  lead_recruiter_id: string | null
  company_website: string | null
}


function fmtDate(s: string | null): string {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    try { return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return s }
  }
  return s
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const { profile } = useAuth()
  const searchId = params?.id as string

  const [search, setSearch] = useState<SearchHeaderData | null>(null)
  const [teamNames, setTeamNames] = useState<string[]>([])

  const loadHeader = useCallback(async () => {
    if (!searchId) return
    const [{ data: searchData }, { data: members }] = await Promise.all([
      supabase
        .from('searches')
        .select('id, company_name, position_title, launch_date, target_fill_date, lead_recruiter_id, company_website')
        .eq('id', searchId)
        .single(),
      supabase
        .from('search_team_members')
        .select('id, profiles:user_id(first_name, last_name)')
        .eq('search_id', searchId)
        .order('created_at', { ascending: true }),
    ])
    if (searchData) setSearch(searchData as SearchHeaderData)

    const names = (members || [])
      .map((m: any) => {
        const p = m?.profiles
        if (!p) return ''
        return [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
      })
      .filter(Boolean)
    setTeamNames(names)
  }, [searchId])

  useEffect(() => { loadHeader() }, [loadHeader])

  // If no team rows but we know the current user, fall back to their name.
  const displayTeamNames = teamNames.length > 0
    ? teamNames
    : (profile ? [[profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()].filter(Boolean) : [])

  const base = `/searches/${searchId}`
  const isActive = (suffix: string) => {
    if (suffix === '') return pathname === base
    return pathname === `${base}${suffix}`
  }

  const isSearchDetailsActive = isActive('')

  // (Scroll-spy / sub-anchor observer removed — the nav no longer surfaces
  // per-card anchor links.)

  // Candidate Pipeline stays a filled-navy button — the only filled
  // element in the nav. Section sub-items are plain text + icon links;
  // color + weight signal active/inactive (no borders, bg, or bar).
  const filledBtn =
    "flex w-full items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-navy hover:bg-navy/90 transition-colors"
  const sectionLabelCls =
    "px-1 mb-1.5 text-sm font-semibold uppercase tracking-wider text-gray-500"
  const subItemCls = (active: boolean) =>
    `flex items-center gap-2 px-2 py-1 text-sm transition-colors ${
      active ? 'text-navy font-bold' : 'text-gray-500 font-normal hover:text-navy'
    }`

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">

      {/* ═══ Persistent header ═══ */}
      <header className="flex-shrink-0 bg-white border-b border-ds-border">
        <div className="px-4 sm:px-6 pt-3 pb-4">
          {/* Back link */}
          <Link
            href="/searches"
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Searches
          </Link>

          <div className="mt-1 flex items-center gap-6">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-xl sm:text-2xl font-bold text-navy truncate">
                {search?.company_name || '…'}
                {search?.company_name && search?.position_title && <span className="text-text-secondary"> — </span>}
                {search?.position_title || ''}
              </h1>
              <p className="text-xs text-text-muted mt-1">
                {search?.launch_date ? <>Launch: <span className="text-text-secondary">{fmtDate(search.launch_date)}</span></> : <span>Not launched</span>}
                {search?.target_fill_date && <> &nbsp;·&nbsp; Target: <span className="text-text-secondary">{fmtDate(search.target_fill_date)}</span></>}
                {displayTeamNames.length > 0 && <> &nbsp;·&nbsp; Search Team: <span className="text-text-secondary">{displayTeamNames.join(', ')}</span></>}
              </p>
            </div>

            {/* Client Portal — outlined, sized to match title height */}
            <Link
              href={`/searches/${searchId}/portal`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-base font-semibold text-navy border-2 border-navy bg-transparent hover:bg-navy hover:text-white transition-colors self-start"
            >
              <Globe className="w-4 h-4" />
              Client Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ Left nav + content ═══ */}
      <div className="flex-1 flex min-h-0">
        <aside className="w-56 flex-shrink-0 border-r border-ds-border bg-white px-3 py-4 overflow-y-auto">

          {/* Candidate Pipeline — primary filled button */}
          <Link
            href={`/searches/${searchId}/pipeline`}
            className={filledBtn}
          >
            <Users className="w-4 h-4" />
            Candidate Pipeline
          </Link>

          {/* Hard dark separator — extra top margin gives Candidate
              Pipeline more breathing room below it. */}
          <hr className="mt-5 border-t-2 border-gray-400" />

          {/* SEARCH DETAILS — quiet group label + text+icon sub-items */}
          <div className="mt-3">
            <div className={sectionLabelCls}>Search Details</div>
            <div className="space-y-0.5">
              <Link href={base} className={subItemCls(isSearchDetailsActive)}>
                <ClipboardList className="w-4 h-4" />
                Essentials
              </Link>
              <Link href={`${base}/interview-plan`} className={subItemCls(isActive('/interview-plan'))}>
                <Users className="w-4 h-4" />
                Interview Plan
              </Link>
            </div>
          </div>

          {/* Hard dark separator */}
          <hr className="mt-3 border-t-2 border-gray-400" />

          {/* RESEARCH — quiet group label + text+icon sub-items */}
          <div className="mt-3">
            <div className={sectionLabelCls}>Research</div>
            <div className="space-y-0.5">
              <Link href={`${base}/company-intel`} className={subItemCls(isActive('/company-intel'))}>
                <Search className="w-4 h-4" />
                Company Intel
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
