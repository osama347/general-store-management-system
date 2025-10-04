// src/contexts/LocationContext.tsx
"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type LocationType = "store" | "warehouse"

export type Location = {
  location_id: number
  name: string
  location_type: LocationType
  address?: string | null
  created_at?: string
}

type LocationContextType = {
  locations: Location[]
  currentLocation: Location | null
  setCurrentLocation: (loc: Location) => void
  isLoading: boolean
}

const LocationContext = React.createContext<LocationContextType | undefined>(undefined)
const supabase = createClient()

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [currentLocation, setCurrentLocation] = React.useState<Location | null>(null)
  const [authReady, setAuthReady] = React.useState(false)

  // Check auth status
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setAuthReady(!!session)
    }
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setAuthReady(true)
        // Wait a moment for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 100))
        queryClient.invalidateQueries({ queryKey: ['locations'] })
      } else if (event === 'SIGNED_OUT') {
        setAuthReady(false)
        setCurrentLocation(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  // Fetch locations with React Query
  const fetchLocations = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from("locations")
      .select("location_id, name, location_type, address, created_at")

    if (error) {
      console.error("Failed to fetch locations:", error)
      return []
    }

    return data ?? []
  }

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    enabled: authReady,
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  })

  // Auto-select current location when locations load
  React.useEffect(() => {
    if (locations.length === 0) return

    const savedId = Number(localStorage.getItem("active_location_id") || "")
    const bySaved = locations.find(l => l.location_id === savedId)
    setCurrentLocation(bySaved ?? locations[0])
  }, [locations])

  const handleSetCurrent = (loc: Location) => {
    localStorage.setItem("active_location_id", String(loc.location_id))
    setCurrentLocation(loc)
  }

  return (
    <LocationContext.Provider
      value={{
        locations,
        currentLocation,
        setCurrentLocation: handleSetCurrent,
        isLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

/**
 * Custom hook to access location state
 */
export function useLocation() {
  const ctx = React.useContext(LocationContext)
  if (!ctx) throw new Error("useLocation must be used within LocationProvider")

  const queryClient = useQueryClient()
  const {
    locations,
    currentLocation,
    setCurrentLocation,
    isLoading,
  } = ctx

  return {
    locations,
    currentLocation,
    setCurrentLocation,
    isLoading,

    // convenience helpers
    refresh: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
    hasLocations: locations.length > 0,
  }
}
