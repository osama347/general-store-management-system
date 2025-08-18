'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

interface Staff {
  staff_id: string
  first_name: string
  last_name: string
  email: string
  role: string
  hire_date: string
}

interface StaffContextType {
  currentStaff: Staff | null
  isLoading: boolean
  error: string | null
}

const StaffContext = createContext<StaffContextType | undefined>(undefined)

export function StaffProvider({ children }: { children: ReactNode }) {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchCurrentStaff() {
      if (!user?.email) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('email', user.email)
          .single()

        if (staffError) {
          if (staffError.code === 'PGRST116') {
            // No staff found with this email
            setError('No staff account found for this user')
          } else {
            setError(`Error fetching staff: ${staffError.message}`)
          }
        } else {
          setCurrentStaff(staff)
        }
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentStaff()
  }, [user?.email, supabase])

  const value: StaffContextType = {
    currentStaff,
    isLoading,
    error
  }

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  )
}

export function useStaff() {
  const context = useContext(StaffContext)
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider')
  }
  return context
}

