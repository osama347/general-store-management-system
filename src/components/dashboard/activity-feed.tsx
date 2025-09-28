'use client'

import { useQuery } from '@tanstack/react-query'
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
}

async function fetchActivities(userRole: string, locationFilter: string | null): Promise<ActivityItem[]> {
  const supabase = createClient()
  const isWarehouseManager = userRole === 'warehouse_manager'

  if (isWarehouseManager) {
    // For warehouse managers, only show inventory transfers
    const { data: transfers } = await supabase
      .from('inventory_transfers')
      .select('created_at, quantity, products(name), from_location:locations(name), to_location:locations(name)')
      .order('created_at', { ascending: false })
      .limit(8)

    return (transfers || []).map((transfer: any) => ({
      type: 'transfer',
      date: safeDateValue(transfer.created_at),
      description: `Transfer of ${safeNumericValue(transfer.quantity)} units of ${safeStringValue(transfer.products?.name)} from ${safeStringValue(transfer.from_location?.name)} to ${safeStringValue(transfer.to_location?.name)}`,
      icon: <Package className="h-4 w-4 text-blue-500" />
    }))
  }

  // For admin and store managers, show sales, expenses, and transfers
  const [sales, expenses, transfers] = await Promise.all([
    supabase
      .from('sales')
      .select('sale_date, total_amount, customers(first_name, last_name)')
      .eq(locationFilter ? 'location_id' : '', locationFilter || '')
      .order('sale_date', { ascending: false })
      .limit(3),
    supabase
      .from('expenses')
      .select('expense_date, amount, vendor_name')
      .eq(locationFilter ? 'location_id' : '', locationFilter || '')
      .order('expense_date', { ascending: false })
      .limit(3),
    supabase
      .from('inventory_transfers')
      .select('created_at, quantity, products(name), from_location:locations(name), to_location:locations(name)')
      .or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`, locationFilter ? {} : {})
      .order('created_at', { ascending: false })
      .limit(3)
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

export function ActivityFeed({ userRole, locationFilter }: ActivityFeedProps) {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['activities', userRole, locationFilter],
    queryFn: () => fetchActivities(userRole, locationFilter),
    staleTime: 3 * 60 * 1000, // 3 minutes
  })

  if (isLoading) {
    return <ActivityFeedSkeleton />
  }

  if (error || !activities) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-sm text-muted-foreground">Failed to load activities</p>
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
        <p className="text-center text-muted-foreground py-4">No recent activities</p>
      )}
    </div>
  )
}