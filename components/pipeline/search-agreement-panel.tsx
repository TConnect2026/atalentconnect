"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Upload, Loader2, FileText, Download, Trash2 } from "lucide-react"

interface SearchAgreementPanelProps {
  searchId: string
  firmId?: string
  onUpdate?: () => void
}

export function SearchAgreementPanel({ searchId, firmId, onUpdate }: SearchAgreementPanelProps) {
  const { profile } = useAuth()
  const [agreementDoc, setAgreementDoc] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [togglingPortal, setTogglingPortal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const togglePortalVisibility = async () => {
    if (!agreementDoc) return
    setTogglingPortal(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({ visible_to_portal: !agreementDoc.visible_to_portal })
        .eq('id', agreementDoc.id)
      if (error) throw error
      setAgreementDoc({ ...agreementDoc, visible_to_portal: !agreementDoc.visible_to_portal })
      onUpdate?.()
    } catch (err) {
      console.error('Toggle portal visibility error:', err)
    } finally {
      setTogglingPortal(false)
    }
  }

  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg']
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  // Load existing agreement document
  if (!isLoaded) {
    setIsLoaded(true)
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("search_id", searchId)
          .eq("type", "search_agreement")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setAgreementDoc(data)
        }
      } catch (err) {
        console.error("Error loading search agreement:", err)
      }
    })()
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setUploadError(`Unsupported file type: .${ext}. Allowed: ${ALLOWED_EXTENSIONS.map(e => `.${e}`).join(', ')}`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File "${file.name}" exceeds the 10MB size limit.`)
        return
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const filePath = `${firmId || 'unknown-firm'}/${searchId}/search-agreement/${fileName}`

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      if (agreementDoc) {
        await supabase.from('documents').delete().eq('id', agreementDoc.id)
      }

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          search_id: searchId,
          name: file.name,
          type: 'search_agreement',
          file_url: publicUrl,
          uploaded_by: profile?.id,
        })
        .select()
        .single()

      if (dbError) throw dbError

      setAgreementDoc(newDoc)
      onUpdate?.()
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!agreementDoc) return
    if (!confirm('Remove this search agreement?')) return

    const { error } = await supabase.from('documents').delete().eq('id', agreementDoc.id)
    if (!error) {
      setAgreementDoc(null)
      onUpdate?.()
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Current Document */}
      {agreementDoc ? (
        <div className="flex items-center justify-between p-4 bg-bg-page rounded-lg border border-ds-border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-navy" />
            <div>
              <p className="text-sm font-medium text-text-primary">{agreementDoc.name}</p>
              <p className="text-xs text-text-muted mt-0.5">Uploaded {new Date(agreementDoc.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={togglePortalVisibility}
              disabled={togglingPortal}
              className="flex items-center gap-1.5 group"
            >
              <span className="text-[10px] font-medium text-text-muted group-hover:text-text-secondary whitespace-nowrap">Client Portal</span>
              <div className={`relative w-7 h-4 rounded-full transition-colors ${agreementDoc.visible_to_portal ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${agreementDoc.visible_to_portal ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <div className="w-px h-4 bg-ds-border" />
            <Button variant="outline" size="sm" onClick={() => window.open(agreementDoc.file_url, '_blank')}>
              <Download className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted italic">No search agreement uploaded yet</p>
      )}

      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const files = Array.from(e.dataTransfer.files)
          if (files.length > 0) handleFileUpload(files[0])
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-orange bg-orange-50'
            : 'border-ds-border hover:border-ds-border'
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-text-muted" />
        <p className="text-sm font-medium text-text-primary mb-2">
          {agreementDoc ? 'Drag & drop to replace' : 'Drag & drop contract document here'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            agreementDoc ? 'Replace File' : 'Choose File'
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0])
              e.target.value = ''
            }
          }}
        />
        <p className="text-xs text-text-muted mt-2">
          Supported: PDF, DOCX, DOC, XLSX, XLS, PNG, JPG (max 10MB)
        </p>
      </div>

      {uploadError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {uploadError}
        </div>
      )}
    </div>
  )
}
