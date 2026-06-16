"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { useAuth } from "@/lib/auth-context"
import { FileText, MoreVertical, Eye, Replace, Trash2, Loader2, UploadCloud } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

const supabase = createClient()

type SpecDoc = { id: string; name: string; file_url: string }

export default function JdPage() {
  const params = useParams()
  const searchId = params.id as string
  const { profile } = useAuth()

  const [firmId, setFirmId] = useState<string | null>(null)
  const [positionSpecDoc, setPositionSpecDoc] = useState<SpecDoc | null>(null)
  const [isUploadingSpec, setIsUploadingSpec] = useState(false)
  const [specUploadError, setSpecUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const specFileInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    const [{ data: searchRow }, { data: docRows }] = await Promise.all([
      supabase.from('searches').select('firm_id').eq('id', searchId).single(),
      supabase
        .from('documents')
        .select('id, name, file_url')
        .eq('search_id', searchId)
        .eq('type', 'position_spec')
        .order('created_at', { ascending: false })
        .limit(1),
    ])
    setFirmId((searchRow as { firm_id?: string } | null)?.firm_id ?? null)
    if (Array.isArray(docRows) && docRows.length > 0) setPositionSpecDoc(docRows[0] as SpecDoc)
  }, [searchId])

  useEffect(() => { load() }, [load])

  const handleSpecUpload = async (file: File) => {
    setSpecUploadError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setSpecUploadError(`Unsupported type: .${ext}. Use PDF, DOCX, or DOC.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setSpecUploadError('File too large (max 10MB)')
      return
    }
    setIsUploadingSpec(true)
    try {
      const storedName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const fId = firmId || profile?.firm_id || 'unknown-firm'
      const filePath = `${fId}/${searchId}/position-spec/${storedName}`
      const { error: storageErr } = await supabase.storage.from('documents').upload(filePath, file)
      if (storageErr) throw new Error(storageErr.message || 'Storage upload failed')
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_id: searchId, name: file.name, type: 'position_spec', file_url: publicUrl }),
      })
      const row = await res.json()
      if (!res.ok) throw new Error(row?.error || 'Failed to record document')
      setPositionSpecDoc({ id: row.id, name: file.name, file_url: publicUrl })
    } catch (err: any) {
      setSpecUploadError(err?.message || 'Upload failed')
    } finally {
      setIsUploadingSpec(false)
    }
  }

  const handleSpecDelete = async () => {
    if (!positionSpecDoc) return
    if (!confirm(`Delete position spec "${positionSpecDoc.name}"?`)) return
    const prev = positionSpecDoc
    setPositionSpecDoc(null)
    const { error } = await supabase.from('documents').delete().eq('id', prev.id)
    if (error) {
      console.error('Error deleting position spec:', error)
      setPositionSpecDoc(prev)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-navy">Job Description</h1>

      {/* Hidden input shared by the empty-state target and the Replace action. */}
      <input
        ref={specFileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) await handleSpecUpload(file)
          e.target.value = ''
        }}
      />

      <div className="mt-5">
        {positionSpecDoc ? (
          // Uploaded: doc link + View / Replace / Delete menu.
          <div className="flex items-start gap-3 p-5 rounded-md border border-ds-border bg-white">
            <FileText className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-navy">Job Description</h3>
              <a
                href={positionSpecDoc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-black hover:text-navy hover:underline mt-1 inline-block truncate max-w-full"
              >
                {positionSpecDoc.name}
              </a>
              {specUploadError && <p className="text-xs text-red-600 mt-1">{specUploadError}</p>}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="JD actions"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-navy hover:bg-bg-section transition-colors self-center"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px] z-50 shadow-lg">
                <DropdownMenuItem onSelect={() => window.open(positionSpecDoc.file_url, '_blank', 'noopener,noreferrer')} className="text-sm cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => specFileInputRef.current?.click()} className="text-sm cursor-pointer">
                  <Replace className="w-4 h-4 mr-2" /> Replace
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleSpecDelete} className="text-sm cursor-pointer text-red-600 focus:text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          // Empty state: the whole area is an unmistakable click + drop target.
          <button
            type="button"
            onClick={() => specFileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault()
              setIsDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) await handleSpecUpload(file)
            }}
            disabled={isUploadingSpec}
            className={`w-full flex flex-col items-center justify-center gap-2 px-6 py-12 rounded-md border-2 border-dashed text-center transition-colors disabled:opacity-60 ${
              isDragOver ? 'border-navy bg-navy/5' : 'border-ds-border hover:border-navy/50 hover:bg-bg-section'
            }`}
          >
            {isUploadingSpec ? (
              <Loader2 className="w-8 h-8 text-navy animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-navy" />
            )}
            <span className="text-sm font-semibold text-navy">
              {isUploadingSpec ? 'Uploading…' : 'Upload the job description'}
            </span>
            <span className="text-xs text-text-muted">
              Click to browse or drag a file here · PDF, DOCX, DOC (max 10MB)
            </span>
            {specUploadError && <span className="text-xs text-red-600">{specUploadError}</span>}
          </button>
        )}
      </div>
    </div>
  )
}
