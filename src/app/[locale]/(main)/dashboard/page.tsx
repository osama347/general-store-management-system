'use client'

import { useAuth } from '@/hooks/use-auth'
import { useLocation } from '@/contexts/LocationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Building, Truck } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useFormatter, useTranslations } from 'next-intl'

// Import new dashboard components
import { KPICards } from '@/components/dashboard/kpi-cards'
import { SalesChart, ExpenseChart } from '@/components/dashboard/charts'
import { InventoryTable } from '@/components/dashboard/inventory-table'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardSkeleton } from '@/components/dashboard/skeletons'

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
    if (dashboardType === 'warehouse') return t('title.warehouse')
    if (dashboardType === 'store') return t('title.store')
    if (dashboardType === 'overall') return t('title.overall')
    return t('title.default')
  }, [dashboardType, t])
  
  const getDashboardDescription = useCallback(() => {
    if (dashboardType === 'warehouse') return t('description.warehouse')
    if (dashboardType === 'store') return t('description.store')
    if (dashboardType === 'overall') return t('description.overall')
    return t('description.default')
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
          {t('currentMonth', {
            date: formatter.dateTime(currentMonthRange.from, {
              month: 'long',
              year: 'numeric',
            }),
          })}
        </span>
      </div>
    )
  }
  
  // Location Selector (only for admin)
  function LocationSelector() {
    if (!isAdmin) return null
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">{t('locationLabel')}</span>
        <div className="flex items-center space-x-1">
          {locations.map(location => (
            <Button
              key={location.location_id}
              variant={currentLocation?.location_id === location.location_id ? "default" : "outline"}
              size="sm"
              onClick={() => currentLocation?.location_id !== location.location_id && setCurrentLocation(location)}
            >
              {location.name}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Show loading state while auth or location data is loading
  if (!profile?.profile || locationLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{getDashboardTitle()}</h1>
          <p className="text-muted-foreground">{getDashboardDescription()}</p>
          {currentLocation && (
            <div className="flex items-center mt-1">
              {currentLocation.location_type === 'warehouse' ? (
                <Building className="h-4 w-4 mr-1 text-blue-500" />
              ) : (
                <Truck className="h-4 w-4 mr-1 text-green-500" />
              )}
              <span className="text-sm text-muted-foreground">
                {currentLocation.name}
                {isAdmin && (
                  <> ({getLocationTypeLabel(currentLocation.location_type)})</>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <LocationSelector />
          <CurrentMonthDisplay />
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.profile.avatar_url || ''} />
              <AvatarFallback>{profile.profile.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{profile.profile.full_name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {profile.profile.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <KPICards 
        userRole={userRole} 
        locationFilter={locationFilter} 
        dateRange={currentMonthRange}
        dashboardType={dashboardType}
      />
      
      {/* Charts - Only for store dashboards */}
      {!showWarehouseFeatures && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SalesChart userRole={userRole} locationFilter={locationFilter} dashboardType={dashboardType} />
          <ExpenseChart userRole={userRole} locationFilter={locationFilter} dashboardType={dashboardType} />
        </div>
      )}
      
      {/* Inventory & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {showWarehouseFeatures
                ? t('inventory.titleWarehouse')
                : t('inventory.titleStore')}
            </CardTitle>
            <CardDescription>
              {showWarehouseFeatures
                ? t('inventory.descWarehouse')
                : t('inventory.descStore')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryTable 
              userRole={userRole} 
              locationFilter={locationFilter} 
              dashboardType={dashboardType}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('activity.title')}</CardTitle>
            <CardDescription>
              {showWarehouseFeatures
                ? t('activity.descWarehouse')
                : t('activity.descStore')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed 
              userRole={userRole} 
              locationFilter={locationFilter} 
              dashboardType={dashboardType}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Tables Placeholder */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="detailed">{t('tabs.detailed')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>{t('cards.overview.title')}</CardTitle>
                <CardDescription>
                  {t('cards.overview.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('cards.overview.placeholder')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="detailed">
            <Card>
              <CardHeader>
                <CardTitle>{t('cards.detailed.title')}</CardTitle>
                <CardDescription>
                  {t('cards.detailed.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('cards.detailed.placeholder')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}