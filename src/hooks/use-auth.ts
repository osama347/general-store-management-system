'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string | null
  location_id: number | null
  location?: {
    location_id: number
    name: string
    location_type: string
  } | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadProfile = async (uid: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        role,
        location_id,
        location:locations!profiles_location_id_fkey (
          location_id,
          name,
          location_type
        )
      `)
      .eq('id', uid)
      .single()

    setProfile(profileData as Profile | null)
  }

  useEffect(() => {
    // ✅ Fast local session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user) // immediate set
        loadProfile(session.user.id) // fetch profile async
      }
      setLoading(false)
    })

    // ✅ Listen for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }


  return {
    user,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user,
  }
}

