"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
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
  const [accessLevel, setAccessLevel] = useState<'full_access' | 'limited_access' | 'no_portal_access' | ''>('')
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
      setAccessLevel(existingContact.access_level || '')
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
      setAccessLevel('')
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

      // If setting as primary, clear is_primary from all other contacts first
      if (isPrimary) {
        await supabase
          .from('contacts')
          .update({ is_primary: false })
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
        access_level: accessLevel || 'full_access'
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
      setAccessLevel('')

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
      <DialogContent className="sm:max-w-[500px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            {existingContact ? 'Edit Contact' : 'Add Client Contact'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name" className="text-text-primary">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 bg-white text-text-primary"
              placeholder="John Smith"
            />
          </div>

          <div>
            <Label htmlFor="title" className="text-text-primary">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 bg-white text-text-primary"
              placeholder="e.g. VP of Engineering"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-text-primary">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 bg-white text-text-primary"
              placeholder="john@company.com"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-text-primary">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 bg-white text-text-primary"
              placeholder="555-123-4567"
            />
          </div>

          <div>
            <Label htmlFor="linkedinUrl" className="text-text-primary">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="mt-1 bg-white text-text-primary"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-text-primary">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1 bg-white text-text-primary">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Board Chair">Board Chair</SelectItem>
                <SelectItem value="Board Member">Board Member</SelectItem>
                <SelectItem value="CHRO">CHRO</SelectItem>
                <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                <SelectItem value="Stakeholder">Stakeholder</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="accessLevel" className="text-text-primary">Portal Access Level</Label>
            <Select value={accessLevel || undefined} onValueChange={(value: any) => setAccessLevel(value)}>
              <SelectTrigger className="mt-1 bg-white text-text-primary">
                <SelectValue placeholder="Select access level..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="full_access">Full Access</SelectItem>
                <SelectItem value="limited_access">Limited Access</SelectItem>
                <SelectItem value="no_portal_access">No Portal Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reportsTo"
              checked={reportsTo}
              onCheckedChange={(checked) => setReportsTo(checked as boolean)}
            />
            <Label htmlFor="reportsTo" className="text-text-primary cursor-pointer">
              Position reports to this person
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
            />
            <Label htmlFor="isPrimary" className="text-text-primary cursor-pointer">
              Set as primary contact
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white text-text-primary border-ds-border hover:bg-bg-section"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#0891B2] text-white hover:bg-[#DC2626] font-semibold"
            >
              {isSaving ? 'Saving...' : existingContact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
