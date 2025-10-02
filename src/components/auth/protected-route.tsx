'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-provider'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('common')

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth`)
    }
  }, [user, loading, router, locale])

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 w-[300px]">
            <div className="h-8 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-8 bg-gray-200 rounded-md animate-pulse w-3/4" />
            <div className="h-8 bg-gray-200 rounded-md animate-pulse w-1/2" />
            <div className="flex items-center justify-center mt-6"></div>
              <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
            </div>
          
        </div>
      )
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

