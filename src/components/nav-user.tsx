"use client"

import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from '@/i18n/routing'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'

const supabase = createClient()

export function NavUser() {
  const { user, profile, loading } = useAuth()
  const { isMobile } = useSidebar()
  const t = useTranslations('common.navigation.navUser')
  const router = useRouter()

  const getInitials = (name: string | null) => {
    if (!name) return "UN"
    const names = name.split(" ")
    const initials = names.map((n) => n[0]).join("")
    return initials.toUpperCase()
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
  }

  // Loading skeleton for the user navigation
  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
            <Skeleton className="h-4 w-4 rounded-md" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-teal-50 data-[state=open]:text-teal-900 hover:bg-teal-50 hover:text-teal-900 transition-colors border-t-2 border-teal-100"
            >
              <Avatar className="h-8 w-8 rounded-lg ring-2 ring-teal-200">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? t('fallbackName')} />
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-semibold">
                  {getInitials(profile?.full_name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{profile?.full_name || t('fallbackName')}</span>
                <span className="truncate text-xs text-teal-600">{profile?.email || t('fallbackEmail')}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-teal-600" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border-2 border-teal-100 shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal bg-gradient-to-br from-teal-50/50 via-emerald-50/30 to-green-50/30">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg ring-2 ring-teal-200">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? t('fallbackName')} />
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-semibold">
                    {getInitials(profile?.full_name ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-900">{profile?.full_name || t('fallbackName')}</span>
                  <span className="truncate text-xs text-teal-600">{profile?.email || t('fallbackEmail')}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-teal-100" />
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onClick={() => router.push('/settings')} 
                className="cursor-pointer hover:bg-teal-50 focus:bg-teal-50 text-gray-700"
              >
                <Settings className="text-teal-600" />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 text-gray-700">
                <Bell className="text-emerald-600" />
                {t('notifications')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-teal-100" />
            <DropdownMenuItem 
              onSelect={signOut} 
              className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-700 font-medium"
            >
              <LogOut className="text-red-600" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}