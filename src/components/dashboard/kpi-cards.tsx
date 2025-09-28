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
  dashboardType: string
}

async function fetchKPIData(
  userRole: string, 
  locationFilter: string | null, 
  dateRange: { from: Date; to: Date },
  dashboardType: string
): Promise<KPIData> {
  const supabase = createClient()
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse_manager'
  
  const dateRangeStrings = {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  }

  if (showWarehouseData) {
    // For warehouse managers, only fetch inventory-related KPIs
    let inventoryQuery = supabase
      .from('inventory')
      .select('quantity, products(base_price), locations!inner(location_type)')
      .eq('locations.location_type', 'warehouse')
    
    let lowStockQuery = supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .lt('quantity', 10)
      .eq('locations.location_type', 'warehouse')
    
    let transfersQuery = supabase
      .from('inventory_transfers')
      .select('*', { count: 'exact' })
    
    // Apply location filter if specified
    if (locationFilter) {
      inventoryQuery = inventoryQuery.eq('location_id', locationFilter)
      lowStockQuery = lowStockQuery.eq('location_id', locationFilter)
      transfersQuery = transfersQuery.or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`)
    }
    
    const [inventoryResponse, lowStockResponse, transfersResponse] = await Promise.all([
      inventoryQuery,
      lowStockQuery, 
      transfersQuery
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

  // For store and overall dashboards, fetch sales/expense KPIs
  let salesQuery = supabase
    .from('sales')
    .select('total_amount, sale_date')
    .eq('status', 'Completed')
    .gte('sale_date', dateRangeStrings.from)
    .lte('sale_date', dateRangeStrings.to)
  
  let expensesQuery = supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('status', 'approved')
    .gte('expense_date', dateRangeStrings.from)
    .lte('expense_date', dateRangeStrings.to)
  
  let customersQuery = supabase
    .from('customers')
    .select('*', { count: 'exact' })
  
  let inventoryQuery = supabase
    .from('inventory')
    .select('quantity, products(base_price)')
  
  let lowStockQuery = supabase
    .from('inventory')
    .select('*', { count: 'exact' })
    .lt('quantity', 10)
  
  // Apply location filter if specified
  if (locationFilter) {
    salesQuery = salesQuery.eq('location_id', locationFilter)
    expensesQuery = expensesQuery.eq('location_id', locationFilter)
    customersQuery = customersQuery.eq('location_id', locationFilter)
    inventoryQuery = inventoryQuery.eq('location_id', locationFilter)
    lowStockQuery = lowStockQuery.eq('location_id', locationFilter)
  }
  
  // Previous month queries for comparison
  const prevFrom = new Date(dateRange.from)
  const prevTo = new Date(dateRange.to)
  prevFrom.setMonth(prevFrom.getMonth() - 1)
  prevTo.setMonth(prevTo.getMonth() - 1)
  
  let prevSalesQuery = supabase
    .from('sales')
    .select('total_amount')
    .eq('status', 'Completed')
    .gte('sale_date', prevFrom.toISOString())
    .lte('sale_date', prevTo.toISOString())
  
  let prevExpensesQuery = supabase
    .from('expenses')
    .select('amount')
    .eq('status', 'approved')
    .gte('expense_date', prevFrom.toISOString())
    .lte('expense_date', prevTo.toISOString())
  
  if (locationFilter) {
    prevSalesQuery = prevSalesQuery.eq('location_id', locationFilter)
    prevExpensesQuery = prevExpensesQuery.eq('location_id', locationFilter)
  }
  
  const [
    salesResponse,
    prevSalesResponse,
    expensesResponse, 
    prevExpensesResponse,
    customersResponse,
    inventoryResponse,
    lowStockResponse
  ] = await Promise.all([
    salesQuery,
    prevSalesQuery,
    expensesQuery,
    prevExpensesQuery,
    customersQuery,
    inventoryQuery,
    lowStockQuery
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

export function KPICards({ userRole, locationFilter, dateRange, dashboardType }: KPICardsProps) {
  const { data: kpiData, isLoading, error } = useQuery({
    queryKey: ['kpi-data', userRole, locationFilter, dateRange.from.toISOString(), dateRange.to.toISOString(), dashboardType],
    queryFn: () => fetchKPIData(userRole, locationFilter, dateRange, dashboardType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse_manager'

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
      {!showWarehouseData && (
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

      {showWarehouseData && (
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
            {showWarehouseData ? "Total Products" : "Inventory Value"}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {showWarehouseData ? "1,248" : `$${kpiData.inventoryValue.toFixed(2)}`}
          </div>
          <p className="text-xs text-muted-foreground">
            {showWarehouseData ? "Products in warehouse" : `${kpiData.lowStockCount} products low in stock`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}