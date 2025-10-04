'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Package, DollarSign, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

interface TopProduct {
  product_id: number
  product_name: string
  sku: string
  total_quantity: number
  total_revenue: number
  category_name: string
  avg_price: number
}

interface TopPerformingProductsProps {
  locationFilter: string | null
  dateRange: { from: Date; to: Date }
  dashboardType: string
}

async function fetchTopProducts(
  locationFilter: string | null,
  dateRange: { from: Date; to: Date },
  dashboardType: string
): Promise<TopProduct[]> {
  const supabase = createClient()

  let query = supabase
    .from('sale_items')
    .select(`
      product_id,
      quantity,
      total_price,
      unit_price,
      sales!inner(
        sale_date,
        status,
        location_id
      ),
      products!inner(
        name,
        sku,
        category:categories(name)
      )
    `)
    .eq('sales.status', 'Completed')
    .gte('sales.sale_date', dateRange.from.toISOString())
    .lte('sales.sale_date', dateRange.to.toISOString())

  if (locationFilter) {
    query = query.eq('sales.location_id', locationFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching top products:', error)
    return []
  }

  // Aggregate by product
  const productMap = new Map<number, TopProduct>()

  data?.forEach((item: any) => {
    const productId = item.product_id
    const existing = productMap.get(productId)

    if (existing) {
      existing.total_quantity += item.quantity
      existing.total_revenue += Number(item.total_price)
    } else {
      productMap.set(productId, {
        product_id: productId,
        product_name: item.products.name,
        sku: item.products.sku,
        total_quantity: item.quantity,
        total_revenue: Number(item.total_price),
        category_name: item.products.category?.name || 'Uncategorized',
        avg_price: Number(item.unit_price),
      })
    }
  })

  // Sort by revenue and get top 10
  return Array.from(productMap.values())
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)
}

export function TopPerformingProducts({
  locationFilter,
  dateRange,
  dashboardType,
}: TopPerformingProductsProps) {
  const { data: topProducts, isLoading } = useQuery({
    queryKey: ['top-products', locationFilter, dateRange.from.toISOString(), dashboardType],
    queryFn: () => fetchTopProducts(locationFilter, dateRange, dashboardType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <Card className="border-2 border-green-200 shadow-lg rounded-2xl">
        <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-white">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const totalRevenue = topProducts?.reduce((sum, p) => sum + p.total_revenue, 0) || 0
  const totalUnits = topProducts?.reduce((sum, p) => sum + p.total_quantity, 0) || 0

  return (
    <Card className="border-2 border-green-200 shadow-lg rounded-2xl">
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Top Performing Products</CardTitle>
              <CardDescription className="text-sm">Best sellers this month</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-700 border-green-300 font-bold">
              {topProducts?.length || 0} Products
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-slate-600">Total Revenue</span>
            </div>
            <p className="text-xl font-black text-slate-900">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-50 to-white rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-600">Units Sold</span>
            </div>
            <p className="text-xl font-black text-slate-900">{totalUnits}</p>
          </div>
        </div>

        {!topProducts || topProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold">No sales data available</p>
            <p className="text-slate-500 text-sm mt-1">Complete some sales to see top products</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {topProducts.map((product, index) => {
              const revenuePercentage = (product.total_revenue / totalRevenue) * 100

              return (
                <div
                  key={product.product_id}
                  className="p-4 rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-md hover:border-green-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-white font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-sm">{product.product_name}</h4>
                        <p className="text-xs text-slate-600 font-mono bg-white px-2 py-0.5 rounded inline-block mt-1">
                          {product.sku}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs font-medium border-slate-300">
                            {product.category_name}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            ${product.avg_price.toFixed(2)} avg
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-green-600">
                        ${product.total_revenue.toFixed(2)}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">
                        {product.total_quantity} units
                      </p>
                    </div>
                  </div>

                  {/* Revenue Contribution Bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                      style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    {revenuePercentage.toFixed(1)}% of total revenue
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
