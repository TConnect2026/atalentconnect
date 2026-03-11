"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, X, ChevronDown } from "lucide-react"

export interface ScheduleDocOption {
  id: string
  name: string
  file_url: string
  type: string
}

interface ScheduleDateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (date: string, time: string, interviewerName: string, guideId: string | null) => void
  onSkip?: () => void
  stageName: string
  candidateName: string
  existingDate?: string | null
  existingTime?: string | null
  existingInterviewer?: string | null
  existingGuideId?: string | null
  searchDocuments?: ScheduleDocOption[]
  searchId?: string
  onGuideUploaded?: (doc: ScheduleDocOption) => void
}

export function ScheduleDateDialog({
  isOpen,
  onClose,
  onSchedule,
  onSkip,
  stageName,
  candidateName,
  existingDate,
  existingTime,
  existingInterviewer,
  existingGuideId,
  searchDocuments = [],
  searchId,
  onGuideUploaded,
}: ScheduleDateDialogProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [interviewerName, setInterviewerName] = useState('')
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)
  const [isUploadingGuide, setIsUploadingGuide] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const guideInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setDate(existingDate || '')
      setTime(existingTime || '')
      setInterviewerName(existingInterviewer || '')
      setSelectedGuideId(existingGuideId || null)
      setShowDropdown(false)
    }
  }, [isOpen, existingDate, existingTime, existingInterviewer, existingGuideId])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  const selectedDoc = searchDocuments.find(d => d.id === selectedGuideId)

  const handleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !searchId) return

    if (file.size > 25 * 1024 * 1024) {
      alert('File must be less than 25MB')
      return
    }

    setIsUploadingGuide(true)
    try {
      const ext = file.name.split('.').pop() || ''
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const filePath = `${searchId}/interview-guides/${fileName}`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'documents')
      formData.append('path', filePath)

      const uploadRes = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { publicUrl } = await uploadRes.json()

      // Save to documents table via API
      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: searchId,
          name: file.name,
          type: 'interview_guide',
          file_url: publicUrl,
        }),
      })
      if (!docRes.ok) throw new Error('Failed to save document')
      const newDoc = await docRes.json()

      const docOption: ScheduleDocOption = {
        id: newDoc.id,
        name: newDoc.name,
        file_url: newDoc.file_url,
        type: newDoc.type,
      }

      setSelectedGuideId(newDoc.id)
      onGuideUploaded?.(docOption)
    } catch (err) {
      console.error('Guide upload error:', err)
      alert('Failed to upload interview guide')
    } finally {
      setIsUploadingGuide(false)
      e.target.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    onSchedule(date, time, interviewerName, selectedGuideId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-navy">
            Schedule {stageName}
          </DialogTitle>
          <p className="text-sm text-text-muted mt-1">{candidateName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-navy">Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-navy">Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-navy">Interviewer</Label>
            <Input
              type="text"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="e.g. Sarah Jones"
              className="mt-1"
            />
          </div>

          {/* Interview Guide */}
          <div>
            <Label className="text-xs font-semibold text-navy">Interview Guide</Label>
            <p className="text-[11px] text-text-muted mb-1.5">Select an existing document or upload a new one</p>

            {selectedDoc ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-ds-border bg-bg-page">
                <FileText className="w-3.5 h-3.5 text-orange flex-shrink-0" />
                <a
                  href={selectedDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-navy hover:underline truncate flex-1"
                >
                  {selectedDoc.name}
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedGuideId(null)}
                  className="p-0.5 rounded hover:bg-bg-section text-text-muted hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Dropdown for existing docs */}
                <div className="relative flex-1" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-ds-border bg-white text-xs text-text-muted hover:border-navy/30 transition-colors"
                  >
                    <span>Select existing document...</span>
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                  </button>
                  {showDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-ds-border rounded-md shadow-lg max-h-[160px] overflow-y-auto">
                      {searchDocuments.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-text-muted italic">No documents uploaded yet</div>
                      ) : (
                        searchDocuments.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => {
                              setSelectedGuideId(doc.id)
                              setShowDropdown(false)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-section transition-colors"
                          >
                            <FileText className="w-3 h-3 text-text-muted flex-shrink-0" />
                            <span className="text-xs text-navy truncate">{doc.name}</span>
                            <span className="text-[10px] text-text-muted flex-shrink-0 capitalize">{doc.type.replace(/_/g, ' ')}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-navy border border-ds-border bg-white hover:bg-bg-section transition-colors flex-shrink-0">
                  <input
                    ref={guideInputRef}
                    type="file"
                    onChange={handleGuideUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                  />
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingGuide ? 'Uploading...' : 'Upload'}
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {onSkip && (
                <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="text-text-muted">
                  Skip
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!date} className="bg-navy text-white">
                Schedule
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
