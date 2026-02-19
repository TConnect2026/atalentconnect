"use client"

import { useState, useEffect, useRef } from "react"
import { Stage, Document } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface StageColumnHeaderProps {
  stage: Stage
  searchId: string
  readOnly?: boolean
  onStageUpdated: () => void
}

export function StageColumnHeader({
  stage,
  searchId,
  readOnly = false,
  onStageUpdated
}: StageColumnHeaderProps) {
  const [showGuidesDropdown, setShowGuidesDropdown] = useState(false)
  const [guides, setGuides] = useState<Array<{ name: string; url: string }>>([])
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [newStageName, setNewStageName] = useState(stage.name)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadGuides()
  }, [stage.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowGuidesDropdown(false)
      }
    }

    if (showGuidesDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showGuidesDropdown])

  const loadGuides = async () => {
    const guidesList: Array<{ name: string; url: string }> = []

    // Add stage's direct interview guide
    if (stage.interview_guide_url) {
      guidesList.push({
        name: `${stage.name} Guide`,
        url: stage.interview_guide_url
      })
    }

    // Add interview guide documents for this stage
    const { data: documentsData } = await supabase
      .from("documents")
      .select("*")
      .eq("search_id", searchId)
      .eq("type", "interview_guide")

    if (documentsData) {
      documentsData.forEach((doc) => {
        guidesList.push({
          name: doc.name,
          url: doc.file_url
        })
      })
    }

    setGuides(guidesList)
  }

  const handleRename = async () => {
    if (!newStageName.trim()) {
      alert("Stage name cannot be empty")
      return
    }

    try {
      const { error } = await supabase
        .from("stages")
        .update({ name: newStageName.trim() })
        .eq("id", stage.id)

      if (error) throw error

      setShowRenameDialog(false)
      onStageUpdated()
    } catch (error) {
      console.error("Error renaming stage:", error)
      alert("Failed to rename stage")
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete the "${stage.name}" stage? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from("stages")
        .delete()
        .eq("id", stage.id)

      if (error) throw error

      onStageUpdated()
    } catch (error) {
      console.error("Error deleting stage:", error)
      alert("Failed to delete stage")
    }
  }

  const handleToggleVisibility = async () => {
    try {
      const { error } = await supabase
        .from("stages")
        .update({ visible_in_client_portal: !stage.visible_in_client_portal })
        .eq("id", stage.id)

      if (error) throw error

      onStageUpdated()
    } catch (error) {
      console.error("Error updating visibility:", error)
      alert("Failed to update visibility")
    }
  }

  return (
    <th className="px-4 py-3 text-center border-r border-ds-border min-w-[140px] relative">
      <div className="flex items-center justify-center gap-2">
        {/* Stage Name with Management Dropdown */}
        {!readOnly ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="font-semibold text-text-primary hover:text-navy transition-colors">
                {stage.name}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                ✏️ Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleVisibility}>
                {stage.visible_in_client_portal ? '👁️ Hide from Portal' : '👁️ Show in Portal'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowManageDialog(true)}>
                📋 Manage Guides
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                🗑️ Delete Stage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="font-semibold text-text-primary">{stage.name}</span>
        )}

        {/* Interview Guides Icon */}
        {guides.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowGuidesDropdown(!showGuidesDropdown)
              }}
              className="text-lg hover:scale-110 transition-transform"
              title="View interview guides"
            >
              📋
            </button>

            {/* Guides Dropdown */}
            {showGuidesDropdown && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-lg shadow-xl border-2 border-ds-border py-2 z-50">
                <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-ds-border">
                  Interview Guides
                </div>
                {guides.map((guide, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      window.open(guide.url, '_blank')
                      setShowGuidesDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-bg-section text-text-primary text-sm flex items-center justify-between"
                  >
                    <span>{guide.name}</span>
                    <span className="text-navy text-xs">View →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Stage</DialogTitle>
            <DialogDescription>
              Enter a new name for this stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Stage name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename()
                }
              }}
            />
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename} className="bg-orange hover:opacity-90">
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Guides Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Interview Guides</DialogTitle>
            <DialogDescription>
              Add or remove interview guides for {stage.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Stage Direct Guide */}
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Stage Interview Guide URL
              </label>
              <Input
                value={stage.interview_guide_url || ''}
                onChange={async (e) => {
                  const { error } = await supabase
                    .from("stages")
                    .update({ interview_guide_url: e.target.value })
                    .eq("id", stage.id)

                  if (error) {
                    console.error("Error updating guide URL:", error)
                    return
                  }

                  loadGuides()
                  onStageUpdated()
                }}
                placeholder="https://..."
              />
            </div>

            <div className="pt-4">
              <p className="text-sm text-text-muted">
                Additional guides can be uploaded via the Documents section
              </p>
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={() => setShowManageDialog(false)} className="bg-orange hover:opacity-90 text-white">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </th>
  )
}
