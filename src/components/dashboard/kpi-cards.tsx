'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingDown, Users, Package, ArrowUpRight, ArrowDownRight, Building, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { KPICardSkeleton } from './skeletons'
import { safeNumericValue } from '@/lib/data-validation'

interface KPIData {
  totalRevenue: number
  totalExpenses: number
  customerCount: number
  inventoryValue: number
  revenueChange: number
  expensesChange: number
  lowStockCount: number
  pendingTransfers: number
}

interface KPICardsProps {
  userRole: string
  locationFilter: string | null
  dateRange: { from: Date; to: Date }
}

async function fetchKPIData(
  userRole: string, 
  locationFilter: string | null, 
  dateRange: { from: Date; to: Date }
): Promise<KPIData> {
  const supabase = createClient()
  const isWarehouseManager = userRole === 'warehouse_manager'
  
  const dateRangeStrings = {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  }

  if (isWarehouseManager) {
    // For warehouse managers, only fetch inventory-related KPIs
    const [inventoryResponse, lowStockResponse, transfersResponse] = await Promise.all([
      supabase
        .from('inventory')
        .select('quantity, products(base_price)')
        .eq('locations.location_type', 'warehouse')
        .eq(locationFilter ? 'location_id' : '', locationFilter || ''),
        
      supabase
        .from('inventory')
        .select('*', { count: 'exact' })
        .lt('quantity', 10)
        .eq('locations.location_type', 'warehouse')
        .eq(locationFilter ? 'location_id' : '', locationFilter || ''),
        
      supabase
        .from('inventory_transfers')
        .select('*', { count: 'exact' })
        .or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`, locationFilter ? {} : {})
    ])

    const inventoryValue = inventoryResponse.data?.reduce((sum: number, item: any) => {
      return sum + (safeNumericValue(item.quantity) * safeNumericValue((item.products as any)?.base_price));
    }, 0) || 0

    return {
      totalRevenue: 0,
      totalExpenses: 0,
      customerCount: 0,
      inventoryValue,
      revenueChange: 0,
      expensesChange: 0,
      lowStockCount: lowStockResponse.data?.length || 0,
      pendingTransfers: transfersResponse.data?.length || 0
    }
  }

  // For admin and store managers, fetch all KPIs
  const [
    salesResponse,
    prevSalesResponse,
    expensesResponse, 
    prevExpensesResponse,
    customersResponse,
    inventoryResponse,
    lowStockResponse
  ] = await Promise.all([
    supabase
      .from('sales')
      .select('total_amount, sale_date')
      .eq('status', 'Completed')
      .gte('sale_date', dateRangeStrings.from)
      .lte('sale_date', dateRangeStrings.to)
      .eq(locationFilter ? 'location_id' : '', locationFilter || ''),
      
    (() => {
      const prevFrom = new Date(dateRange.from)
      const prevTo = new Date(dateRange.to)
      prevFrom.setMonth(prevFrom.getMonth() - 1)
      prevTo.setMonth(prevTo.getMonth() - 1)
      
      return supabase
        .from('sales')
        .select('total_amount')
        .eq('status', 'Completed')
        .gte('sale_date', prevFrom.toISOString())
        .lte('sale_date', prevTo.toISOString())
        .eq(locationFilter ? 'location_id' : '', locationFilter || '')
    })(),
    
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('status', 'approved')
      .gte('expense_date', dateRangeStrings.from)
      .lte('expense_date', dateRangeStrings.to)
      .eq(locationFilter ? 'location_id' : '', locationFilter || ''),
      
    (() => {
      const prevFrom = new Date(dateRange.from)
      const prevTo = new Date(dateRange.to)
      prevFrom.setMonth(prevFrom.getMonth() - 1)
      prevTo.setMonth(prevTo.getMonth() - 1)
      
      return supabase
        .from('expenses')
        .select('amount')
        .eq('status', 'approved')
        .gte('expense_date', prevFrom.toISOString())
        .lte('expense_date', prevTo.toISOString())
        .eq(locationFilter ? 'location_id' : '', locationFilter || '')
    })(),
    
    supabase
      .from('customers')
      .select('*', { count: 'exact' }),
      
    supabase
      .from('inventory')
      .select('quantity, products(base_price)')
      .eq(locationFilter ? 'location_id' : '', locationFilter || ''),
      
    supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .lt('quantity', 10)
      .eq(locationFilter ? 'location_id' : '', locationFilter || '')
  ])

  const totalRevenue = salesResponse.data?.reduce((sum: number, sale: any) => 
    sum + safeNumericValue(sale.total_amount), 0) || 0
  const prevRevenue = prevSalesResponse.data?.reduce((sum: number, sale: any) => 
    sum + safeNumericValue(sale.total_amount), 0) || 0
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

  const totalExpenses = expensesResponse.data?.reduce((sum: number, expense: any) => 
    sum + safeNumericValue(expense.amount), 0) || 0
  const prevExpenses = prevExpensesResponse.data?.reduce((sum: number, expense: any) => 
    sum + safeNumericValue(expense.amount), 0) || 0
  const expensesChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0

  const inventoryValue = inventoryResponse.data?.reduce((sum: number, item: any) => {
    return sum + (safeNumericValue(item.quantity) * safeNumericValue((item.products as any)?.base_price));
  }, 0) || 0

  return {
    totalRevenue,
    totalExpenses,
    customerCount: customersResponse.data?.length || 0,
    inventoryValue,
    revenueChange,
    expensesChange,
    lowStockCount: lowStockResponse.data?.length || 0,
    pendingTransfers: 0
  }
}

export function KPICards({ userRole, locationFilter, dateRange }: KPICardsProps) {
  const { data: kpiData, isLoading, error } = useQuery({
    queryKey: ['kpi-data', userRole, locationFilter, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () => fetchKPIData(userRole, locationFilter, dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const isWarehouseManager = userRole === 'warehouse_manager'

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error || !kpiData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Failed to load KPI data</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {!isWarehouseManager && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${kpiData.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {kpiData.revenueChange >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">+{kpiData.revenueChange.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">{kpiData.revenueChange.toFixed(1)}%</span>
                  </>
                )}{' '}
                from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${kpiData.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {kpiData.expensesChange >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">+{kpiData.expensesChange.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">{kpiData.expensesChange.toFixed(1)}%</span>
                  </>
                )}{' '}
                from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.customerCount}</div>
              <p className="text-xs text-muted-foreground">
                Total registered customers
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {isWarehouseManager && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${kpiData.inventoryValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Total warehouse value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">
                Need restocking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.pendingTransfers}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isWarehouseManager ? "Total Products" : "Inventory Value"}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isWarehouseManager ? "1,248" : `$${kpiData.inventoryValue.toFixed(2)}`}
          </div>
          <p className="text-xs text-muted-foreground">
            {isWarehouseManager ? "Products in warehouse" : `${kpiData.lowStockCount} products low in stock`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}