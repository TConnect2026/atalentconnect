"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function RecruiterProfileSettings() {
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // Ignore "not found" error
        throw error
      }

      if (profileData) {
        setProfile({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || user.email || ''
        })
      } else {
        // Initialize with user email
        setProfile({
          first_name: '',
          last_name: '',
          email: user.email || ''
        })
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile.first_name || !profile.last_name || !profile.email) {
      alert("Please fill in all fields")
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id)

        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          })

        if (error) throw error
      }

      setSaveMessage("Profile saved successfully!")
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">Loading profile...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>
          This information will be used for all calendar invites you send
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              placeholder="Anne"
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              placeholder="Taylor"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            placeholder="anne@atalentconnect.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            This email will be used as the organizer for all interview invites
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {saveMessage && (
                <p className="text-sm text-green-600">{saveMessage}</p>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#1F3C62] hover:opacity-90"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your recruiter email will be auto-included on all interview invites you schedule.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
