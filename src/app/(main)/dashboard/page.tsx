'use client'

import { useAuth } from '@/hooks/use-auth'

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>You are not logged in.</div>
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="rounded border p-4">
        <h2 className="font-semibold">User Info</h2>
        <p><strong>Email:</strong> {profile?.email}</p>
        <p><strong>Full Name:</strong> {profile?.full_name ?? "N/A"}</p>
        <p><strong>Role:</strong> {profile?.role ?? "N/A"}</p>
        <p><strong>Location:</strong> {profile?.location?.name ?? "N/A"} ({profile?.location?.location_type})</p>
      </div>

      <button
        onClick={signOut}
        className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
      >
        Sign Out
      </button>
    </div>
  )
}
