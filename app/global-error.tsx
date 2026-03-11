'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Something went wrong</h2>
            <button
              onClick={() => reset()}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
