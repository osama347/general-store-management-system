import { ProtectedRoute } from "@/components/auth/protected-route"
import { StaffProvider } from "@/contexts/StaffContext"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { LocationProvider } from "@/contexts/LocationContext"
import { QueryProvider } from "@/components/providers/query-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SidebarProvider>
        <ProtectedRoute>
          <StaffProvider>
            <LocationProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                      orientation="vertical"
                      className="mr-2 data-[orientation=vertical]:h-4"
                    />
                  </div>
                  <div className="flex items-center pr-4">
                    <LanguageSwitcher />
                  </div>
                </header>

                <div className="min-h-screen bg-slate-50">
                  <main className="container mx-auto px-4 py-6">
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </main>
                </div>
              </SidebarInset>
            </LocationProvider>
          </StaffProvider>
        </ProtectedRoute>
      </SidebarProvider>
    </QueryProvider>
  )
}
