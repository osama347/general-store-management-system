"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { useLocation as useLocationContext } from "@/contexts/LocationContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Store, Warehouse, MapPin, User, Phone as PhoneIcon, Lock, Save } from "lucide-react"

export default function SettingsPage() {
  const { profile, loading: authLoading } = useAuth()
  const { locations, isLoading: locationLoading } = useLocationContext()
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const supabase = createClient()

  // Initialize form when profile loads
  useState(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      })
    }
  })

  // Reload profile from database
  const reloadProfile = async () => {
    if (!profile?.id) return
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .single()
    
    if (data) {
      setProfileForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
      })
    }
  }

  const handleProfileUpdate = async () => {
    if (!profileForm.full_name.trim()) {
      toast.error("Full name is required")
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
        })
        .eq("id", profile?.id)

      if (error) throw error
      
      toast.success("Profile updated successfully")
      await reloadProfile()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error(error.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    try {
      setChangingPassword(true)
      
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      toast.success("Password changed successfully")
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("Error changing password:", error)
      toast.error(error.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  if (authLoading || locationLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Premium Sticky Header */}
      <header className="flex-shrink-0 bg-white border-b-4 border-teal-200 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">
                Manage your account settings and locations
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto ">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {/* Profile Settings */}
          <Card className="border-2 border-teal-100 shadow-lg">
            <CardHeader className="bg-gradient-to-br from-teal-50/50 via-emerald-50/30 to-green-50/30 border-b-2 border-teal-100">
              <CardTitle className="text-xl text-gray-900">Profile Information</CardTitle>
              <CardDescription className="text-gray-600">
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-600" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-slate-50 border-2 border-slate-200 h-11"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    placeholder="Enter your full name"
                    className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-green-600" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+1234567890"
                    className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold text-gray-700">
                    Role
                  </Label>
                  <Input
                    id="role"
                    value={profile?.role || ""}
                    disabled
                    className="bg-slate-50 border-2 border-slate-200 h-11 capitalize"
                  />
                </div>

                <Button
                  onClick={handleProfileUpdate}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white h-11"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-2 border-teal-100 shadow-lg">
            <CardHeader className="bg-gradient-to-br from-teal-50/50 via-emerald-50/30 to-green-50/30 border-b-2 border-teal-100">
              <CardTitle className="text-xl text-gray-900">Change Password</CardTitle>
              <CardDescription className="text-gray-600">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-teal-600" />
                  New Password *
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  Confirm New Password *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white h-11"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* My Locations */}
          <Card className="border-2 border-teal-100 shadow-lg">
            <CardHeader className="bg-gradient-to-br from-teal-50/50 via-emerald-50/30 to-green-50/30 border-b-2 border-teal-100">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-teal-600" />
                My Locations
              </CardTitle>
              <CardDescription className="text-gray-600">
                Locations where you have access
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {locations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Store className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No locations assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div
                      key={location.location_id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        location.location_type === 'store'
                          ? 'border-teal-200 bg-gradient-to-br from-teal-50/50 via-teal-50/30 to-teal-50/20 hover:from-teal-50/70 hover:via-teal-50/50 hover:to-teal-50/40'
                          : 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-emerald-50/30 to-emerald-50/20 hover:from-emerald-50/70 hover:via-emerald-50/50 hover:to-emerald-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          location.location_type === 'store' 
                            ? 'bg-teal-100 text-teal-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {location.location_type === 'store' ? (
                            <Store className="h-5 w-5" />
                          ) : (
                            <Warehouse className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{location.name}</p>
                          {location.address && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {location.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        className={`capitalize ${
                          location.location_type === 'store'
                            ? 'bg-teal-100 text-teal-700 border-teal-200'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {location.location_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
