"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { FileText, Trash2, Download, ExternalLink, Upload, RefreshCw, Link as LinkIcon, Loader2, Pencil, BookOpen, FolderOpen } from "lucide-react"

interface DocumentsPanelProps {
  searchId: string
  documents: any[]
  search: any
  onUpdate: () => void
}

export function DocumentsPanel({ searchId, documents, search, onUpdate }: DocumentsPanelProps) {
  const { user, profile } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [newLink, setNewLink] = useState({ name: '', url: '' })
  const [isAddingLink, setIsAddingLink] = useState(false)

  // Portal visibility toggle
  const [togglingPortalId, setTogglingPortalId] = useState<string | null>(null)
  const [portalOverrides, setPortalOverrides] = useState<Record<string, boolean>>({})

  const getPortalVisibility = (doc: { id: string; visible_to_portal?: boolean }): boolean => {
    if (doc.id in portalOverrides) return portalOverrides[doc.id]
    return !!doc.visible_to_portal
  }

  const togglePortalVisibility = async (docId: string, currentValue: boolean) => {
    const next = !currentValue
    setTogglingPortalId(docId)
    setPortalOverrides((prev) => ({ ...prev, [docId]: next }))
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({ visible_to_portal: next })
        .eq('id', docId)
        .select('id, visible_to_portal')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Update returned no rows — likely blocked by row-level security. You need edit access on this search.')
      }
      onUpdate()
    } catch (err: unknown) {
      // Revert optimistic toggle
      setPortalOverrides((prev) => ({ ...prev, [docId]: currentValue }))
      console.error('Toggle portal visibility error:', err)
      const e = err as { message?: string; code?: string; details?: string; hint?: string } | null
      const parts = [
        e?.message,
        e?.code ? `(code ${e.code})` : null,
        e?.details,
        e?.hint,
      ].filter(Boolean)
      const msg = parts.length > 0
        ? parts.join(' — ')
        : (() => { try { return JSON.stringify(err) } catch { return String(err) } })()
      alert(`Could not update portal visibility: ${msg}`)
    } finally {
      setTogglingPortalId(null)
    }
  }

  // Position Spec state
  const [positionSpecDoc, setPositionSpecDoc] = useState<any>(null)
  const [positionSpecStatus, setPositionSpecStatus] = useState<'draft' | 'client_review' | 'approved'>(search?.position_spec_status || 'draft')
  const [editingPositionSpec, setEditingPositionSpec] = useState(false)
  const [isUploadingSpec, setIsUploadingSpec] = useState(false)
  const [specUploadError, setSpecUploadError] = useState<string | null>(null)
  const [isSavingSpec, setIsSavingSpec] = useState(false)
  const specFileInputRef = useRef<HTMLInputElement>(null)

  // Load position spec document (refresh when documents prop changes)
  useEffect(() => {
    const loadPositionSpec = async () => {
      if (!searchId) return
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("search_id", searchId)
          .eq("type", "position_spec")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setPositionSpecDoc(data)
        }
      } catch (err) {
        console.error("Error loading position spec:", err)
      }
    }
    loadPositionSpec()
  }, [searchId, documents])

  const ALLOWED_SPEC_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg']
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  const handleSpecFileUpload = async (file: File) => {
    setIsUploadingSpec(true)
    setSpecUploadError(null)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!ALLOWED_SPEC_EXTENSIONS.includes(ext)) {
        setSpecUploadError(`Unsupported file type: .${ext}`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setSpecUploadError(`File exceeds the 10MB size limit.`)
        return
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const firmId = search?.firm_id || 'unknown-firm'
      const filePath = `${firmId}/${searchId}/position-spec/${fileName}`

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message || JSON.stringify(storageError)}`)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      if (positionSpecDoc) {
        await supabase.from('documents').delete().eq('id', positionSpecDoc.id)
      }

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          search_id: searchId,
          name: file.name,
          type: 'position_spec',
          file_url: publicUrl,
          uploaded_by: profile?.id,
        })
        .select()
        .single()

      if (dbError) {
        throw new Error(`DB insert failed: ${dbError.message || JSON.stringify(dbError)}`)
      }

      setPositionSpecDoc(newDoc)
    } catch (err: any) {
      console.error('Upload error:', err)
      const errorMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'Unknown upload error'
      setSpecUploadError(errorMsg)
    } finally {
      setIsUploadingSpec(false)
    }
  }

  const savePositionSpec = async () => {
    setIsSavingSpec(true)
    try {
      const { error } = await supabase
        .from("searches")
        .update({
          position_spec_status: positionSpecStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", searchId)

      if (error) throw error
      setEditingPositionSpec(false)
      onUpdate()
    } catch (err) {
      console.error("Error saving position spec:", err)
    } finally {
      setIsSavingSpec(false)
    }
  }

  const getSpecStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'client_review': return 'Client Review'
      case 'approved': return 'Approved'
      default: return 'Draft'
    }
  }

  const getSpecStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      case 'client_review': return 'bg-orange-100 text-orange-800 border border-orange-300'
      case 'approved': return 'bg-green-100 text-green-800 border border-green-300'
      default: return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    }
  }

  // Existing resources logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${profile.firm_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          search_id: searchId,
          type: type,
          name: file.name,
          file_url: publicUrl,
          uploaded_by: user?.id,
        })

      if (dbError) throw dbError

      onUpdate()
      e.target.value = ''
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete document')
    }
  }

  const handleReplaceDocument = async (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${profile.firm_id}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('documents')
        .update({ name: file.name, file_url: publicUrl })
        .eq('id', docId)

      if (dbError) throw dbError

      onUpdate()
      e.target.value = ''
    } catch (err) {
      console.error('Replace error:', err)
      setUploadError(err instanceof Error ? err.message : 'Failed to replace file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddLink = async () => {
    if (!newLink.name || !newLink.url || !profile) return

    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          search_id: searchId,
          type: 'link',
          name: newLink.name,
          file_url: newLink.url,
          uploaded_by: user?.id,
        })

      if (error) throw error

      setNewLink({ name: '', url: '' })
      setIsAddingLink(false)
      onUpdate()
    } catch (err) {
      console.error('Add link error:', err)
      alert('Failed to add link')
    }
  }

  const getDocumentsByType = (type: string) => {
    return documents.filter(d => d.type === type)
  }

  const guides = getDocumentsByType('interview_guide').concat(getDocumentsByType('email_templates')).concat(getDocumentsByType('playbook'))
  const otherDocs = documents.filter(d => !['interview_guide', 'email_templates', 'playbook', 'position_spec', 'link'].includes(d.type))
  const links = getDocumentsByType('link')

  const DocumentRow = ({ doc, acceptTypes = ".pdf,.doc,.docx" }: { doc: { id: string; name: string; file_url: string; visible_to_portal?: boolean }; acceptTypes?: string }) => (
    <div className="flex items-center justify-between p-2 border border-ds-border rounded hover:bg-[#FAFAFA] transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
        <span className="text-xs text-text-primary truncate">{doc.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Portal visibility toggle */}
        {(() => {
          const isVisible = getPortalVisibility(doc)
          return (
            <button
              onClick={() => togglePortalVisibility(doc.id, isVisible)}
              disabled={togglingPortalId === doc.id}
              className="flex items-center gap-1.5 group"
            >
              <span className="text-[10px] font-medium text-text-muted group-hover:text-text-secondary whitespace-nowrap">Client Portal</span>
              <div className={`relative w-7 h-4 rounded-full transition-colors ${isVisible ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isVisible ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          )
        })()}
        <div className="w-px h-4 bg-ds-border" />
        <label className="p-1 hover:bg-bg-section rounded cursor-pointer" title="Replace file">
          <input
            type="file"
            accept={acceptTypes}
            onChange={(e) => handleReplaceDocument(doc.id, e)}
            className="hidden"
            disabled={isUploading}
          />
          <RefreshCw className="w-3.5 h-3.5 text-text-secondary" />
        </label>
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-bg-section rounded"
          title="Download"
        >
          <Download className="w-3.5 h-3.5 text-text-secondary" />
        </a>
        <button
          onClick={() => handleDeleteDocument(doc.id)}
          className="p-1 hover:bg-red-50 rounded"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 px-5 pt-4 relative" style={{ paddingBottom: editingPositionSpec ? '80px' : '20px' }}>
      {/* ===== POSITION SPEC — Primary Document Card ===== */}
      <div className="rounded-lg border-2 border-navy/20 bg-bg-page overflow-hidden">
        <div className="px-4 py-3 border-b border-ds-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-navy" />
            <h3 className="text-sm font-bold text-navy">Position Spec</h3>
          </div>
          {!editingPositionSpec && (
            <button
              type="button"
              onClick={() => setEditingPositionSpec(true)}
              className="text-[11px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
            >
              <Pencil className="w-2.5 h-2.5" /> Edit
            </button>
          )}
        </div>
        <div className="px-4 py-3">
          {editingPositionSpec ? (
            <div className="space-y-3">
              {/* Status dropdown */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-text-secondary w-12">Status</span>
                <Select value={positionSpecStatus} onValueChange={(value: 'draft' | 'client_review' | 'approved') => setPositionSpecStatus(value)}>
                  <SelectTrigger className="w-[150px] h-8 text-xs border border-ds-border bg-white rounded">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="client_review">Client Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* File row */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-text-secondary w-12">File</span>
                {positionSpecDoc ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <span className="text-xs text-text-primary truncate">{positionSpecDoc.name}</span>
                    <button type="button" onClick={() => window.open(positionSpecDoc.file_url, '_blank')} className="text-[11px] text-orange hover:underline flex-shrink-0 font-medium">View</button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Remove this position spec?')) {
                          const { error } = await supabase.from('documents').delete().eq('id', positionSpecDoc.id)
                          if (!error) setPositionSpecDoc(null)
                        }
                      }}
                      className="text-[11px] text-red-500 hover:underline flex-shrink-0"
                    >Remove</button>
                    <button
                      type="button"
                      onClick={() => specFileInputRef.current?.click()}
                      disabled={isUploadingSpec}
                      className="text-[11px] text-orange hover:underline font-medium flex-shrink-0 inline-flex items-center gap-1"
                    >
                      {isUploadingSpec
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</>
                        : <><RefreshCw className="h-3 w-3" /> Replace</>
                      }
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => specFileInputRef.current?.click()}
                    disabled={isUploadingSpec}
                    className="text-xs text-orange hover:underline font-medium inline-flex items-center gap-1"
                  >
                    {isUploadingSpec
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</>
                      : <><Upload className="h-3 w-3" /> Upload file</>
                    }
                  </button>
                )}
              </div>
              {specUploadError && (
                <div className="text-[11px] text-red-600">{specUploadError}</div>
              )}
              {/* Save/Cancel handled by sticky bar below */}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSpecStatusColor(positionSpecStatus)}`}>
                {getSpecStatusLabel(positionSpecStatus)}
              </span>
              {positionSpecDoc ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <span className="text-sm text-text-primary truncate">{positionSpecDoc.name}</span>
                  <button type="button" onClick={() => window.open(positionSpecDoc.file_url, '_blank')} className="text-xs text-orange hover:underline flex-shrink-0 font-medium">View</button>
                  <div className="w-px h-4 bg-ds-border flex-shrink-0" />
                  {(() => {
                    const isVisible = getPortalVisibility(positionSpecDoc)
                    return (
                      <button
                        type="button"
                        onClick={() => togglePortalVisibility(positionSpecDoc.id, isVisible)}
                        disabled={togglingPortalId === positionSpecDoc.id}
                        className="flex items-center gap-1.5 group flex-shrink-0"
                      >
                        <span className="text-[10px] font-medium text-text-muted group-hover:text-text-secondary whitespace-nowrap">Client Portal</span>
                        <div className={`relative w-7 h-4 rounded-full transition-colors ${isVisible ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isVisible ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                        </div>
                      </button>
                    )
                  })()}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => specFileInputRef.current?.click()}
                  className="text-xs text-orange hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload Position Spec
                </button>
              )}
            </div>
          )}
        </div>
        <input
          ref={specFileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleSpecFileUpload(e.target.files[0])
              e.target.value = ''
            }
          }}
        />
      </div>

      {/* ===== INTERVIEW GUIDES & PLAYBOOKS ===== */}
      <div className="rounded-lg border border-ds-border bg-bg-page overflow-hidden">
        <div className="px-4 py-3 border-b border-ds-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-navy" />
            <h3 className="text-sm font-bold text-navy">Interview Guides & Playbooks</h3>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e, 'interview_guide')}
              className="hidden"
              disabled={isUploading}
            />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-navy hover:bg-white transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload
            </div>
          </label>
        </div>
        <div className="px-4 py-3">
          {guides.length === 0 ? (
            <p className="text-xs text-text-muted">No guides or playbooks uploaded yet</p>
          ) : (
            <div className="space-y-1.5">
              {guides.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== OTHER DOCUMENTS ===== */}
      <div className="rounded-lg border border-ds-border bg-bg-page overflow-hidden">
        <div className="px-4 py-3 border-b border-ds-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-navy" />
            <h3 className="text-sm font-bold text-navy">Other Documents</h3>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
              onChange={(e) => handleFileUpload(e, 'other')}
              className="hidden"
              disabled={isUploading}
            />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-navy hover:bg-white transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload
            </div>
          </label>
        </div>
        <div className="px-4 py-3">
          {otherDocs.length === 0 ? (
            <p className="text-xs text-text-muted">No other documents yet</p>
          ) : (
            <div className="space-y-1.5">
              {otherDocs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} acceptTypes=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== REFERENCE LINKS ===== */}
      <div className="rounded-lg border border-ds-border bg-bg-page overflow-hidden">
        <div className="px-4 py-3 border-b border-ds-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-navy" />
            <h3 className="text-sm font-bold text-navy">Reference Links</h3>
          </div>
          <button
            onClick={() => setIsAddingLink(!isAddingLink)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-navy hover:bg-white transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Add Link
          </button>
        </div>
        <div className="px-4 py-3">
          {isAddingLink && (
            <div className="mb-3 p-3 bg-[#FAFAFA] rounded-md border border-ds-border">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Label"
                  value={newLink.name}
                  onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                  className="text-xs h-8 flex-1"
                />
                <Input
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  className="text-xs h-8 flex-[2]"
                />
                <Button
                  size="sm"
                  onClick={handleAddLink}
                  disabled={!newLink.name || !newLink.url}
                  className="h-8 text-xs text-white bg-navy hover:bg-navy/90 px-3"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingLink(false)
                    setNewLink({ name: '', url: '' })
                  }}
                  className="h-8 text-xs px-3"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {links.length === 0 ? (
            <p className="text-xs text-text-muted">No reference links yet</p>
          ) : (
            <div className="space-y-1.5">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-2 border border-ds-border rounded hover:bg-[#FAFAFA] transition-colors"
                >
                  <a
                    href={link.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span className="text-xs font-medium text-navy truncate">{link.name}</span>
                    <span className="text-[11px] text-text-muted truncate hidden sm:inline">{link.file_url}</span>
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(link.id)}
                    className="p-1 hover:bg-red-50 rounded flex-shrink-0"
                    title="Remove link"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Status */}
      {isUploading && (
        <div className="text-xs text-navy text-center py-2">
          Uploading...
        </div>
      )}
      {uploadError && (
        <div className="text-xs text-red-600 text-center py-2 bg-red-50 rounded px-2">
          {uploadError}
        </div>
      )}

      {/* Sticky Save/Cancel Bar */}
      {editingPositionSpec && (
        <div className="bg-white border-t border-ds-border" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', zIndex: 50, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex justify-end gap-3 px-6 py-4 max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingPositionSpec(false)
                setSpecUploadError(null)
                setPositionSpecStatus(search?.position_spec_status || 'draft')
              }}
              disabled={isSavingSpec}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={savePositionSpec}
              disabled={isSavingSpec}
              className="bg-navy text-white font-bold"
            >
              {isSavingSpec ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
