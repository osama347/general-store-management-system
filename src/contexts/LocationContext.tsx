// src/contexts/LocationContext.tsx
"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"

export type LocationType = "store" | "warehouse"

export type Location = {
  location_id: number
  name: string
  location_type: LocationType
}

type LocationContextType = {
  locations: Location[]
  currentLocation: Location | null
  setCurrentLocation: (loc: Location) => void
  setLocations: (locs: Location[]) => void
  loadLocations: () => Promise<void>
  loading: boolean
}

const LocationContext = React.createContext<LocationContextType | undefined>(undefined)
const supabase = createClient()

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = React.useState<Location[]>([])
  const [currentLocation, setCurrentLocation] = React.useState<Location | null>(null)
  const [loading, setLoading] = React.useState(true)

  // reselect when new locations arrive
  React.useEffect(() => {
    if (locations.length === 0) {
      setLoading(false)
      return
    }

    const savedId = Number(localStorage.getItem("active_location_id") || "")
    const bySaved = locations.find(l => l.location_id === savedId)
    setCurrentLocation(bySaved ?? locations[0])
    setLoading(false)
  }, [locations])

  const handleSetCurrent = (loc: Location) => {
    localStorage.setItem("active_location_id", String(loc.location_id))
    setCurrentLocation(loc)
  }

  // fetch locations from Supabase
  const loadLocations = React.useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("locations")
        .select("location_id, name, location_type")

      if (error) throw error
      setLocations(data ?? [])
    } catch (err) {
      console.error("Failed to fetch locations:", err)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [])

  // auto-load once on mount
  React.useEffect(() => {
    loadLocations()
  }, [loadLocations])

  return (
    <LocationContext.Provider
      value={{
        locations,
        currentLocation,
        setCurrentLocation: handleSetCurrent,
        setLocations,
        loadLocations,
        loading,
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

  const {
    locations,
    currentLocation,
    setCurrentLocation,
    setLocations,
    loadLocations,
    loading,
  } = ctx

  return {
    locations,
    currentLocation,
    setCurrentLocation,
    setLocations,
    loadLocations,

    // convenience helpers
    refresh: loadLocations,
    hasLocations: locations.length > 0,
    isLoading: loading,
  }
}
