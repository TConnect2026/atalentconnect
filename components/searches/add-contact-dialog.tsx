"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { Contact } from "@/types"

interface AddContactDialogProps {
  searchId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingContact?: Contact | null
}

export function AddContactDialog({ searchId, isOpen, onClose, onSuccess, existingContact }: AddContactDialogProps) {
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [role, setRole] = useState("")
  const [reportsTo, setReportsTo] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)
  const [accessLevel, setAccessLevel] = useState<'full_access' | 'limited_access' | 'no_portal_access'>('full_access')
  const [isSaving, setIsSaving] = useState(false)

  // Populate form when editing existing contact
  useEffect(() => {
    if (existingContact) {
      setName(existingContact.name || "")
      setTitle(existingContact.title || "")
      setEmail(existingContact.email || "")
      setPhone(existingContact.phone || "")
      setLinkedinUrl(existingContact.linkedin_url || "")
      setRole(existingContact.role || "")
      setReportsTo(existingContact.reports_to || false)
      setIsPrimary(existingContact.is_primary || false)
      setAccessLevel(existingContact.access_level || 'full_access')
    } else {
      // Reset form when adding new contact
      setName("")
      setTitle("")
      setEmail("")
      setPhone("")
      setLinkedinUrl("")
      setRole("")
      setReportsTo(false)
      setIsPrimary(false)
      setAccessLevel('full_access')
    }
  }, [existingContact, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // If setting reports_to, clear it from all other contacts first
      if (reportsTo) {
        await supabase
          .from('contacts')
          .update({ reports_to: false })
          .eq('search_id', searchId)
      }

      const contactData = {
        name,
        title: title || null,
        email,
        phone: phone || null,
        linkedin_url: linkedinUrl || null,
        role: role || null,
        reports_to: reportsTo,
        is_primary: isPrimary,
        access_level: accessLevel
      }

      if (existingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', existingContact.id)

        if (error) throw error
      } else {
        // Insert new contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            search_id: searchId,
            ...contactData
          })

        if (error) throw error
      }

      // Reset form
      setName("")
      setTitle("")
      setEmail("")
      setPhone("")
      setLinkedinUrl("")
      setRole("")
      setReportsTo(false)
      setIsPrimary(false)
      setAccessLevel('full_access')

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving contact:', err)
      alert(`Failed to ${existingContact ? 'update' : 'add'} contact`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {existingContact ? 'Edit Contact' : 'Add Client Contact'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name" className="text-gray-700">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 bg-white text-gray-900"
              placeholder="John Smith"
            />
          </div>

          <div>
            <Label htmlFor="title" className="text-gray-700">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 bg-white text-gray-900"
              placeholder="CEO"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-700">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 bg-white text-gray-900"
              placeholder="john@company.com"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-gray-700">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 bg-white text-gray-900"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="linkedinUrl" className="text-gray-700">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="mt-1 bg-white text-gray-900"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-gray-700">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1 bg-white text-gray-900">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Board Chair">Board Chair</SelectItem>
                <SelectItem value="Board Member">Board Member</SelectItem>
                <SelectItem value="CHRO">CHRO</SelectItem>
                <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                <SelectItem value="Stakeholder">Stakeholder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="accessLevel" className="text-gray-700">Portal Access Level</Label>
            <Select value={accessLevel} onValueChange={(value: any) => setAccessLevel(value)}>
              <SelectTrigger className="mt-1 bg-white text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="full_access">Full Access</SelectItem>
                <SelectItem value="limited_access">Limited Access</SelectItem>
                <SelectItem value="no_portal_access">No Portal Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reportsTo"
              checked={reportsTo}
              onChange={(e) => setReportsTo(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="reportsTo" className="text-gray-700 cursor-pointer">
              Position reports to this person
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isPrimary" className="text-gray-700 cursor-pointer">
              Set as primary contact
            </Label>
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
              {isSaving ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
