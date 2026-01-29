"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function TwoFactorSettings() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [qrCode, setQrCode] = useState<string>('')

  const handleEnable2FA = async () => {
    setShowSetup(true)

    // TODO: Call API to generate 2FA secret and QR code
    // For now, mock data
    setQrCode('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    setBackupCodes([
      'ABCD-1234-EFGH-5678',
      'IJKL-9012-MNOP-3456',
      'QRST-7890-UVWX-1234',
      'YZAB-5678-CDEF-9012'
    ])
  }

  const handleVerify = async () => {
    if (!verificationCode) {
      alert('Please enter the 6-digit code')
      return
    }

    // TODO: Verify code with backend
    // For now, mock success
    setIs2FAEnabled(true)
    setShowSetup(false)
    alert('2FA enabled successfully!')
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return
    }

    // TODO: Call API to disable 2FA
    setIs2FAEnabled(false)
    alert('2FA disabled')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>
          Manage your account security preferences
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 2FA Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="enable2fa"
                checked={is2FAEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnable2FA()
                  } else {
                    handleDisable2FA()
                  }
                }}
              />
              <Label htmlFor="enable2fa" className="cursor-pointer">
                {is2FAEnabled ? 'Enabled' : 'Enable 2FA'}
              </Label>
            </div>
          </div>

          {!is2FAEnabled && !showSetup && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                When enabled, you'll enter a code from your authenticator app each time you log in.
              </p>
            </div>
          )}
        </div>

        {/* 2FA Setup Flow */}
        {showSetup && !is2FAEnabled && (
          <div className="space-y-6 border-t pt-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Set Up Two-Factor Authentication</h4>

              {/* Step 1: Scan QR Code */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    1. Scan this QR code with your authenticator app
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    (Google Authenticator, Authy, 1Password, etc.)
                  </p>
                  <div className="flex justify-center p-6 bg-white border border-gray-200 rounded-lg">
                    {/* Placeholder for QR code */}
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded">
                      <p className="text-sm text-gray-500">QR Code</p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Enter Code */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    2. Enter the 6-digit code from your app
                  </p>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                {/* Backup Codes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                    Save these backup codes
                  </p>
                  <p className="text-xs text-yellow-800 mb-3">
                    Use these if you lose access to your authenticator app
                  </p>
                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded border border-yellow-300">
                    {backupCodes.map((code, index) => (
                      <code key={index} className="text-xs font-mono text-gray-800">
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(backupCodes.join('\n'))
                      alert('Backup codes copied to clipboard')
                    }}
                  >
                    Copy Backup Codes
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleVerify}
                    className="flex-1 bg-[#1F3C62] hover:opacity-90"
                  >
                    Verify & Enable
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSetup(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2FA Enabled State */}
        {is2FAEnabled && (
          <div className="space-y-4 border-t pt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">
                ✓ Two-factor authentication is enabled
              </p>
              <p className="text-xs text-green-700 mt-1">
                Your account is protected with an additional security layer
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable2FA}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Disable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
