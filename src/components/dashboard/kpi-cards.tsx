'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingDown, Users, Package, ArrowUpRight, ArrowDownRight, Building, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { KPICardSkeleton } from './skeletons'
import { safeNumericValue } from '@/lib/data-validation'
import { useTranslations ,useFormatter} from 'next-intl'


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
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse-manager'
  
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
  const t = useTranslations('dashboard.kpiCards')
  const { data: kpiData, isLoading, error } = useQuery({
    queryKey: ['kpi-data', userRole, locationFilter, dateRange.from.toISOString(), dateRange.to.toISOString(), dashboardType],
    queryFn: () => fetchKPIData(userRole, locationFilter, dateRange, dashboardType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse-manager'

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
            <p className="text-sm text-muted-foreground">{t('states.error')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {!showWarehouseData && (
        <>
          {/* Revenue Card - Premium Design */}
          <Card className="border-2 border-green-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-green-500 to-green-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-100">{t("revenue.title")}</p>
                <div className="text-3xl font-black text-white mt-2">
                  ${kpiData.totalRevenue.toFixed(2)}
                </div>
                <div className="flex items-center mt-3 text-xs font-bold">
                  {kpiData.revenueChange >= 0 ? (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur rounded-lg">
                        <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                        <span className="text-white">+{kpiData.revenueChange.toFixed(1)}%</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-500/30 backdrop-blur rounded-lg">
                        <ArrowDownRight className="h-3.5 w-3.5 text-white" />
                        <span className="text-white">{kpiData.revenueChange.toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                  <span className="text-green-100 ml-2">{t('revenue.comparison')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Card - Premium Design */}
          <Card className="border-2 border-red-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-red-500 to-red-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-red-100">{t('expenses.title')}</p>
                <div className="text-3xl font-black text-white mt-2">
                  ${kpiData.totalExpenses.toFixed(2)}
                </div>
                <div className="flex items-center mt-3 text-xs font-bold">
                  {kpiData.expensesChange >= 0 ? (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur rounded-lg">
                        <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                        <span className="text-white">+{kpiData.expensesChange.toFixed(1)}%</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/30 backdrop-blur rounded-lg">
                        <ArrowDownRight className="h-3.5 w-3.5 text-white" />
                        <span className="text-white">{kpiData.expensesChange.toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                  <span className="text-red-100 ml-2">{t('expenses.comparison')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers Card - Premium Design */}
          <Card className="border-2 border-purple-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-purple-100">{t('customers.title')}</p>
                <div className="text-3xl font-black text-white mt-2">
                  {kpiData.customerCount}
                </div>
                <p className="text-xs text-purple-100 mt-3 font-medium">
                  {t('customers.subtitle')}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {showWarehouseData && (
        <>
          {/* Warehouse: Inventory Value Card */}
          <Card className="border-2 border-blue-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-blue-100">{t('inventory.title')}</p>
                <div className="text-3xl font-black text-white mt-2">
                  ${kpiData.inventoryValue.toFixed(2)}
                </div>
                <p className="text-xs text-blue-100 mt-3 font-medium">
                  {t('inventory.totalvalue')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse: Low Stock Card */}
          <Card className="border-2 border-orange-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-orange-500 to-orange-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-orange-100">Low Stock Items</p>
                <div className="text-3xl font-black text-white mt-2">
                  {kpiData.lowStockCount}
                </div>
                <p className="text-xs text-orange-100 mt-3 font-medium">
                  Need restocking
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse: Pending Transfers Card */}
          <Card className="border-2 border-indigo-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-indigo-100">Pending Transfers</p>
                <div className="text-3xl font-black text-white mt-2">
                  {kpiData.pendingTransfers}
                </div>
                <p className="text-xs text-indigo-100 mt-3 font-medium">
                  Awaiting processing
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Inventory Card - Works for both warehouse and store */}
      <Card className="border-2 border-blue-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
        <CardContent className="p-0">
          <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-semibold text-blue-100">
              {showWarehouseData ? t("inventory.totalProducts") : t("inventory.title")}
            </p>
            <div className="text-3xl font-black text-white mt-2">
              {showWarehouseData ? "1,248" : `$${kpiData.inventoryValue.toFixed(2)}`}
            </div>
            <p className="text-xs text-blue-100 mt-3 font-medium">
              {showWarehouseData ? "Products in warehouse" : `${kpiData.lowStockCount} ${t("inventory.lowStock")}`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}