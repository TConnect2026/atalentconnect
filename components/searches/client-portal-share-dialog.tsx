"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Contact } from "@/types"

interface ClientPortalShareDialogProps {
  searchId: string
  secureLink: string
  isOpen: boolean
  onClose: () => void
}

export function ClientPortalShareDialog({
  searchId,
  secureLink,
  isOpen,
  onClose
}: ClientPortalShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/client/${secureLink}`
    : ''

  useEffect(() => {
    if (isOpen) {
      loadContacts()
    }
  }, [isOpen, searchId])

  const loadContacts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('search_id', searchId)
        .order('is_primary', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (err) {
      console.error('Error loading contacts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendInvite = async (contactId: string, email: string) => {
    try {
      const response = await fetch('/api/client/send-portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      })

      if (response.ok) {
        alert(`Portal invite sent to ${email}`)
        loadContacts()
      } else {
        alert('Failed to send portal access')
      }
    } catch (err) {
      alert('Error sending portal access')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            Share Client Portal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Client Portal View */}
          <div>
            <Label className="text-text-primary font-semibold mb-2 block">
              Client Portal
            </Label>
            <p className="text-sm text-text-secondary mb-3">
              View the client portal or share the link with your client contacts. Each search has its own secure portal.
            </p>
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => window.open(portalUrl, '_blank')}
                className="flex-1 bg-navy hover:bg-navy/90 text-white font-semibold"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Client Portal
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={portalUrl}
                readOnly
                className="bg-bg-section text-text-primary font-mono text-sm"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className={`min-w-[100px] ${
                  copied
                    ? 'bg-cyan-50 border-cyan-600 text-cyan-700'
                    : 'bg-white border-ds-border text-text-primary hover:bg-bg-section'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>

          {/* Client Contacts */}
          <div>
            <Label className="text-text-primary font-semibold mb-3 block">
              Client Contacts ({contacts.length})
            </Label>
            {isLoading ? (
              <p className="text-sm text-text-muted">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-text-muted">No client contacts added yet</p>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 bg-bg-section rounded-lg border border-ds-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-text-primary">{contact.name}</p>
                          {contact.is_primary && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-navy/10 text-navy rounded">
                              Primary
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            contact.access_level === 'full_access'
                              ? 'bg-cyan-50 text-cyan-700'
                              : contact.access_level === 'limited_access'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-bg-section text-text-primary'
                          }`}>
                            {contact.access_level === 'full_access' && 'Full Access'}
                            {contact.access_level === 'limited_access' && 'Limited Access'}
                            {contact.access_level === 'no_portal_access' && 'No Portal Access'}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary">{contact.email}</p>
                        {contact.portal_last_accessed_at ? (
                          <p className="text-xs text-cyan-700 mt-2 flex items-center gap-1">
                            ✓ Last accessed: {new Date(contact.portal_last_accessed_at).toLocaleDateString()}
                          </p>
                        ) : contact.portal_invite_sent_at ? (
                          <p className="text-xs text-text-secondary mt-2">
                            Invite sent: {new Date(contact.portal_invite_sent_at).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-xs text-text-muted mt-2">No portal access sent yet</p>
                        )}
                      </div>
                      {contact.access_level !== 'no_portal_access' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendInvite(contact.id, contact.email)}
                          className="bg-white text-[#1a3a52] border-ds-border hover:bg-bg-section"
                        >
                          {contact.portal_invite_sent_at ? 'Resend' : 'Send'} Invite
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-white text-text-primary border-ds-border hover:bg-bg-section"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
