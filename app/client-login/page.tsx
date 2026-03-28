"use client"

import { useState } from "react"
import { User, Handshake, CheckCircle, Mail } from "lucide-react"
import { signInWithMagicLink } from "@/lib/supabase-client"

export default function ClientLoginPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus("sending")
    setError("")

    try {
      await signInWithMagicLink(email.trim())
      setStatus("sent")
    } catch (err: any) {
      setStatus("error")
      setError(err?.message || "Something went wrong. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#1F3C62" }}>
      {/* Login Card */}
      <div
        className="w-full max-w-[420px] rounded-2xl shadow-xl px-8 py-10"
        style={{ backgroundColor: "#FAF8F5" }}
      >
        {/* Firm Branding */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center mb-3"
            style={{ backgroundColor: "#1F3C62" }}
          >
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "#1F3C62" }}>
            Your Recruiting Firm
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Executive Search &amp; Talent Advisory
          </p>
        </div>

        {/* Divider Pill */}
        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div
            className="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: "#D97757" }}
          >
            <Handshake className="w-4 h-4" />
            Client Portal
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-center text-sm text-text-secondary mb-6">
          Sign in to view your search progress
        </p>

        {status === "sent" ? (
          /* Success State */
          <div className="text-center py-4">
            <div className="flex justify-center mb-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Check your inbox — we sent a secure login link to{" "}
              <span className="font-medium" style={{ color: "#1F3C62" }}>{email}</span>.
              Link expires in 15 minutes.
            </p>
          </div>
        ) : (
          /* Email Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy"
                  style={{ borderColor: "#E5E7EB" }}
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#D97757" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C4664A")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#D97757")}
            >
              {status === "sending" ? "Sending..." : "Send Login Link"}
            </button>
          </form>
        )}

        {/* Footer Note */}
        <p className="text-xs text-text-muted text-center mt-6">
          Access is by invitation only. Contact your recruiting partner if you need help.
        </p>
      </div>

      {/* Powered By */}
      <div className="mt-6 flex items-center gap-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        Powered by
        <span className="flex items-center font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
          @talent
          <svg
            className="mx-0.5 w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="10" width="6" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="16" y="10" width="6" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          connect
        </span>
      </div>
    </div>
  )
}
