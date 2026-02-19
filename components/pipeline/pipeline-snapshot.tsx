"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PipelineSnapshotProps {
  searchId: string
  showOpenButton?: boolean
}

interface StageCounts {
  [stageId: string]: {
    name: string
    count: number
    order: number
  }
}

export function PipelineSnapshot({ searchId, showOpenButton = true }: PipelineSnapshotProps) {
  const router = useRouter()
  const [stageCounts, setStageCounts] = useState<StageCounts>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPipelineCounts()

    // Subscribe to changes
    const candidatesSubscription = supabase
      .channel(`candidates-${searchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidates',
          filter: `search_id=eq.${searchId}`
        },
        () => {
          loadPipelineCounts()
        }
      )
      .subscribe()

    return () => {
      candidatesSubscription.unsubscribe()
    }
  }, [searchId])

  const loadPipelineCounts = async () => {
    try {
      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .eq("visible_in_client_portal", true)
        .order("order", { ascending: true })

      if (stagesError) throw stagesError

      // Load active candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("stage_id")
        .eq("search_id", searchId)
        .eq("status", "active")

      if (candidatesError) throw candidatesError

      // Count candidates per stage
      const counts: StageCounts = {}

      stagesData?.forEach(stage => {
        const count = candidatesData?.filter(c => c.stage_id === stage.id).length || 0
        counts[stage.id] = {
          name: stage.name,
          count,
          order: stage.order
        }
      })

      setStageCounts(counts)
    } catch (error) {
      console.error("Error loading pipeline counts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTotalCandidates = () => {
    return Object.values(stageCounts).reduce((sum, stage) => sum + stage.count, 0)
  }

  const handleOpenPipeline = () => {
    router.push(`/searches/${searchId}/pipeline`)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Candidate Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={showOpenButton ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={showOpenButton ? handleOpenPipeline : undefined}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Candidate Pipeline</span>
          <span className="text-sm font-normal text-text-muted">
            {getTotalCandidates()} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(stageCounts)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([stageId, stage]) => (
              <div
                key={stageId}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-bg-section transition-colors"
              >
                <span className="text-sm text-text-primary">{stage.name}</span>
                <span className="text-sm font-semibold text-text-primary bg-bg-section px-2 py-1 rounded-full min-w-[2rem] text-center">
                  {stage.count}
                </span>
              </div>
            ))}
        </div>

        {showOpenButton && (
          <div className="mt-4 pt-4 border-t border-ds-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenPipeline()
              }}
            >
              Open Pipeline →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Component for pass-through metrics in Talent Insights
export function PipelineMetrics({ searchId }: { searchId: string }) {
  const [metrics, setMetrics] = useState({
    screened: 0,
    presented: 0,
    movingForward: 0,
    movingForwardPercentage: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMetrics()

    // Subscribe to changes
    const subscription = supabase
      .channel(`candidates-metrics-${searchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidates',
          filter: `search_id=eq.${searchId}`
        },
        () => {
          loadMetrics()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [searchId])

  const loadMetrics = async () => {
    try {
      // Get all stages for this search
      const { data: stagesData } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .order("order", { ascending: true })

      if (!stagesData || stagesData.length === 0) return

      // Get all candidates
      const { data: candidatesData } = await supabase
        .from("candidates")
        .select("stage_id, status")
        .eq("search_id", searchId)

      if (!candidatesData) return

      // Calculate metrics
      const totalScreened = candidatesData.length

      // Presented = candidates who made it past the first stage (typically "Sourcing")
      const firstStageId = stagesData[0]?.id
      const presented = candidatesData.filter(c =>
        c.stage_id !== firstStageId && c.status === 'active'
      ).length

      // Moving forward = active candidates in interview stages
      const movingForward = candidatesData.filter(c => c.status === 'active').length

      setMetrics({
        screened: totalScreened,
        presented,
        movingForward,
        movingForwardPercentage: presented > 0 ? Math.round((movingForward / presented) * 100) : 0
      })
    } catch (error) {
      console.error("Error loading metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading metrics...</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary">Screened:</span>
        <span className="text-sm font-semibold text-text-primary">{metrics.screened}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary">Presented:</span>
        <span className="text-sm font-semibold text-text-primary">{metrics.presented}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary">Moving forward:</span>
        <span className="text-sm font-semibold text-text-primary">
          {metrics.movingForward} ({metrics.movingForwardPercentage}%)
        </span>
      </div>
    </div>
  )
}
