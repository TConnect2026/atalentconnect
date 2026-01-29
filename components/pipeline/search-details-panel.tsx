"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

interface SearchDetailsPanelProps {
  searchId: string
  search: any
}

export function SearchDetailsPanel({ searchId, search }: SearchDetailsPanelProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState(search?.company_logo_url || null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    setIsUploadingLogo(true)

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${searchId}-logo-${Date.now()}.${fileExt}`
      const filePath = `${profile.firm_id}/logos/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Update search record
      const { error: updateError } = await supabase
        .from('searches')
        .update({ company_logo_url: publicUrl })
        .eq('id', searchId)

      if (updateError) throw updateError

      setLogoUrl(publicUrl)

      // Reload page to show updated logo everywhere
      window.location.reload()
    } catch (err) {
      console.error('Error uploading logo:', err)
      alert('Failed to upload logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null
    return (
      <div className="py-2 border-b border-gray-100 last:border-0">
        <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
        <div className="text-sm text-gray-900">{value}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {/* Edit Button */}
      <div className="flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/searches/${searchId}`)}
          className="text-xs"
        >
          Edit Details
        </Button>
      </div>

      {/* Client Logo Upload */}
      <div className="pb-3 border-b border-gray-200">
        <div className="text-xs text-gray-500 font-medium mb-2">Client Logo</div>
        {logoUrl ? (
          <div className="space-y-2">
            <img
              src={logoUrl}
              alt="Client logo"
              className="h-12 w-auto object-contain"
            />
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploadingLogo}
                className="hidden"
              />
              <span className="text-xs text-blue-600 hover:text-blue-800">
                {isUploadingLogo ? 'Uploading...' : 'Change logo'}
              </span>
            </label>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={isUploadingLogo}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={isUploadingLogo}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.currentTarget.previousElementSibling?.dispatchEvent(new MouseEvent('click'))
              }}
            >
              {isUploadingLogo ? 'Uploading...' : '+ Upload Logo'}
            </Button>
          </label>
        )}
      </div>

      {/* Search Details */}
      <div className="space-y-0.5">
        <DetailRow label="Company" value={search.company_name} />
        <DetailRow label="Position Title" value={search.position_title} />
        <DetailRow label="Location" value={search.location} />
        <DetailRow label="Work Arrangement" value={search.work_arrangement} />
        <DetailRow label="Reports To" value={search.reports_to} />
        <DetailRow label="Compensation Range" value={search.compensation_range} />
        <DetailRow label="Benefits Package" value={search.benefits_package} />
        <DetailRow
          label="Launch Date"
          value={search.launch_date ? new Date(search.launch_date).toLocaleDateString() : null}
        />
        <DetailRow
          label="Target Fill Date"
          value={search.target_fill_date ? new Date(search.target_fill_date).toLocaleDateString() : null}
        />
        <DetailRow label="Open to Relocation" value={search.open_to_relocation ? 'Yes' : 'No'} />
      </div>

      {/* Status Badge */}
      {search.status && (
        <div className="pt-3 border-t border-gray-200 mt-3">
          <div className="text-xs text-gray-500 font-medium mb-1">Status</div>
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              search.status === 'active'
                ? 'bg-green-100 text-green-800'
                : search.status === 'pending'
                ? 'bg-purple-100 text-purple-800'
                : search.status === 'filled'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!search.location &&
       !search.work_arrangement &&
       !search.reports_to &&
       !search.compensation_range &&
       !search.benefits_package && (
        <div className="py-4 text-center">
          <p className="text-sm text-gray-500">
            No additional details yet
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push(`/searches/${searchId}`)}
            className="text-blue-600 text-xs mt-2"
          >
            Add more details
          </Button>
        </div>
      )}
    </div>
  )
}
