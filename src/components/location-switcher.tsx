"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building2, Warehouse as WarehouseIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"

const supabase = createClient()

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
  const router = useRouter()
  const { locations, currentLocation, setCurrentLocation, refresh, isLoading } = useLocation()
  const { profile, loading: authLoading } = useAuth()

  // Add location dialog state
  const [showAddLocationDialog, setShowAddLocationDialog] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [newLocation, setNewLocation] = React.useState({
    name: "",
    address: "",
    location_type: "",
  })

  // Show loading skeleton while auth or location data is loading
  if (authLoading || isLoading) {
    return <LocationSwitcherSkeleton />
  }

  // ---- Sync non-admin user with their profile location ----
  React.useEffect(() => {
    if (profile && profile.role !== "admin" && locations.length > 0) {
      const assigned = locations.find((loc) => loc.location_id === profile.location_id)
      if (assigned && (!currentLocation || currentLocation.location_id !== assigned.location_id)) {
        setCurrentLocation(assigned)
      }
    }
  }, [profile, locations, currentLocation, setCurrentLocation])

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from("locations")
        .insert({
          name: newLocation.name,
          address: newLocation.address || null,
          location_type: newLocation.location_type,
        })
        .select()
        .single()

      if (error) throw error

      await refresh()
      setCurrentLocation(data)

      setNewLocation({ name: "", address: "", location_type: "" })
      setShowAddLocationDialog(false)
      toast.success("Location added successfully!")
    } catch (error: any) {
      toast.error("Failed to add location", { description: error.message })
    } finally {
      setIsSubmitting(false)
    }
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
            <SidebarMenuButton size="lg" disabled>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">No location</span>
                <span className="truncate text-xs">—</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )
    }

    const Icon = getIconFor(userLocation.location_type)

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userLocation.name}</span>
              <span className="truncate text-xs capitalize">
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
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Select a location</span>
              <span className="truncate text-xs">—</span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const ActiveIcon = getIconFor(currentLocation.location_type)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <ActiveIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{currentLocation.name}</span>
                  <span className="truncate text-xs capitalize">
                    {currentLocation.location_type}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Locations
              </DropdownMenuLabel>
              {locations.map((loc, index) => {
                const Icon = getIconFor(loc.location_type)
                const isActive = loc.location_id === currentLocation.location_id
                return (
                  <DropdownMenuItem
                    key={loc.location_id}
                    onClick={() => setCurrentLocation(loc)}
                    className={`gap-2 p-2 ${isActive ? "bg-sidebar-accent/50" : ""}`}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Icon className="size-3.5 shrink-0" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm">{loc.name}</span>
                      <span className="text-muted-foreground text-xs capitalize">
                        {loc.location_type}
                      </span>
                    </div>
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onSelect={(e) => {
                  e.preventDefault()
                  setShowAddLocationDialog(true)
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">Add location</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Add Location Dialog */}
      <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Create a new location for your inventory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLocation}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Location name"
                  className="col-span-3"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newLocation.location_type}
                  onValueChange={(value) => setNewLocation({ ...newLocation, location_type: value })}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select location type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="store">Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <Input
                  id="address"
                  placeholder="Address (optional)"
                  className="col-span-3"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddLocationDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newLocation.name || !newLocation.location_type}
              >
                {isSubmitting ? "Creating..." : "Create Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}