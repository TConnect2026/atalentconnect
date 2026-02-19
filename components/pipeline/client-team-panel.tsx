"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AddContactDialog } from "@/components/searches/add-contact-dialog"
import { supabase } from "@/lib/supabase"
import { Pencil, Trash2, Mail, UserCircle, Linkedin, GripVertical } from "lucide-react"

interface ClientTeamPanelProps {
  searchId: string
  contacts: any[]
  onUpdate: () => void
}

export function ClientTeamPanel({ searchId, contacts, onUpdate }: ClientTeamPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<any | null>(null)
  const [copiedEmails, setCopiedEmails] = useState(false)
  const [localContacts, setLocalContacts] = useState<any[]>(contacts)
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Keep local contacts in sync when parent data changes
  useEffect(() => {
    setLocalContacts(contacts)
  }, [contacts])

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this contact?')) return

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Error deleting contact:', err)
      alert('Failed to delete contact')
    }
  }

  const handleEdit = (contact: any) => {
    setEditingContact(contact)
    setIsAddDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
    setEditingContact(null)
    onUpdate()
  }

  const copyAllEmails = () => {
    const emails = localContacts.map(c => c.email).filter(Boolean).join(', ')
    navigator.clipboard.writeText(emails)
    setCopiedEmails(true)
    setTimeout(() => setCopiedEmails(false), 2000)
  }

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const fromIndex = dragIndex.current
    if (fromIndex === null || fromIndex === dropIndex) {
      handleDragEnd()
      return
    }

    const reordered = [...localContacts]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    setLocalContacts(reordered)
    handleDragEnd()

    // Persist order to DB (silently fail if display_order column doesn't exist)
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('contacts')
        .update({ display_order: i })
        .eq('id', reordered[i].id)
    }
  }

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {/* Add Contact Button */}
      <Button
        onClick={() => {
          setEditingContact(null)
          setIsAddDialogOpen(true)
        }}
        size="sm"
        className="w-full text-white font-semibold bg-orange"
      >
        + Add Contact
      </Button>

      {/* Contacts Table */}
      {localContacts.length === 0 ? (
        <div className="py-6 text-center">
          <UserCircle className="w-12 h-12 mx-auto text-text-muted mb-2" />
          <p className="text-sm text-text-muted">No team members yet</p>
          <p className="text-xs text-text-muted mt-1">Add interview committee and key stakeholders</p>
        </div>
      ) : (
        <div>
          {/* Copy All Emails Button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={copyAllEmails}
              className="text-xs text-navy hover:text-navy font-medium"
            >
              {copiedEmails ? '✓ Copied!' : 'Copy all emails'}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ds-border">
                  <th className="w-6"></th>
                  <th className="text-left py-2 px-2 font-bold text-text-primary">Name</th>
                  <th className="text-left py-2 px-2 font-bold text-text-primary">Title</th>
                  <th className="text-left py-2 px-2 font-bold text-text-primary">Email</th>
                  <th className="text-left py-2 px-2 font-bold text-text-primary">Phone</th>
                  <th className="text-center py-2 px-2 font-bold text-text-primary">LinkedIn</th>
                  <th className="text-center py-2 px-2 font-bold text-text-primary">Access</th>
                  <th className="text-center py-2 px-2 font-bold text-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localContacts.map((contact, index) => (
                  <tr
                    key={contact.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`border-b border-ds-border transition-colors ${
                      dragOverIndex === index ? 'bg-navy/5 border-t-2 border-t-navy' : 'hover:bg-bg-section'
                    }`}
                  >
                    <td className="py-2 pl-1 pr-0">
                      <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="font-semibold text-text-primary hover:text-navy transition-colors text-left"
                        >
                          {contact.name}
                        </button>
                        {contact.is_primary && (
                          <span className="inline-block px-1.5 py-0.5 bg-navy/10 text-navy text-[10px] rounded font-semibold" title="Primary contact">
                            Primary
                          </span>
                        )}
                        {contact.reports_to && (
                          <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded font-semibold" title="Position reports to this person">
                            Reports to
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-text-primary">{contact.title || '-'}</td>
                    <td className="py-2 px-2">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-navy hover:text-navy hover:underline"
                          title="Click to email"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-2 text-text-primary">{contact.phone || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      {contact.linkedin_url ? (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-navy hover:text-navy"
                          title="View LinkedIn profile"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        contact.access_level === 'full_access'
                          ? 'bg-green-100 text-green-800'
                          : contact.access_level === 'limited_access'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-bg-section text-text-primary'
                      }`}>
                        {contact.access_level === 'full_access' ? 'Full' : contact.access_level === 'limited_access' ? 'Limited' : 'None'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="p-1 hover:bg-bg-page rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3 text-text-secondary" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Dialog */}
      <AddContactDialog
        isOpen={isAddDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogClose}
        searchId={searchId}
        existingContact={editingContact}
      />
    </div>
  )
}
