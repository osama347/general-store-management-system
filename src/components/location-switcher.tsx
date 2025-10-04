"use client"

import * as React from "react"
import { ChevronsUpDown, Building2, Warehouse as WarehouseIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useLocation, type Location } from "@/contexts/LocationContext"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"

function getIconFor(type: Location["location_type"]) {
  return type === "warehouse" ? WarehouseIcon : Building2
}

// Loading skeleton for the location switcher
function LocationSwitcherSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" disabled>
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="grid flex-1 text-left text-sm leading-tight gap-1">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <Skeleton className="h-4 w-4 rounded-md" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function LocationSwitcher() {
  const { isMobile } = useSidebar()
  const { locations, currentLocation, setCurrentLocation, isLoading } = useLocation()
  const { profile, loading: authLoading } = useAuth()

  // Track if initial load is complete to prevent loading skeleton on tab switch
  const [hasLoaded, setHasLoaded] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading && !isLoading && profile) {
      setHasLoaded(true)
    }
  }, [authLoading, isLoading, profile])

  // ---- Sync non-admin user with their profile location ----
  // This useEffect must be called before any early returns to maintain hooks order
  React.useEffect(() => {
    if (profile && profile.role !== "admin" && locations.length > 0) {
      const assigned = locations.find((loc) => loc.location_id === profile.location_id)
      if (assigned && (!currentLocation || currentLocation.location_id !== assigned.location_id)) {
        setCurrentLocation(assigned)
      }
    }
  }, [profile, locations, currentLocation, setCurrentLocation])

  // Only show loading on initial load, not on subsequent re-renders
  const showLoading = ((authLoading && !hasLoaded) || (isLoading && !hasLoaded))

  // Show loading skeleton while auth or location data is loading
  if (showLoading) {
    return <LocationSwitcherSkeleton />
  }

  if (!profile) return null // wait until profile is loaded

  // -------------------------
  // NON-ADMIN: fixed location
  // -------------------------
  if (profile.role !== "admin") {
    const userLocation = locations.find(
      (loc) => loc.location_id === profile.location_id
    )

    if (!userLocation) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" disabled className="bg-slate-50 border-2 border-slate-200">
              <div className="bg-slate-200 text-slate-500 flex aspect-square size-8 items-center justify-center rounded-lg" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-gray-600">No location</span>
                <span className="truncate text-xs text-gray-400">—</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )
    }

    const Icon = getIconFor(userLocation.location_type)
    const isTealTheme = userLocation.location_type === "store"

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton 
            size="lg" 
            disabled 
            className={`border-2 ${
              isTealTheme 
                ? 'bg-gradient-to-br from-teal-50/50 to-teal-50/30 border-teal-200' 
                : 'bg-gradient-to-br from-emerald-50/50 to-emerald-50/30 border-emerald-200'
            }`}
          >
            <div className={`flex aspect-square size-8 items-center justify-center rounded-lg ${
              isTealTheme 
                ? 'bg-gradient-to-br from-teal-500 to-teal-600' 
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}>
              <Icon className="size-4 text-white" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-gray-900">{userLocation.name}</span>
              <span className={`truncate text-xs capitalize font-medium ${
                isTealTheme ? 'text-teal-600' : 'text-emerald-600'
              }`}>
                {userLocation.location_type}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // -------------------------
  // ADMIN: full dropdown
  // -------------------------
  if (!currentLocation) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled className="bg-slate-50 border-2 border-slate-200">
            <div className="bg-slate-200 text-slate-500 flex aspect-square size-8 items-center justify-center rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-gray-600">Select a location</span>
              <span className="truncate text-xs text-gray-400">—</span>
            </div>
            <ChevronsUpDown className="ml-auto text-slate-400" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const ActiveIcon = getIconFor(currentLocation.location_type)
  const isActiveStore = currentLocation.location_type === "store"

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className={`data-[state=open]:bg-teal-50 data-[state=open]:text-teal-900 hover:bg-teal-50 hover:text-teal-900 transition-colors border-2 ${
                  isActiveStore ? 'border-teal-200 bg-teal-50/30' : 'border-emerald-200 bg-emerald-50/30'
                }`}
              >
                <div className={`flex aspect-square size-8 items-center justify-center rounded-lg ${
                  isActiveStore 
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600' 
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                }`}>
                  <ActiveIcon className="size-4 text-white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-900">{currentLocation.name}</span>
                  <span className={`truncate text-xs capitalize font-medium ${
                    isActiveStore ? 'text-teal-600' : 'text-emerald-600'
                  }`}>
                    {currentLocation.location_type}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto text-teal-600" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border-2 border-teal-100 shadow-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs font-semibold text-teal-700 uppercase tracking-wide bg-gradient-to-br from-teal-50/50 via-emerald-50/30 to-green-50/30">
                Locations
              </DropdownMenuLabel>
              {locations.map((loc, index) => {
                const Icon = getIconFor(loc.location_type)
                const isActive = loc.location_id === currentLocation.location_id
                const isStore = loc.location_type === "store"
                return (
                  <DropdownMenuItem
                    key={loc.location_id}
                    onClick={() => setCurrentLocation(loc)}
                    className={`gap-2 p-2 cursor-pointer ${
                      isActive 
                        ? isStore 
                          ? 'bg-teal-50 text-teal-900' 
                          : 'bg-emerald-50 text-emerald-900'
                        : 'hover:bg-teal-50'
                    }`}
                  >
                    <div className={`flex size-6 items-center justify-center rounded-md border-2 ${
                      isStore ? 'border-teal-200 bg-teal-50' : 'border-emerald-200 bg-emerald-50'
                    }`}>
                      <Icon className={`size-3.5 shrink-0 ${
                        isStore ? 'text-teal-600' : 'text-emerald-600'
                      }`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{loc.name}</span>
                      <span className={`text-xs capitalize font-medium ${
                        isStore ? 'text-teal-600' : 'text-emerald-600'
                      }`}>
                        {loc.location_type}
                      </span>
                    </div>
                    <DropdownMenuShortcut className="text-teal-600">⌘{index + 1}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}