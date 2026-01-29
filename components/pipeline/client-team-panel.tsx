"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AddContactDialog } from "@/components/searches/add-contact-dialog"
import { supabase } from "@/lib/supabase"
import { Pencil, Trash2, Mail, UserCircle, Star, Linkedin } from "lucide-react"

interface ClientTeamPanelProps {
  searchId: string
  contacts: any[]
  onUpdate: () => void
}

export function ClientTeamPanel({ searchId, contacts, onUpdate }: ClientTeamPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<any | null>(null)
  const [copiedEmails, setCopiedEmails] = useState(false)

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
    const emails = contacts.map(c => c.email).filter(Boolean).join(', ')
    navigator.clipboard.writeText(emails)
    setCopiedEmails(true)
    setTimeout(() => setCopiedEmails(false), 2000)
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
        className="w-full text-white font-semibold"
        style={{ backgroundColor: '#1F3C62' }}
      >
        + Add Contact
      </Button>

      {/* Contacts Table */}
      {contacts.length === 0 ? (
        <div className="py-6 text-center">
          <UserCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No team members yet</p>
          <p className="text-xs text-gray-400 mt-1">Add hiring managers and stakeholders</p>
        </div>
      ) : (
        <div>
          {/* Copy All Emails Button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={copyAllEmails}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {copiedEmails ? '✓ Copied!' : 'Copy all emails'}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 px-2 font-bold text-gray-900">Name</th>
                  <th className="text-left py-2 px-2 font-bold text-gray-900">Title</th>
                  <th className="text-left py-2 px-2 font-bold text-gray-900">Email</th>
                  <th className="text-left py-2 px-2 font-bold text-gray-900">Phone</th>
                  <th className="text-center py-2 px-2 font-bold text-gray-900">LinkedIn</th>
                  <th className="text-center py-2 px-2 font-bold text-gray-900">Access</th>
                  <th className="text-center py-2 px-2 font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-semibold text-gray-900">{contact.name}</span>
                        {contact.is_primary && (
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" title="Primary" />
                        )}
                        {contact.reports_to && (
                          <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded font-semibold" title="Position reports to this person">
                            Reports to
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-700">{contact.title || '-'}</td>
                    <td className="py-2 px-2">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          title="Click to email"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-700">{contact.phone || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      {contact.linkedin_url ? (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
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
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.access_level === 'full_access' ? 'Full' : contact.access_level === 'limited_access' ? 'Limited' : 'None'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3 text-gray-600" />
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
