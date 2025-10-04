'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ChartSkeleton } from './skeletons'
import { safeNumericValue } from '@/lib/data-validation'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

interface RevenueExpenseChartProps {
  userRole: string
  locationFilter: string | null
  dashboardType: string
}

async function fetchRevenueExpenseData(locationFilter: string | null): Promise<MonthlyData[]> {
  const supabase = createClient()
  
  // Get current year date range
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

  // Fetch sales data
  let salesQuery = supabase
    .from('sales')
    .select('total_amount, sale_date')
    .eq('status', 'Completed')
    .gte('sale_date', startOfYear.toISOString())
    .lte('sale_date', endOfYear.toISOString())

  if (locationFilter) {
    salesQuery = salesQuery.eq('location_id', locationFilter)
  }

  // Fetch expenses data
  let expensesQuery = supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('status', 'approved')
    .gte('expense_date', startOfYear.toISOString())
    .lte('expense_date', endOfYear.toISOString())

  if (locationFilter) {
    expensesQuery = expensesQuery.eq('location_id', locationFilter)
  }

  const [salesResult, expensesResult] = await Promise.all([
    salesQuery,
    expensesQuery
  ])

  // Initialize all 12 months
  const monthlyData: Record<string, { revenue: number; expenses: number }> = {}
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  monthNames.forEach(month => {
    monthlyData[month] = { revenue: 0, expenses: 0 }
  })

  // Aggregate sales
  if (salesResult.data) {
    salesResult.data.forEach((sale) => {
      const month = format(new Date(sale.sale_date), 'MMM')
      monthlyData[month].revenue += safeNumericValue(sale.total_amount)
    })
  }

  // Aggregate expenses
  if (expensesResult.data) {
    expensesResult.data.forEach((expense) => {
      const month = format(new Date(expense.expense_date), 'MMM')
      monthlyData[month].expenses += safeNumericValue(expense.amount)
    })
  }

  // Transform to array with profit calculation
  return monthNames.map((month) => ({
    month,
    revenue: monthlyData[month].revenue,
    expenses: monthlyData[month].expenses,
    profit: monthlyData[month].revenue - monthlyData[month].expenses
  }))
}

export function RevenueExpenseChart({ userRole, locationFilter, dashboardType }: RevenueExpenseChartProps) {
  const t = useTranslations('dashboard')
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse-manager'
  
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['revenue-expense-chart', locationFilter, dashboardType],
    queryFn: () => fetchRevenueExpenseData(locationFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !showWarehouseData
  })

  if (showWarehouseData) return null

  if (isLoading) return <ChartSkeleton />

  if (error || !chartData) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle>Revenue vs Expenses</CardTitle>
          <CardDescription>{t('loadError')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Calculate totals and averages
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0)
  const totalExpenses = chartData.reduce((sum, item) => sum + item.expenses, 0)
  const totalProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600 text-white pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-0 shadow-lg px-3 py-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              Financial Overview
            </Badge>
            <Badge variant="secondary" className="bg-white/10 backdrop-blur-sm text-white border-0 text-xs">
              {new Date().getFullYear()}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm font-medium">Net Profit</div>
            <div className="text-2xl font-bold">${totalProfit.toLocaleString()}</div>
            <Badge className={`mt-1 ${profitMargin >= 0 ? 'bg-white/20' : 'bg-red-500/20'} backdrop-blur-sm text-white border-0`}>
              {profitMargin >= 0 ? '↑' : '↓'} {Math.abs(profitMargin).toFixed(1)}% margin
            </Badge>
          </div>
        </div>
        <CardDescription className="text-white/80 mt-2">
          Revenue, expenses, and profit comparison for {new Date().getFullYear()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-900">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-900">${totalExpenses.toLocaleString()}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6 }}
              name="Expenses"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
