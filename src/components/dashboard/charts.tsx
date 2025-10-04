'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ChartSkeleton } from './skeletons'
import { safeNumericValue } from '@/lib/data-validation'
import { TrendingUp, DollarSign, Wallet } from 'lucide-react'

interface ChartDataItem {
  month: string
  total: number
}

interface ExpenseChartDataItem {
  category: string
  amount: number
}

interface ChartsProps {
  userRole: string
  locationFilter: string | null
  dashboardType: string
}

async function fetchSalesData(locationFilter: string | null): Promise<ChartDataItem[]> {
  const supabase = createClient()
  
  // Get current year date range
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

  let query = supabase
    .from('sales')
    .select('total_amount, sale_date')
    .eq('status', 'Completed')
    .gte('sale_date', startOfYear.toISOString())
    .lte('sale_date', endOfYear.toISOString())

  if (locationFilter) {
    query = query.eq('location_id', locationFilter)
  }
  
  const { data } = await query

  if (data) {
    // Initialize all 12 months with 0
    const monthlyData: Record<string, number> = {
      'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
      'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    }
    
    data.forEach((sale) => {
      const month = format(new Date(sale.sale_date), 'MMM')
      monthlyData[month] += safeNumericValue(sale.total_amount)
    })

    // Return months in order
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => ({
      month,
      total: monthlyData[month]
    }))
  }
  
  return []
}

async function fetchExpenseData(locationFilter: string | null): Promise<ExpenseChartDataItem[]> {
  const supabase = createClient()
  
  // Get current year date range
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

  let query = supabase
    .from('expenses')
    .select('amount, expense_categories(name)')
    .eq('status', 'approved')
    .gte('expense_date', startOfYear.toISOString())
    .lte('expense_date', endOfYear.toISOString())

  if (locationFilter) {
    query = query.eq('location_id', locationFilter)
  }

  const { data } = await query

  if (data) {
    const categoryData: Record<string, number> = {}
    data.forEach((expense: any) => {
      const category = expense.expense_categories?.name || 'Other'
      if (!categoryData[category]) {
        categoryData[category] = 0
      }
      categoryData[category] += safeNumericValue(expense.amount)
    })

    return Object.keys(categoryData)
      .map((category) => ({
        category,
        amount: categoryData[category]
      }))
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending
  }
  
  return []
}

export function SalesChart({ userRole, locationFilter, dashboardType }: ChartsProps) {
  const t = useTranslations('dashboard')
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse-manager'
  
  const { data: salesData, isLoading, error } = useQuery({
    queryKey: ['sales-chart', locationFilter, dashboardType],
    queryFn: () => fetchSalesData(locationFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !showWarehouseData
  })

  if (showWarehouseData) return null

  if (isLoading) return <ChartSkeleton />

  if (error || !salesData) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle>{t('charts.sales.title')}</CardTitle>
          <CardDescription>{t('loadError')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Calculate total and trend
  const totalSales = salesData.reduce((sum, item) => sum + item.total, 0)
  const hasTrend = salesData.length > 1
  const trend = hasTrend 
    ? ((salesData[salesData.length - 1].total - salesData[0].total) / salesData[0].total) * 100 
    : 0

  return (
    <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-0 shadow-lg px-3 py-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              {t('charts.sales.title')}
            </Badge>
            <Badge variant="secondary" className="bg-white/10 backdrop-blur-sm text-white border-0 text-xs">
              {new Date().getFullYear()}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm font-medium">Yearly Revenue</div>
            <div className="text-2xl font-bold">${totalSales.toLocaleString()}</div>
            {hasTrend && (
              <Badge className={`mt-1 ${trend >= 0 ? 'bg-white/20' : 'bg-red-500/20'} backdrop-blur-sm text-white border-0`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-white/80 mt-2">
          Monthly revenue trend for {new Date().getFullYear()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
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
              formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#10b981" 
              strokeWidth={3}
              fill="url(#salesGradient)" 
              name="Sales"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ExpenseChart({ userRole, locationFilter, dashboardType }: ChartsProps) {
  const t = useTranslations('dashboard')
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1']
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse-manager'

  const { data: expenseData, isLoading, error } = useQuery({
    queryKey: ['expense-chart', locationFilter, dashboardType],
    queryFn: () => fetchExpenseData(locationFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !showWarehouseData
  })

  if (showWarehouseData) return null

  if (isLoading) return <ChartSkeleton />

  if (error || !expenseData) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle>{t('charts.expenses.title')}</CardTitle>
          <CardDescription>{t('loadError')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Calculate total expenses
  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0)
  const topCategory = expenseData.length > 0 
    ? expenseData.reduce((max, item) => item.amount > max.amount ? item : max, expenseData[0])
    : null

  // Custom label with better positioning
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // Don't show labels for small slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-rose-500 via-red-500 to-pink-600 text-white pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-0 shadow-lg px-3 py-1">
              <Wallet className="w-4 h-4 mr-1" />
              {t('charts.expenses.title')}
            </Badge>
            <Badge variant="secondary" className="bg-white/10 backdrop-blur-sm text-white border-0 text-xs">
              {new Date().getFullYear()}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm font-medium">Yearly Expenses</div>
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            {topCategory && (
              <Badge className="mt-1 bg-white/20 backdrop-blur-sm text-white border-0 text-xs">
                Top: {topCategory.category}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-white/80 mt-2">
          Expense breakdown by category for {new Date().getFullYear()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              innerRadius={70}
              outerRadius={110}
              fill="#8884d8"
              dataKey="amount"
              nameKey="category"
              paddingAngle={2}
            >
              {expenseData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Amount']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {expenseData.map((entry, index) => (
            <div key={entry.category} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-700 font-medium truncate">{entry.category}</span>
              <span className="text-gray-500 ml-auto">${entry.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}