'use client'

import { useAuth } from '@/hooks/use-auth'
import { useLocation } from '@/contexts/LocationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Building, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useState, useCallback, useMemo } from 'react'

// Import new dashboard components
import { KPICards } from '@/components/dashboard/kpi-cards'
import { SalesChart, ExpenseChart } from '@/components/dashboard/charts'
import { InventoryTable } from '@/components/dashboard/inventory-table'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardSkeleton } from '@/components/dashboard/skeletons'

export default function DashboardPage() {
  const profile = useAuth()
  const { currentLocation, locations, isLoading: locationLoading, setCurrentLocation } = useLocation()
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  
  // Memoize values to prevent unnecessary re-renders
  const userRole = useMemo(() => profile?.profile?.role || 'store_manager', [profile?.profile?.role])
  const isAdmin = useMemo(() => userRole === 'admin', [userRole])
  const isWarehouseManager = useMemo(() => userRole === 'warehouse_manager', [userRole])
  
  // Memoize location filter
  const locationFilter = useMemo(() => {
    if (isAdmin) return null
    if (currentLocation) return currentLocation.location_id.toString()
    return null
  }, [isAdmin, currentLocation])

  // Dashboard header based on role
  const getDashboardTitle = useCallback(() => {
    if (isAdmin) return "Business Dashboard"
    if (isWarehouseManager) return "Warehouse Dashboard"
    return "Store Dashboard"
  }, [isAdmin, isWarehouseManager])
  
  const getDashboardDescription = useCallback(() => {
    if (isAdmin) return "Overview of all business operations"
    if (isWarehouseManager) return "Inventory and transfer management"
    return "Sales and store performance"
  }, [isAdmin, isWarehouseManager])

  // Date Range Picker Component
  function DateRangePicker() {
    return (
      <div className="flex items-center space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                if (range) {
                  setDateRange(range as { from: Date; to: Date })
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
  
  // Location Selector (only for admin)
  function LocationSelector() {
    if (!isAdmin) return null
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Location:</span>
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
                {currentLocation.name} {isAdmin && `(${currentLocation.location_type})`}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <LocationSelector />
          {!isWarehouseManager && <DateRangePicker />}
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
        dateRange={dateRange} 
      />
      
      {/* Charts - Only for admin and store managers */}
      {!isWarehouseManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SalesChart userRole={userRole} locationFilter={locationFilter} />
          <ExpenseChart userRole={userRole} locationFilter={locationFilter} />
        </div>
      )}
      
      {/* Inventory & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {isWarehouseManager ? "Inventory Status" : "Low Stock Items"}
            </CardTitle>
            <CardDescription>
              {isWarehouseManager 
                ? "Current stock levels in warehouse" 
                : "Products that need restocking"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryTable userRole={userRole} locationFilter={locationFilter} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              {isWarehouseManager 
                ? "Latest inventory transfers" 
                : "Latest transactions and updates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed userRole={userRole} locationFilter={locationFilter} />
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Tables Placeholder */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>
                  Key metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Overview content will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="detailed">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Reports</CardTitle>
                <CardDescription>
                  Comprehensive business reports and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Detailed reports will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}