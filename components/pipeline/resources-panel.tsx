"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { FileText, Trash2, Download, ExternalLink, Upload, RefreshCw, Link as LinkIcon } from "lucide-react"

interface ResourcesPanelProps {
  searchId: string
  documents: any[]
  search: any
  onUpdate: () => void
}

export function ResourcesPanel({ searchId, documents, search, onUpdate }: ResourcesPanelProps) {
  const { user, profile } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [newLink, setNewLink] = useState({ name: '', url: '' })
  const [isAddingLink, setIsAddingLink] = useState(false)

  // Portal visibility toggle
  const [togglingPortalId, setTogglingPortalId] = useState<string | null>(null)

  const togglePortalVisibility = async (docId: string, currentValue: boolean) => {
    setTogglingPortalId(docId)
    try {
      const { error } = await supabase
        .from('documents')
        .update({ visible_to_portal: !currentValue })
        .eq('id', docId)
      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Toggle portal visibility error:', err)
    } finally {
      setTogglingPortalId(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB')
      }

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${profile.firm_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Create document record
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
      // Reset file input
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

  const playbooks = getDocumentsByType('interview_guide').concat(getDocumentsByType('email_templates'))
  const otherDocs = documents.filter(d => !['interview_guide', 'email_templates', 'link'].includes(d.type))
  const links = getDocumentsByType('link')

  return (
    <div className="space-y-4 px-4 pb-4 pt-3 max-h-[500px] overflow-y-auto">
      {/* Playbooks Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Playbooks</h4>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e, 'interview_guide')}
              className="hidden"
              disabled={isUploading}
            />
            <div className="flex items-center gap-1 text-xs text-navy hover:text-navy">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </div>
          </label>
        </div>
        {playbooks.length === 0 ? (
          <p className="text-xs text-text-muted py-2">No playbooks uploaded yet</p>
        ) : (
          <div className="space-y-1.5">
            {playbooks.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 border border-ds-border rounded hover:border-ds-border"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <span className="text-xs text-text-primary truncate">{doc.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePortalVisibility(doc.id, !!doc.visible_to_portal)}
                    disabled={togglingPortalId === doc.id}
                    className="flex items-center gap-1.5 group"
                  >
                    <span className="text-[10px] font-medium text-text-muted group-hover:text-text-secondary whitespace-nowrap">Client Portal</span>
                    <div className={`relative w-7 h-4 rounded-full transition-colors ${doc.visible_to_portal ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${doc.visible_to_portal ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <div className="w-px h-4 bg-ds-border" />
                  <label className="p-1 hover:bg-bg-section rounded cursor-pointer" title="Replace file">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
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
            ))}
          </div>
        )}
      </div>

      {/* Company Links Section */}
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-2">Company Links</h4>
        <div className="space-y-1.5">
          {search.company_website && (
            <a
              href={search.company_website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 border border-ds-border rounded hover:border-ds-border hover:bg-bg-section"
            >
              <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs text-text-primary">Company Website</span>
            </a>
          )}
          {search.company_linkedin && (
            <a
              href={search.company_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 border border-ds-border rounded hover:border-ds-border hover:bg-bg-section"
            >
              <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs text-text-primary">LinkedIn</span>
            </a>
          )}
          {!search.company_website && !search.company_linkedin && (
            <p className="text-xs text-text-muted py-2">No company links yet</p>
          )}
        </div>
      </div>

      {/* Custom Links Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Custom Links</h4>
          <button
            onClick={() => setIsAddingLink(!isAddingLink)}
            className="flex items-center gap-1 text-xs text-navy hover:text-navy"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>

        {isAddingLink && (
          <div className="space-y-2 mb-2 p-2 bg-white rounded border border-ds-border">
            <Input
              placeholder="Link name"
              value={newLink.name}
              onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
              className="text-xs h-8"
            />
            <Input
              placeholder="https://..."
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="text-xs h-8"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddLink}
                disabled={!newLink.name || !newLink.url}
                className="h-7 text-xs text-white bg-orange"
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
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {links.length === 0 ? (
          <p className="text-xs text-text-muted py-2">No custom links yet</p>
        ) : (
          <div className="space-y-1.5">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-2 border border-ds-border rounded hover:border-ds-border"
              >
                <a
                  href={link.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span className="text-xs text-text-primary truncate">{link.name}</span>
                </a>
                <button
                  onClick={() => handleDeleteDocument(link.id)}
                  className="p-1 hover:bg-red-50 rounded flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Other Documents</h4>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e, 'other')}
              className="hidden"
              disabled={isUploading}
            />
            <div className="flex items-center gap-1 text-xs text-navy hover:text-navy">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </div>
          </label>
        </div>
        {otherDocs.length === 0 ? (
          <p className="text-xs text-text-muted py-2">No other documents yet</p>
        ) : (
          <div className="space-y-1.5">
            {otherDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 border border-ds-border rounded hover:border-ds-border"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <span className="text-xs text-text-primary truncate">{doc.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePortalVisibility(doc.id, !!doc.visible_to_portal)}
                    disabled={togglingPortalId === doc.id}
                    className="flex items-center gap-1.5 group"
                  >
                    <span className="text-[10px] font-medium text-text-muted group-hover:text-text-secondary whitespace-nowrap">Client Portal</span>
                    <div className={`relative w-7 h-4 rounded-full transition-colors ${doc.visible_to_portal ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${doc.visible_to_portal ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <div className="w-px h-4 bg-ds-border" />
                  <label className="p-1 hover:bg-bg-section rounded cursor-pointer" title="Replace file">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
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
            ))}
          </div>
        )}
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
    </div>
  )
}
