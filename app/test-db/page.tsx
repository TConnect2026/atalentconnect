"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()

export default function TestDBPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    testDatabase()
  }, [])

  const testDatabase = async () => {
    const tests: any = {}

    // Test 1: Check connection
    try {
      const { data, error } = await supabase.from("searches").select("count")
      tests.connection = error ? `Error: ${error.message}` : "✓ Connected"
      tests.connectionDetails = { data, error }
    } catch (err) {
      tests.connection = `Exception: ${err}`
    }

    // Test 2: Try to insert a test search
    try {
      const { data, error } = await supabase
        .from("searches")
        .insert({
          company_name: "Test Company",
          position_title: "Test Position",
          client_name: "Test Client",
          client_email: "test@test.com",
          status: "active"
        })
        .select()
        .single()

      tests.insert = error ? `Error: ${error.message}` : "✓ Insert successful"
      tests.insertDetails = { data, error }

      // Clean up test data
      if (data?.id) {
        await supabase.from("searches").delete().eq("id", data.id)
      }
    } catch (err) {
      tests.insert = `Exception: ${err}`
    }

    setResults(tests)
    setLoading(false)
  }

  if (loading) {
    return <div className="p-8">Testing database connection...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  )
}
