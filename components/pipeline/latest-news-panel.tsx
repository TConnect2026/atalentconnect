"use client"

import { useState } from "react"
import { Loader2, Newspaper, RefreshCw, ExternalLink, X } from "lucide-react"

interface NewsItem {
  title: string
  source: string
  date: string
  summary: string
  url: string
}

interface LatestNewsPanelProps {
  searchId: string
  search: any
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export function LatestNewsPanel({ searchId, search, isOpen, onClose, onUpdate }: LatestNewsPanelProps) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>(
    Array.isArray(search?.company_news) ? search.company_news : []
  )
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [newsError, setNewsError] = useState<string | null>(null)

  const hasNews = newsItems.length > 0

  const fetchLatestNews = async () => {
    setIsLoadingNews(true)
    setNewsError(null)
    try {
      const res = await fetch('/api/company-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId, companyName: search?.company_name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch news')
      setNewsItems(Array.isArray(data.news) ? data.news : [])
      onUpdate?.()
    } catch (err: any) {
      setNewsError(err?.message || 'Failed to fetch news')
    } finally {
      setIsLoadingNews(false)
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Panel */}
      <aside
        className={`absolute right-0 top-0 bottom-0 w-[45%] min-w-[420px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Latest News"
      >
        <header className="px-6 py-4 bg-navy flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-white" />
            Latest News
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {newsError && (
            <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {newsError}
            </div>
          )}

          {!hasNews && isLoadingNews && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="w-8 h-8 animate-spin text-navy" />
              <p className="text-sm text-text-muted">Fetching latest news...</p>
            </div>
          )}

          {!hasNews && !isLoadingNews && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <p className="text-sm text-text-muted">No news fetched yet.</p>
              <button
                type="button"
                onClick={fetchLatestNews}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors"
              >
                <Newspaper className="w-4 h-4" />
                Get Latest News
              </button>
            </div>
          )}

          {hasNews && (
            <ul className="space-y-2">
              {newsItems.map((item, i) => (
                <li
                  key={i}
                  className="border border-ds-border rounded-md bg-bg-page hover:bg-white transition-colors"
                >
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-bold text-navy leading-snug">{item.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {[item.source, item.date].filter(Boolean).join(' · ')}
                    </p>
                    {item.summary && (
                      <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline mt-1.5"
                      >
                        Read more
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasNews && (
          <div className="flex-shrink-0 border-t border-ds-border p-4 flex justify-center bg-white">
            <button
              type="button"
              onClick={fetchLatestNews}
              disabled={isLoadingNews}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-navy border-2 border-navy bg-white hover:bg-navy hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingNews ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh News
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
