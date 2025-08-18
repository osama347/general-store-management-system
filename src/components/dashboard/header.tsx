'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  LogOut, 
  Settings, 
  User, 
  Package, 
  ShoppingCart, 
  Users, 
  Warehouse, 
  DollarSign,
  BarChart3,
  FileText,
  Building,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStaff } from '@/contexts/StaffContext'

export function DashboardHeader() {
  const { user, signOut } = useAuth()
  const { currentStaff } = useStaff()
  const pathname = usePathname()

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Sales', href: '/sales', icon: ShoppingCart },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Inventory', href: '/inventory', icon: Warehouse },
    { name: 'Staff', href: '/staff', icon: Users },
    { name: 'Stores', href: '/stores', icon: Building },
    { name: 'Expenses', href: '/expenses', icon: DollarSign },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: FileText },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">
                Store Manager
              </h1>
            </Link>

            {/* Main Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      size="sm"
                      className={`h-8 px-3 gap-2 text-sm ${isActive(item.href) ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-100'}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.name}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            {/* Current Staff Info */}
            {currentStaff && (
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-slate-600">Logged in as:</span>
                <Badge variant="secondary" className="text-xs">
                  {currentStaff.first_name} {currentStaff.last_name}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentStaff.role}
                </Badge>
              </div>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <div className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5"></div>
              <FileText className="h-4 w-4" />
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                    <AvatarFallback>
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    {currentStaff && (
                      <p className="text-xs leading-none text-muted-foreground">
                        Staff ID: {currentStaff.staff_id}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t pt-2 pb-2">
          <nav className="flex space-x-1 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 px-2 gap-1 whitespace-nowrap text-xs ${isActive(item.href) ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-100'}`}
                  >
                    <Icon className="h-3 w-3" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}

