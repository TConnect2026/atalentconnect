"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function NewSearchPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()

  const [companyName, setCompanyName] = useState("")
  const [positionTitle, setPositionTitle] = useState("")
  const [leadRecruiterId, setLeadRecruiterId] = useState("")
  const [firmUsers, setFirmUsers] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load firm users for the Lead Recruiter dropdown
  useEffect(() => {
    if (!profile?.firm_id) return
    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("firm_id", profile.firm_id)
        .in("role", ["administrator", "recruiter"])
        .order("first_name")
      if (error) {
        console.error("Error loading firm users:", error)
        return
      }
      setFirmUsers(
        (data || []).map((u) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`,
        }))
      )
    }
    load()
  }, [profile?.firm_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!companyName.trim() || !positionTitle.trim() || !leadRecruiterId) {
      setError("Company Name, Position Title, and Lead Recruiter are all required")
      return
    }

    setIsLoading(true)
    try {
      const { data: search, error: insertError } = await supabase
        .from("searches")
        .insert({
          firm_id: profile?.firm_id,
          owner_id: profile?.id,
          lead_recruiter_id: leadRecruiterId,
          company_name: companyName.trim(),
          position_title: positionTitle.trim(),
          client_name: "",
          client_email: "",
          status: "active",
        })
        .select()
        .single()

      if (insertError) {
        console.error("Search insert failed:", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        })
        throw insertError
      }

      router.push(`/searches/${search.id}/pipeline`)
    } catch (err: any) {
      setError(err?.message || "Failed to create search")
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <p className="text-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <Button
          type="button"
          onClick={() => router.push("/searches")}
          variant="ghost"
          size="sm"
          className="mb-4 hover:bg-bg-section p-2 flex items-center gap-2 text-orange"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Searches</span>
        </Button>

        <Card className="card-shadow rounded-xl">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-navy">Create New Search</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="company_name" className="text-sm font-bold text-navy">
                  Company Name
                </Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="mt-1.5"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="position_title" className="text-sm font-bold text-navy">
                  Position Title
                </Label>
                <Input
                  id="position_title"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  placeholder="e.g. Chief Technology Officer"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="lead_recruiter" className="text-sm font-bold text-navy">
                  Lead Recruiter
                </Label>
                <Select value={leadRecruiterId} onValueChange={setLeadRecruiterId}>
                  <SelectTrigger id="lead_recruiter" className="mt-1.5 w-full">
                    <SelectValue placeholder="Select a recruiter" />
                  </SelectTrigger>
                  <SelectContent>
                    {firmUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 bg-orange text-white font-bold"
                >
                  {isLoading ? "Creating..." : "Create Search"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
