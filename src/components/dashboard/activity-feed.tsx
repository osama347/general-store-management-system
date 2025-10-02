'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { DollarSign, TrendingDown, Package } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ActivityFeedSkeleton } from './skeletons'
import { safeStringValue, safeNumericValue, safeDateValue } from '@/lib/data-validation'
import { JSX } from 'react'

interface ActivityItem {
  type: string
  date: string
  description: string
  icon: JSX.Element
}

interface ActivityFeedProps {
  userRole: string
  locationFilter: string | null
  dashboardType: string
}

async function fetchActivities(userRole: string, locationFilter: string | null, dashboardType: string): Promise<ActivityItem[]> {
  const supabase = createClient()
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse-manager'
  
  // Get current month date range
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  if (showWarehouseData) {
    // For warehouse dashboards, only show inventory transfers
    let transfersQuery = supabase
      .from('inventory_transfers')
      .select('created_at, quantity, products(name), from_location:locations(name), to_location:locations(name)')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .order('created_at', { ascending: false })
      .limit(8)
      
    if (locationFilter) {
      transfersQuery = transfersQuery.or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`)
    }
    
    const { data: transfers } = await transfersQuery

    return (transfers || []).map((transfer: any) => ({
      type: 'transfer',
      date: safeDateValue(transfer.created_at),
      description: `Transfer of ${safeNumericValue(transfer.quantity)} units of ${safeStringValue(transfer.products?.name)} from ${safeStringValue(transfer.from_location?.name)} to ${safeStringValue(transfer.to_location?.name)}`,
      icon: <Package className="h-4 w-4 text-blue-500" />
    }))
  }

  // For store dashboards, show sales, expenses, and transfers
  let salesQuery = supabase
    .from('sales')
    .select('sale_date, total_amount, customers(first_name, last_name)')
    .gte('sale_date', startOfMonth.toISOString())
    .lte('sale_date', endOfMonth.toISOString())
    .order('sale_date', { ascending: false })
    .limit(3)
    
  let expensesQuery = supabase
    .from('expenses')
    .select('expense_date, amount, vendor_name')
    .gte('expense_date', startOfMonth.toISOString())
    .lte('expense_date', endOfMonth.toISOString())
    .order('expense_date', { ascending: false })
    .limit(3)
    
  let transfersQuery = supabase
    .from('inventory_transfers')
    .select('created_at, quantity, products(name), from_location:locations(name), to_location:locations(name)')
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())
    .order('created_at', { ascending: false })
    .limit(3)

  if (locationFilter) {
    salesQuery = salesQuery.eq('location_id', locationFilter)
    expensesQuery = expensesQuery.eq('location_id', locationFilter)
    transfersQuery = transfersQuery.or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`)
  }
  
  const [sales, expenses, transfers] = await Promise.all([
    salesQuery,
    expensesQuery,
    transfersQuery
  ])

  // Combine and format activities
  const combinedActivities: ActivityItem[] = [
    ...(sales.data || []).map((sale: any) => ({
      type: 'sale',
      date: safeDateValue(sale.sale_date),
      description: `Sale of $${safeNumericValue(sale.total_amount)} to ${safeStringValue(sale.customers?.first_name)} ${safeStringValue(sale.customers?.last_name)}`,
      icon: <DollarSign className="h-4 w-4 text-green-500" />
    })),
    ...(expenses.data || []).map((expense: any) => ({
      type: 'expense',
      date: safeDateValue(expense.expense_date),
      description: `Expense of $${safeNumericValue(expense.amount)} to ${safeStringValue(expense.vendor_name)}`,
      icon: <TrendingDown className="h-4 w-4 text-red-500" />
    })),
    ...(transfers.data || []).map((transfer: any) => ({
      type: 'transfer',
      date: safeDateValue(transfer.created_at),
      description: `Transfer of ${safeNumericValue(transfer.quantity)} units of ${safeStringValue(transfer.products?.name)} from ${safeStringValue(transfer.from_location?.name)} to ${safeStringValue(transfer.to_location?.name)}`,
      icon: <Package className="h-4 w-4 text-blue-500" />
    }))
  ]

  // Sort by date and return top 8
  return combinedActivities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
}

export function ActivityFeed({ userRole, locationFilter, dashboardType }: ActivityFeedProps) {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['activities', userRole, locationFilter, dashboardType],
    queryFn: () => fetchActivities(userRole, locationFilter, dashboardType),
    staleTime: 3 * 60 * 1000, // 3 minutes
  })

  const t = useTranslations('dashboard.activityFeed')

  if (isLoading) {
    return <ActivityFeedSkeleton />
  }

  if (error || !activities) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-sm text-muted-foreground">{t('loadError')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        activities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="mt-0.5">{activity.icon}</div>
            <div className="space-y-1">
              <p className="text-sm">{activity.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-4">{t('noActivities')}</p>
      )}
    </div>
  )
}