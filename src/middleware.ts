import { type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { defaultLocale, localePrefix, locales } from '@/i18n/config'
import { updateSession } from '@/lib/supabase/middleware'

const intlMiddleware = createMiddleware({
  defaultLocale,
  localePrefix,
  locales,
})

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)
  return await updateSession(request, response)
}

export const config = {
  matcher: [
    
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

