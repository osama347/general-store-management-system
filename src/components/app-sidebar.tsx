"use client"
import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { LocationSwitcher } from "@/components/location-switcher"
import { useLocation } from "@/contexts/LocationContext"
import { useAuth } from "@/hooks/use-auth"
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Warehouse as WarehouseIcon,
  DollarSign,
  CreditCard,
  FileText,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isLoading, hasLocations } = useLocation()
  const { profile, loading: authLoading } = useAuth()

  const base = [{ title: "Dashboard", url: "/dashboard", icon: BarChart3 }]
  
  const storeItems = [
    {
      title: "Products",
      url: "/products",
      icon: Package,
      items: [
        { title: "All Products", url: "/products" },
        { title: "Categories", url: "/products/categories" },
      ],
    },
    {
      title: "Sales",
      url: "/sales",
      icon: ShoppingCart,
      items: [
        { title: "POS", url: "/sales" },
      ],
    },
    { 
      title: "Customers", 
      url: "/customers", 
      icon: Users,
      items: [
        { title: "All Customers", url: "/customers" },
        { title: "Customers Loans", url: "/customers/loans" },
      ],
    },
    { 
      title: "Expenses", 
      url: "/expenses", 
      icon: DollarSign,
      items: [
        { title: "All Expenses", url: "/expenses" },
      ],
    },
  ]

  const warehouseItems = [
    {
      title: "Inventory",
      url: "/inventory",
      icon: WarehouseIcon,
      items: [
        { title: "All Inventory", url: "/inventory" },
        { title: "Inventory Transfers", url: "/inventory/transfers" },
      ],
    },
  ]

  const reports = [
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
      items: [
        { title: "All Reports", url: "/reports" },
      ],
    },
  ]
  
  // Determine which navigation items to show based on user role
  const getNavItems = () => {
    if (authLoading || !profile) {
      // Return empty array while loading or if no profile
      return []
    }
    
    const role = profile.role?.toLowerCase()
    
    switch (role) {
      case 'admin':
        // Admin sees everything
        return [...base, ...storeItems, ...warehouseItems, ...reports]
        
      case 'warehouse-manager':
        // Warehouse manager sees only inventory, products, and reports
        return [...base, ...storeItems.filter(item => item.title === "Products"), ...warehouseItems, ...reports]
        
      case 'store-manager':
        // Store manager sees everything except inventory
        return [...base, ...storeItems, ...reports]
        
      default:
        // Default case - show minimal navigation
        return [...base]
    }
  }

  const navMain = getNavItems()

  // Loading skeleton for the location switcher
  const LocationSwitcherSkeleton = () => (
    <div className="flex flex-col space-y-2">
      <Skeleton className="h-8 w-full rounded-md" />
    </div>
  )

  // Loading skeleton for navigation items
  const NavItemsSkeleton = () => (
    <div className="space-y-4 p-2">
      {/* Dashboard item */}
      <div className="flex items-center gap-3 px-2 py-2">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
      
      {/* Section with subitems */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="h-5 w-5 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="ml-8 space-y-2">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>
      
      {/* More sections */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="h-5 w-5 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="ml-8 space-y-2">
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )

  // Loading skeleton for user profile
  const NavUserSkeleton = () => (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
    </div>
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {isLoading || authLoading ? (
          <LocationSwitcherSkeleton />
        ) : hasLocations ? (
          <LocationSwitcher />
        ) : (
          <div className="text-sm text-muted-foreground px-2 py-1">
            No locations found
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {isLoading || authLoading ? (
          <NavItemsSkeleton />
        ) : (
          <NavMain items={navMain} />
        )}
      </SidebarContent>
      <SidebarFooter>
        {isLoading || authLoading ? (
          <NavUserSkeleton />
        ) : (
          <NavUser />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}