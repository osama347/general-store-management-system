'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { DollarSign, TrendingDown, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ActivityFeedSkeleton } from './skeletons'
import { safeStringValue, safeNumericValue, safeDateValue } from '@/lib/data-validation'
import { JSX } from 'react'

interface Transaction {
  type: 'sale' | 'expense' | 'transfer'
  date: string
  amount: number
  description: string
  icon: JSX.Element
  status?: string
}

interface RecentTransactionsProps {
  userRole: string
  locationFilter: string | null
  dashboardType: string
}

async function fetchRecentTransactions(
  userRole: string, 
  locationFilter: string | null, 
  dashboardType: string
): Promise<Transaction[]> {
  const supabase = createClient()
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse-manager'
  
  // Get current year date range
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

  if (showWarehouseData) {
    // For warehouse: show inventory transfers
    let transfersQuery = supabase
      .from('inventory_transfers')
      .select('created_at, quantity, products(name), from_location:locations!inventory_transfers_from_location_id_fkey(name), to_location:locations!inventory_transfers_to_location_id_fkey(name)')
      .gte('created_at', startOfYear.toISOString())
      .lte('created_at', endOfYear.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
      
    if (locationFilter) {
      transfersQuery = transfersQuery.or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`)
    }
    
    const { data: transfers } = await transfersQuery

    return (transfers || []).map((transfer: any) => ({
      type: 'transfer' as const,
      date: safeDateValue(transfer.created_at),
      amount: safeNumericValue(transfer.quantity),
      description: `${safeStringValue(transfer.products?.name)}`,
      icon: <Package className="h-4 w-4" />,
      status: `${safeStringValue(transfer.from_location?.name)} → ${safeStringValue(transfer.to_location?.name)}`
    }))
  }

  // For stores: show sales and expenses
  let salesQuery = supabase
    .from('sales')
    .select('sale_date, total_amount, status, customers(first_name, last_name)')
    .gte('sale_date', startOfYear.toISOString())
    .lte('sale_date', endOfYear.toISOString())
    .order('sale_date', { ascending: false })
    .limit(6)
    
  let expensesQuery = supabase
    .from('expenses')
    .select('expense_date, amount, status, vendor_name, expense_categories(name)')
    .gte('expense_date', startOfYear.toISOString())
    .lte('expense_date', endOfYear.toISOString())
    .order('expense_date', { ascending: false })
    .limit(6)

  if (locationFilter) {
    salesQuery = salesQuery.eq('location_id', locationFilter)
    expensesQuery = expensesQuery.eq('location_id', locationFilter)
  }
  
  const [sales, expenses] = await Promise.all([
    salesQuery,
    expensesQuery
  ])

  // Combine and format transactions
  const combinedTransactions: Transaction[] = [
    ...(sales.data || []).map((sale: any) => ({
      type: 'sale' as const,
      date: safeDateValue(sale.sale_date),
      amount: safeNumericValue(sale.total_amount),
      description: `${safeStringValue(sale.customers?.first_name)} ${safeStringValue(sale.customers?.last_name)}`,
      icon: <DollarSign className="h-4 w-4" />,
      status: safeStringValue(sale.status)
    })),
    ...(expenses.data || []).map((expense: any) => ({
      type: 'expense' as const,
      date: safeDateValue(expense.expense_date),
      amount: safeNumericValue(expense.amount),
      description: safeStringValue(expense.vendor_name) || safeStringValue(expense.expense_categories?.name),
      icon: <TrendingDown className="h-4 w-4" />,
      status: safeStringValue(expense.status)
    }))
  ]

  // Sort by date and return top 10
  return combinedTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
}

export function RecentTransactions({ userRole, locationFilter, dashboardType }: RecentTransactionsProps) {
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['recent-transactions', userRole, locationFilter, dashboardType],
    queryFn: () => fetchRecentTransactions(userRole, locationFilter, dashboardType),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const t = useTranslations('dashboard.activityFeed')

  if (isLoading) {
    return <ActivityFeedSkeleton />
  }

  if (error || !transactions) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-sm text-muted-foreground">{t('loadError')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.length > 0 ? (
        transactions.map((transaction, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                transaction.type === 'sale' 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' 
                  : transaction.type === 'expense'
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
              }`}>
                {transaction.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {transaction.description}
                  </p>
                  {transaction.status && (
                    <Badge 
                      variant={
                        transaction.status === 'Completed' || transaction.status === 'approved' 
                          ? 'default' 
                          : transaction.status === 'pending' 
                          ? 'secondary' 
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {transaction.status}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(transaction.date), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold flex items-center gap-1 ${
                transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'sale' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : transaction.type === 'expense' ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : null}
                {transaction.type === 'transfer' 
                  ? `${transaction.amount} units` 
                  : `$${transaction.amount.toLocaleString()}`
                }
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-slate-400 py-8 text-sm">{t('noActivities')}</p>
      )}
    </div>
  )
}
