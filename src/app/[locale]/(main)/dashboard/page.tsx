'use client'

import { useAuth } from '@/hooks/use-auth'
import { useLocation } from '@/contexts/LocationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Building, Truck, Package } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useFormatter, useTranslations } from 'next-intl'

// Import new dashboard components
import { KPICards } from '@/components/dashboard/kpi-cards'
import { SalesChart, ExpenseChart } from '@/components/dashboard/charts'
import { RevenueExpenseChart } from '@/components/dashboard/revenue-expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { DashboardSkeleton } from '@/components/dashboard/skeletons'
import { LowStockAlerts } from '@/components/dashboard/low-stock-alerts'
import { TopPerformingProducts } from '@/components/dashboard/top-products'

export default function DashboardPage() {
  const profile = useAuth()
  const { currentLocation, locations, isLoading: locationLoading, setCurrentLocation } = useLocation()
  const t = useTranslations('dashboard')
  const formatter = useFormatter()
  
  // Current month date range (no picker needed)
  const currentMonthRange = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: startOfMonth, to: endOfMonth }
  }, [])
  
  // Memoize values to prevent unnecessary re-renders
  const userRole = useMemo(() => profile?.profile?.role || 'store_manager', [profile?.profile?.role])
  const isAdmin = useMemo(() => userRole === 'admin', [userRole])
  const isWarehouseManager = useMemo(() => userRole === 'warehouse_manager', [userRole])
  
  // Updated location and dashboard type logic
  const { locationFilter, dashboardType } = useMemo(() => {
    // Non-admin users: use their assigned location
    if (!isAdmin && currentLocation) {
      return {
        locationFilter: currentLocation.location_id.toString(),
        dashboardType: currentLocation.location_type // 'warehouse' or 'store'
      }
    }
    
    // Admin users: behavior based on selected location
    if (isAdmin && currentLocation) {
      return {
        locationFilter: currentLocation.location_id.toString(),
        dashboardType: currentLocation.location_type // Show dashboard type based on selected location
      }
    }
    
    // Admin with no location selected: show overall dashboard
    if (isAdmin) {
      return {
        locationFilter: null,
        dashboardType: 'overall' // Show combined data
      }
    }
    
    // Default fallback
    return {
      locationFilter: null,
      dashboardType: 'store'
    }
  }, [isAdmin, currentLocation])
  
  // Determine if current view should show warehouse-specific features
  const showWarehouseFeatures = useMemo(() => {
    return dashboardType === 'warehouse' || isWarehouseManager
  }, [dashboardType, isWarehouseManager])

  // Dashboard header based on current dashboard type
  const getDashboardTitle = useCallback(() => {
    if (dashboardType === 'warehouse') return t('header.title.warehouse')
    if (dashboardType === 'store') return t('header.title.store')
    if (dashboardType === 'overall') return t('header.title.overall')
    return t('header.title.default')
  }, [dashboardType, t])
  
  const getDashboardDescription = useCallback(() => {
    if (dashboardType === 'warehouse') return t('header.description.warehouse')
    if (dashboardType === 'store') return t('header.description.store')
    if (dashboardType === 'overall') return t('header.description.overall')
    return t('header.description.default')
  }, [dashboardType, t])

  const getLocationTypeLabel = useCallback((type: string | null | undefined) => {
    if (type === 'warehouse') return t('locationType.warehouse')
    if (type === 'store') return t('locationType.store')
    return type ?? ''
  }, [t])

  // Current Month Display Component
  function CurrentMonthDisplay() {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <CalendarIcon className="h-4 w-4" />
        <span>
          {t('common.currentMonth', {
            date: formatter.dateTime(currentMonthRange.from, {
              month: 'long',
              year: 'numeric',
            }),
          })}
        </span>
      </div>
    )
  }
  
  // // Location Selector (only for admin)
  // function LocationSelector() {
  //   if (!isAdmin) return null
    
  //   return (
  //     <div className="flex items-center space-x-2">
  //       <span className="text-sm font-medium">{t('common.locationLabel')}</span>
  //       <div className="flex items-center space-x-1">
  //         {locations.map(location => (
  //           <Button
  //             key={location.location_id}
  //             variant={currentLocation?.location_id === location.location_id ? "default" : "outline"}
  //             size="sm"
  //             onClick={() => currentLocation?.location_id !== location.location_id && setCurrentLocation(location)}
  //           >
  //             {location.name}
  //           </Button>
  //         ))}
  //       </div>
  //     </div>
  //   )
  // }

  // Show loading state while auth or location data is loading
  if (!profile?.profile || locationLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Premium Header */}
      <header className="bg-gradient-to-br from-teal-600 via-emerald-600 to-green-600 shadow-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                {currentLocation?.location_type === 'warehouse' ? (
                  <Building className="h-6 w-6 text-white" />
                ) : (
                  <Truck className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{getDashboardTitle()}</h1>
                <p className="text-white/80 text-sm">{currentLocation?.name || getDashboardDescription()}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <CalendarIcon className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  {formatter.dateTime(currentMonthRange.from, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <Avatar className="h-9 w-9 ring-2 ring-white/30">
                  <AvatarImage src={profile.profile.avatar_url || ''} />
                  <AvatarFallback className="bg-white/30 text-white font-bold">
                    {profile.profile.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-white text-sm">{profile.profile.full_name}</div>
                  <div className="text-xs text-white/80 capitalize font-medium">
                    {profile.profile.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      
      {/* KPI Cards */}
      <KPICards 
        userRole={userRole} 
        locationFilter={locationFilter} 
        dateRange={currentMonthRange}
        dashboardType={dashboardType}
      />
      
      {/* Top Row: Low Stock Alerts & Top Products - Only for store dashboards */}
      {!showWarehouseFeatures && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LowStockAlerts locationFilter={locationFilter} dashboardType={dashboardType} />
          <TopPerformingProducts 
            locationFilter={locationFilter} 
            dateRange={currentMonthRange}
            dashboardType={dashboardType} 
          />
        </div>
      )}

      {/* Low Stock for Warehouse */}
      {showWarehouseFeatures && (
        <div className="grid grid-cols-1 gap-6">
          <LowStockAlerts locationFilter={locationFilter} dashboardType={dashboardType} />
        </div>
      )}
      
      {/* Charts - Only for store dashboards */}
      {!showWarehouseFeatures && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesChart userRole={userRole} locationFilter={locationFilter} dashboardType={dashboardType} />
            <ExpenseChart userRole={userRole} locationFilter={locationFilter} dashboardType={dashboardType} />
          </div>
          
          {/* Revenue vs Expense Comparison Chart */}
          <RevenueExpenseChart 
            userRole={userRole} 
            locationFilter={locationFilter} 
            dashboardType={dashboardType} 
          />
        </>
      )}
      
      {/* Recent Transactions */}
      <Card className="border-2 border-slate-200 shadow-lg rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Recent Transactions</CardTitle>
              <CardDescription className="text-sm">
                {showWarehouseFeatures
                  ? 'Latest inventory transfers and movements'
                  : 'Recent sales, expenses, and activities'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <RecentTransactions 
            userRole={userRole} 
            locationFilter={locationFilter} 
            dashboardType={dashboardType}
          />
        </CardContent>
      </Card>
      
    
      </div>
      </div>
    
  )
}