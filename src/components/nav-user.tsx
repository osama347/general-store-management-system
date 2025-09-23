"use client"

import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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

const supabase = createClient()

export function NavUser() {
  const { user, profile, loading } = useAuth()
  const { isMobile } = useSidebar()

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
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'User'} />
                <AvatarFallback className="rounded-lg">{getInitials(profile?.full_name ?? null)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{profile?.full_name || 'User'}</span>
                <span className="truncate text-xs">{profile?.email || 'user@example.com'}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'User'} />
                  <AvatarFallback className="rounded-lg">{getInitials(profile?.full_name ?? null)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{profile?.full_name || 'User'}</span>
                  <span className="truncate text-xs">{profile?.email || 'user@example.com'}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="cursor-pointer">
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}