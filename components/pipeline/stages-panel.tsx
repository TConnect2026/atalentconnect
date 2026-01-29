"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AddStageDialog } from "@/components/searches/add-stage-dialog"
import { supabase } from "@/lib/supabase"
import { Trash2, GripVertical, Video, Phone, Building2, Eye, EyeOff } from "lucide-react"

interface StagesPanelProps {
  searchId: string
  stages: any[]
  onUpdate: () => void
}

export function StagesPanel({ searchId, stages, onUpdate }: StagesPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleDelete = async (stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', stageId)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Error deleting stage:', err)
      alert('Failed to delete stage')
    }
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
    onUpdate()
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'video':
        return <Video className="w-3.5 h-3.5" />
      case 'phone':
        return <Phone className="w-3.5 h-3.5" />
      case 'in-person':
        return <Building2 className="w-3.5 h-3.5" />
      default:
        return null
    }
  }

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'video':
        return 'Video'
      case 'phone':
        return 'Phone'
      case 'in-person':
        return 'In-Person'
      default:
        return format
    }
  }

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {/* Add Stage Button */}
      <Button
        onClick={() => setIsAddDialogOpen(true)}
        size="sm"
        className="w-full text-white font-semibold"
        style={{ backgroundColor: '#1F3C62' }}
      >
        + Add Stage
      </Button>

      {/* Stages List */}
      {stages.length === 0 ? (
        <div className="py-6 text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-gray-500">No stages yet</p>
          <p className="text-xs text-gray-400 mt-1">Add interview stages to build your pipeline</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-2">
                {/* Drag Handle (optional for Phase 1) */}
                <div className="flex-shrink-0 pt-1 cursor-move text-gray-400 hover:text-gray-600">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Stage Info */}
                <div className="flex-1 min-w-0">
                  {/* Stage Name and Order */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {stage.name}
                    </h4>
                  </div>

                  {/* Format and Visibility */}
                  <div className="flex items-center gap-2 mt-2">
                    {stage.format && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        {getFormatIcon(stage.format)}
                        <span>{getFormatLabel(stage.format)}</span>
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                        stage.visible_to_client
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {stage.visible_to_client ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hidden</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    title="Delete stage"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      {stages.length > 0 && (
        <div className="pt-2 text-xs text-gray-500 text-center">
          Drag to reorder stages
        </div>
      )}

      {/* Add Stage Dialog */}
      <AddStageDialog
        isOpen={isAddDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogClose}
        searchId={searchId}
        currentStagesCount={stages.length}
      />
    </div>
  )
}
