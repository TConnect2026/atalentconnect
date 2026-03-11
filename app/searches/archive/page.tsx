"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Search } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ArchivePage() {
  const router = useRouter()
  const [searches, setSearches] = useState<Search[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadClosedSearches()
  }, [])

  const loadClosedSearches = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSearches(data || [])
    } catch (err) {
      console.error("Error loading closed searches:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading closed searches...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/searches')}
            className="mb-4 -ml-2 text-foreground hover:text-foreground/80"
          >
            ← Back to Active Searches
          </Button>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Closed Searches
          </h1>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="border-b-4 border-[#1F3C62]"></div>
        </div>

        {searches.length === 0 ? (
          <Card className="project-card border-ds-border bg-white">
            <CardContent className="py-12 sm:py-16 px-4 sm:px-6">
              <div className="text-center">
                <div className="mb-4 text-5xl sm:text-6xl">✓</div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-navy">No closed searches</h3>
                <p className="text-base sm:text-lg mb-4 sm:mb-6 text-text-secondary">
                  Completed searches will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {searches.map((search) => (
              <div
                key={search.id}
                className="project-card cursor-pointer transition-all duration-200 rounded-lg"
                onClick={() => router.push(`/searches/${search.id}`)}
              >
                <Card className="border-ds-border bg-white touch-manipulation h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-3">
                        <CardTitle className="text-xl font-bold leading-tight pb-2 mb-2 border-b-2 border-[#1F3C62] inline-block text-navy">
                          {search.position_title}
                        </CardTitle>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-navy/10 text-navy border-navy/20 flex-shrink-0">
                        completed
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {search.client_logo_url && (
                        <img
                          src={search.client_logo_url}
                          alt={`${search.company_name} logo`}
                          className="h-8 w-auto object-contain"
                        />
                      )}
                      <CardDescription className="text-base font-medium text-text-secondary">
                        {search.company_name}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {search.launch_date && (
                        <div className="py-3 border-t border-ds-border">
                          <p className="text-xs text-text-muted">Completed</p>
                          <p className="font-medium mt-0.5 text-navy">
                            {new Date(search.launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
