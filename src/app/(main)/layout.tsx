import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardHeader } from '@/components/dashboard/header'
import { StaffProvider } from '@/contexts/StaffContext'

export default function GeneralLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <StaffProvider>
        <div className="min-h-screen bg-slate-50">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </StaffProvider>
    </ProtectedRoute>
  )
}