import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
        <p className="text-text-muted mb-4">The page you're looking for doesn't exist.</p>
        <Link
          href="/searches"
          className="px-4 py-2 rounded-lg border border-ds-border bg-white text-navy hover:bg-bg-section transition-colors inline-block"
        >
          Go to Searches
        </Link>
      </div>
    </div>
  )
}
