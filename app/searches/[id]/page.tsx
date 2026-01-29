"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PositionDetailsView } from "@/components/searches/position-details-view"

export default function SearchPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const searchId = params.id as string

  const [search, setSearch] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    loadSearchData()
  }, [searchId])

  const loadSearchData = async () => {
    setIsLoading(true)
    try {
      // Load search details
      const { data: searchData, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("id", searchId)
        .single()

      if (searchError) throw searchError
      setSearch(searchData)

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("search_id", searchId)
        .order("is_primary", { ascending: false })

      if (contactsError) throw contactsError
      setContacts(contactsData || [])

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .order("order", { ascending: true })

      if (stagesError) throw stagesError
      setStages(stagesData || [])
    } catch (err) {
      console.error("Error loading search:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading...</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Search not found</p>
      </div>
    )
  }

  return (
    <PositionDetailsView
      search={search}
      contacts={contacts}
      stages={stages}
      isEditMode={isEditMode}
      onEditToggle={() => setIsEditMode(!isEditMode)}
      onSave={async () => {
        await loadSearchData()
        setIsEditMode(false)
      }}
    />
  )
}
