"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PortalCoverProps {
  searchId: string
  companyName: string
  positionTitle: string
  coverImageUrl?: string | null
  canEdit?: boolean
  onUploaded?: (url: string) => void
}

const NAVY = "#1F3C62"
const NAVY_LIGHT = "#2A4F7E"

export function PortalCover({
  searchId,
  companyName,
  positionTitle,
  coverImageUrl,
  canEdit = false,
  onUploaded,
}: PortalCoverProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split(".").pop()
      const path = `${searchId}/cover-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from("portal-covers")
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage
        .from("portal-covers")
        .getPublicUrl(path)

      const { error: updErr } = await supabase
        .from("searches")
        .update({ cover_image_url: publicUrl })
        .eq("id", searchId)
      if (updErr) throw updErr

      onUploaded?.(publicUrl)
    } catch (err) {
      console.error("Cover upload failed:", err)
      alert("Failed to upload cover image")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const gradientPlaceholder = `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`

  return (
    <div
      className="relative w-full h-[200px] overflow-hidden"
      style={{
        background: coverImageUrl ? undefined : gradientPlaceholder,
      }}
    >
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Bottom dark gradient overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Title overlay */}
      <div className="absolute inset-x-0 bottom-0 px-6 sm:px-10 pb-6 text-white">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-90"
          style={{ letterSpacing: "0.15em" }}
        >
          {companyName}
        </div>
        <h1
          className="text-2xl sm:text-3xl mt-1"
          style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
        >
          {positionTitle}
        </h1>
      </div>

      {canEdit && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-white/90 hover:bg-white text-navy text-xs font-semibold backdrop-blur-sm border border-white/60 transition"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus className="w-3.5 h-3.5" />
                {coverImageUrl ? "Replace cover" : "Add cover image"}
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
    </div>
  )
}
