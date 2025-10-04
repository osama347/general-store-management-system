/**
 * Staff Management Service
 * Handles all staff-related operations including hiring, updating, and removing staff
 */

import { createClient } from '@/lib/supabase/client'

export type StaffRole = 'admin' | 'warehouse-manager' | 'store-manager'

export interface StaffMember {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  phone: string | null
  hire_date: string | null
  is_active: boolean
  location_id: number | null
  location?: {
    location_id: number
    name: string
    location_type: string
  }
}

export interface CreateStaffInput {
  email: string
  password: string
  full_name: string
  role: StaffRole
  location_id: number
  phone?: string
}

/**
 * Get all staff members (non-admin users) for the current admin user
 * Note: RLS policies handle access control - only admins can see all profiles
 */
export async function getMyStaff(): Promise<StaffMember[]> {
  const supabase = createClient()

  // RLS policies will enforce admin-only access
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      role,
      phone,
      hire_date,
      is_active,
      location_id,
      location:locations!profiles_location_id_fkey (
        location_id,
        name,
        location_type
      )
    `)
    .neq('role', 'admin')
    .order('full_name')

  if (error) throw error
  return (data as any) as StaffMember[]
}

/**
 * Get staff members for a specific location
 * Note: RLS policies handle access control
 */
export async function getLocationStaff(locationId: number): Promise<StaffMember[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      role,
      phone,
      hire_date,
      is_active,
      location_id,
      location:locations!profiles_location_id_fkey (
        location_id,
        name,
        location_type
      )
    `)
    .neq('role', 'admin')
    .eq('location_id', locationId)
    .order('full_name')

  if (error) throw error
  return (data as any) as StaffMember[]
}

/**
 * Create a new staff member directly via admin API
 * No invitation email - user is created with password immediately
 */
export async function createStaff(input: CreateStaffInput) {
  // Call our server-side API route that has access to admin privileges
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create staff member')
  }

  const result = await response.json()
  return result.data
}

/**
 * Update staff member details
 */
export async function updateStaff(
  staffId: string,
  updates: Partial<Pick<StaffMember, 'full_name' | 'role' | 'phone' | 'is_active' | 'location_id'>>
) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify current user is admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') {
    throw new Error('Only admins can update staff members')
  }

  // Verify we're not trying to update an admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', staffId)
    .single()

  if (targetProfile?.role === 'admin') {
    throw new Error('Cannot update admin users')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', staffId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove/deactivate a staff member
 */
export async function removeStaff(staffId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify current user is admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') {
    throw new Error('Only admins can remove staff members')
  }

  // Verify we're not trying to remove an admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', staffId)
    .single()

  if (targetProfile?.role === 'admin') {
    throw new Error('Cannot remove admin users')
  }

  // Deactivate instead of deleting
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', staffId)

  if (error) throw error
}

/**
 * Transfer staff member to another location
 */
export async function transferStaff(staffId: string, newLocationId: number) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify current user is admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') {
    throw new Error('Only admins can transfer staff members')
  }

  // Verify we're not trying to transfer an admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', staffId)
    .single()

  if (targetProfile?.role === 'admin') {
    throw new Error('Cannot transfer admin users')
  }

  // Verify location exists
  const { data: location } = await supabase
    .from('locations')
    .select('location_id')
    .eq('location_id', newLocationId)
    .single()

  if (!location) {
    throw new Error('Location not found')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ location_id: newLocationId })
    .eq('id', staffId)
    .select()
    .single()

  if (error) throw error
  return data
}
