import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { LocationProvider } from "@/contexts/LocationContext"
import { ErrorBoundary } from "@/components/error-boundary"
import { LanguageSwitcher } from "@/components/language-switcher"
import { QueryProvider } from "@/components/providers/query-provider"

export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SidebarProvider>
        <LocationProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 bg-white border-b-2 border-teal-100 shadow-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-3 px-6">
                <SidebarTrigger className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors" />
                <Separator
                  orientation="vertical"
                  className="h-6 bg-teal-100"
                />
                <div className="hidden md:flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-600">General Store Management</span>
                </div>
              </div>
              <div className="flex items-center gap-3 pr-6">
                <LanguageSwitcher />
              </div>
            </header>

            <div className="min-h-screen flex-1 bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/20">
              <main className="container mx-auto px-4 py-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </SidebarInset>
        </LocationProvider>
      </SidebarProvider>
    </QueryProvider>
  )
}
