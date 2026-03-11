'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-4">Something went wrong</h2>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg border border-ds-border bg-white text-navy hover:bg-bg-section transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
