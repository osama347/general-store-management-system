/**
 * Location Management Service
 * Handles location CRUD operations with limit enforcement
 */

import { createClient } from '@/lib/supabase/client'
import { config } from '@/lib/config'

export type LocationType = 'store' | 'warehouse'

export interface Location {
  location_id: number
  name: string
  location_type: LocationType
  address: string | null
  created_at: string
}

export interface CreateLocationInput {
  name: string
  location_type: LocationType
  address?: string
}

export interface UpdateLocationInput {
  name?: string
  address?: string
}

/**
 * Get all locations accessible to the current user
 * Note: RLS policies handle access control
 * - Admins see all locations
 * - Staff see only their assigned location
 */
export async function getMyLocations(): Promise<Location[]> {
  const supabase = createClient()

  // RLS policies will automatically filter based on user role
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('location_type')
    .order('name')

  if (error) throw error
  return data as Location[]
}

/**
 * Get location counts by type for the current user
 * Note: RLS policies handle access control - only admins see all locations
 */
export async function getLocationCounts(): Promise<{ stores: number; warehouses: number }> {
  const supabase = createClient()

  // RLS policies will automatically filter based on user role
  const { data, error } = await supabase
    .from('locations')
    .select('location_type')

  if (error) throw error

  const stores = data.filter(l => l.location_type === 'store').length
  const warehouses = data.filter(l => l.location_type === 'warehouse').length

  return { stores, warehouses }
}

/**
 * Check if user can create a new location of given type
 */
export async function canCreateLocation(type: LocationType): Promise<boolean> {
  const counts = await getLocationCounts()
  
  if (type === 'store') {
    return counts.stores < config.maxStores
  } else {
    return counts.warehouses < config.maxWarehouses
  }
}

/**
 * Get remaining location slots
 */
export async function getRemainingSlots(): Promise<{ stores: number; warehouses: number }> {
  const counts = await getLocationCounts()
  
  return {
    stores: Math.max(0, config.maxStores - counts.stores),
    warehouses: Math.max(0, config.maxWarehouses - counts.warehouses),
  }
}

/**
 * Create a new location (with limit enforcement)
 */
export async function createLocation(input: CreateLocationInput): Promise<Location> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can create locations')
  }

  // Check if user can create this type of location
  const canCreate = await canCreateLocation(input.location_type)
  if (!canCreate) {
    const limit = input.location_type === 'store' ? config.maxStores : config.maxWarehouses
    throw new Error(`You have reached the maximum limit of ${limit} ${input.location_type}(s)`)
  }

  const { data, error } = await supabase
    .from('locations')
    .insert({
      name: input.name,
      location_type: input.location_type,
      address: input.address || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Location
}

/**
 * Update a location (only name and address)
 */
export async function updateLocation(
  locationId: number,
  updates: UpdateLocationInput
): Promise<Location> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can update locations')
  }

  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('location_id', locationId)
    .select()
    .single()

  if (error) throw error
  return data as Location
}

/**
 * Delete a location (only if no staff assigned and no data)
 */
export async function deleteLocation(locationId: number): Promise<void> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can delete locations')
  }

  // Check if there are staff assigned
  const { data: staff } = await supabase
    .from('profiles')
    .select('id')
    .eq('location_id', locationId)
    .limit(1)

  if (staff && staff.length > 0) {
    throw new Error('Cannot delete location with assigned staff. Please reassign or remove staff first.')
  }

  // Check if there's inventory
  const { data: inventory } = await supabase
    .from('inventory')
    .select('product_id')
    .eq('location_id', locationId)
    .limit(1)

  if (inventory && inventory.length > 0) {
    throw new Error('Cannot delete location with inventory. Please transfer or remove inventory first.')
  }

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('location_id', locationId)

  if (error) throw error
}

/**
 * Get a single location by ID
 */
export async function getLocation(locationId: number): Promise<Location> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's profile to check access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')

  // Check if user has access to this location
  if (profile.role !== 'admin' && profile.location_id !== locationId) {
    throw new Error('Access denied')
  }

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('location_id', locationId)
    .single()

  if (error) throw error
  return data as Location
}
