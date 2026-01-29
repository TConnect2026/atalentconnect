"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface AddStageDialogProps {
  searchId: string
  currentStagesCount: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddStageDialog({ searchId, currentStagesCount, isOpen, onClose, onSuccess }: AddStageDialogProps) {
  const [stageName, setStageName] = useState("")
  const [visibleInClientPortal, setVisibleInClientPortal] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('stages')
        .insert({
          search_id: searchId,
          name: stageName,
          order: currentStagesCount,
          visible_in_client_portal: visibleInClientPortal
        })

      if (error) throw error

      // Reset form
      setStageName("")
      setVisibleInClientPortal(true)

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error adding stage:', err)
      alert('Failed to add stage')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Add Interview Stage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="stageName" className="text-gray-700">Stage Name *</Label>
            <Input
              id="stageName"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              required
              className="mt-1 bg-white text-gray-900"
              placeholder="e.g., Technical Interview, Final Round"
            />
            <p className="text-xs text-gray-500 mt-1">
              This stage will be added to the end of your pipeline
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="visibleInPortal"
              checked={visibleInClientPortal}
              onChange={(e) => setVisibleInClientPortal(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <Label htmlFor="visibleInPortal" className="text-gray-900 font-semibold cursor-pointer">
                Show in Client Portal
              </Label>
              <p className="text-xs text-gray-600 mt-1">
                Uncheck to hide this stage from clients (e.g., Recruiter Screen). The stage will still be tracked in your analytics and funnel data.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#0891B2] text-white hover:bg-[#DC2626] font-semibold"
            >
              {isSaving ? 'Adding...' : 'Add Stage'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
