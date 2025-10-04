'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package, Plus, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

interface LowStockProduct {
  product_id: number
  name: string
  sku: string
  quantity: number
  location_id: number
  location_name: string
  base_price: number
  category_name: string
}

interface LowStockAlertsProps {
  locationFilter: string | null
  dashboardType: string
}

async function fetchLowStockProducts(
  locationFilter: string | null,
  dashboardType: string
): Promise<LowStockProduct[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('inventory')
    .select(`
      product_id,
      location_id,
      quantity,
      products!inner(
        name,
        sku,
        base_price,
        category:categories(name)
      ),
      locations!inner(name, location_type)
    `)
    .lt('quantity', 10)
    .order('quantity', { ascending: true })
    .limit(10)

  // Apply location filter
  if (locationFilter) {
    query = query.eq('location_id', locationFilter)
  }

  // Filter by location type for warehouse dashboard
  if (dashboardType === 'warehouse') {
    query = query.eq('locations.location_type', 'warehouse')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching low stock products:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    product_id: item.product_id,
    name: item.products.name,
    sku: item.products.sku,
    quantity: item.quantity,
    location_id: item.location_id,
    location_name: item.locations.name,
    base_price: item.products.base_price,
    category_name: item.products.category?.name || 'Uncategorized',
  }))
}

export function LowStockAlerts({ locationFilter, dashboardType }: LowStockAlertsProps) {
  const { data: lowStockProducts, isLoading } = useQuery({
    queryKey: ['low-stock-alerts', locationFilter, dashboardType],
    queryFn: () => fetchLowStockProducts(locationFilter, dashboardType),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  if (isLoading) {
    return (
      <Card className="border-2 border-orange-200 shadow-lg rounded-2xl">
        <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white">
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

  const criticalCount = lowStockProducts?.filter(p => p.quantity <= 5).length || 0
  const warningCount = lowStockProducts?.filter(p => p.quantity > 5 && p.quantity < 10).length || 0

  return (
    <Card className="border-2 border-orange-200 shadow-lg rounded-2xl">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Low Stock Alerts</CardTitle>
              <CardDescription className="text-sm">Products that need restocking</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="destructive" className="font-bold">
              {criticalCount} Critical
            </Badge>
            <Badge variant="outline" className="border-orange-300 text-orange-700 font-bold">
              {warningCount} Warning
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!lowStockProducts || lowStockProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-slate-700 font-semibold">All products well stocked</p>
            <p className="text-slate-500 text-sm mt-1">No low stock alerts at this time</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {lowStockProducts.map((product) => {
              const isCritical = product.quantity <= 5
              const stockPercentage = (product.quantity / 10) * 100

              return (
                <div
                  key={`${product.product_id}-${product.location_id}`}
                  className={`p-4 rounded-xl border-2 ${
                    isCritical
                      ? 'bg-red-50 border-red-200'
                      : 'bg-orange-50 border-orange-200'
                  } hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-900">{product.name}</h4>
                        <Badge
                          variant={isCritical ? 'destructive' : 'outline'}
                          className={`text-xs font-bold ${
                            !isCritical ? 'border-orange-300 text-orange-700' : ''
                          }`}
                        >
                          {isCritical ? 'CRITICAL' : 'LOW'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 font-mono bg-white px-2 py-1 rounded inline-block">
                        SKU: {product.sku}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                        <span className="font-medium">{product.location_name}</span>
                        <span>•</span>
                        <span>{product.category_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-black ${
                          isCritical ? 'text-red-600' : 'text-orange-600'
                        }`}
                      >
                        {product.quantity}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">units left</p>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full ${
                        isCritical ? 'bg-red-500' : 'bg-orange-500'
                      } transition-all`}
                      style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-2 hover:bg-white font-semibold"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Reorder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-2 hover:bg-white font-semibold"
                    >
                      <TrendingDown className="h-4 w-4 mr-1" />
                      Adjust
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
