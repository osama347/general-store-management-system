import { defaultLocale } from '@/i18n/config'
import { NextResponse } from 'next/server'

export function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next')
  const fallback = `/${defaultLocale}/dashboard`
  const target = next && next.startsWith('/') ? next : fallback

  return NextResponse.redirect(`${origin}${target}`)
}

