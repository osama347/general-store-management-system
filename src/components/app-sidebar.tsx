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
import { useFormatter, useTranslations } from 'next-intl'

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {

  const t = useTranslations('common.navigation')
  const formatter = useFormatter()
  const { isLoading, hasLocations } = useLocation()
  const { profile, loading: authLoading } = useAuth()

  // Get translated titles for comparison
  const productsTitle = t("products.title")
  
  const base = [{ title: t('dashboard'), url: "/dashboard", icon: BarChart3 }]
  
  const storeItems = [
    {
      title: productsTitle,
      url: "/products",
      icon: Package,
      items: [
        { title: t('products.all-products'), url: "/products" },
        { title: t('products.categories'), url: "/products/categories" },
      ],
    },
    {
      title: t("sales"),
      url: "/sales",
      icon: ShoppingCart,
      items: [
        { title: "POS", url: "/sales" },
      ],
    },
    { 
      title: t('customers.title'), 
      url: "/customers", 
      icon: Users,
      items: [
        { title: t('customers.all-customers'), url: "/customers" },
        { title: t('customers.customers-loans'), url: "/customers/loans" },
      ],
    },
    { 
      title: t('expenses.title'), 
      url: "/expenses", 
      icon: DollarSign,
      items: [
        { title: t('expenses.all-expenses'), url: "/expenses" },
      ],
    },
  ]

  const warehouseItems = [
    {
      title: t('inventory.title'),
      url: "/inventory",
      icon: WarehouseIcon,
      items: [
        { title: t('inventory.all-inventory'), url: "/inventory" },
        { title: t('inventory.inventory-transfers'), url: "/inventory/transfers" },
      ],
    },
  ]

  const reports = [
    {
      title: t('reports'),
      url: "/reports",
      icon: FileText,
      items: [
        { title: 'all reports', url: "/reports" },
      ],
    },
  ]

  const adminItems = [
    {
      title: "Locations",
      url: "/locations",
      icon: WarehouseIcon,
      items: [
        { title: "All Locations", url: "/locations" },
      ],
    },
    {
      title: "Staff",
      url: "/staff",
      icon: Users,
      items: [
        { title: "All Staff", url: "/staff" },
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
        // Admin sees everything including staff and locations management
        return [...base, ...storeItems, ...warehouseItems, ...reports, ...adminItems]
        
      case 'warehouse-manager':
        // Warehouse manager sees only inventory, products, and reports
        return [...base, ...storeItems.filter(item => item.title === productsTitle), ...warehouseItems, ...reports]
        
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

  // Only show loading on initial load, not on subsequent re-renders
  const [hasLoaded, setHasLoaded] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading && profile) {
      setHasLoaded(true)
    }
  }, [authLoading, profile])

  const showLoading = (authLoading && !hasLoaded) || (isLoading && !hasLoaded)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {showLoading ? (
          <LocationSwitcherSkeleton />
        ) : hasLocations ? (
          <LocationSwitcher />
        ) : (
          <div className="text-sm text-muted-foreground px-2 py-1">
            {t('no-locations-found')}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {showLoading ? (
          <NavItemsSkeleton />
        ) : (
          <NavMain items={navMain} />
        )}
      </SidebarContent>
      <SidebarFooter>
        {showLoading ? (
          <NavUserSkeleton />
        ) : (
          <NavUser />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}