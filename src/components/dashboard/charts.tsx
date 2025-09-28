'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ChartSkeleton } from './skeletons'
import { safeNumericValue } from '@/lib/data-validation'

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
}

async function fetchSalesData(locationFilter: string | null): Promise<ChartDataItem[]> {
  const supabase = createClient()

  if (locationFilter) {
    const { data } = await supabase
      .from('sales')
      .select('total_amount, sale_date')
      .eq('status', 'Completed')
      .eq('location_id', locationFilter)

    const monthlyData: Record<string, number> = {}
    data?.forEach((sale) => {
      const month = format(new Date(sale.sale_date), 'MMM')
      if (!monthlyData[month]) {
        monthlyData[month] = 0
      }
      monthlyData[month] += safeNumericValue(sale.total_amount)
    })

    return Object.keys(monthlyData).map((month) => ({
      month,
      total: monthlyData[month]
    }))
  } else {
    const { data } = await supabase.rpc('get_monthly_sales')
    return data || []
  }
}

async function fetchExpenseData(locationFilter: string | null): Promise<ExpenseChartDataItem[]> {
  const supabase = createClient()

  if (locationFilter) {
    const { data } = await supabase
      .from('expenses')
      .select('amount, expense_categories(name)')
      .eq('status', 'approved')
      .eq('location_id', locationFilter)

    const categoryData: Record<string, number> = {}
    data?.forEach((expense: any) => {
      const category = expense.expense_categories?.name || 'Other'
      if (!categoryData[category]) {
        categoryData[category] = 0
      }
      categoryData[category] += safeNumericValue(expense.amount)
    })

    return Object.keys(categoryData).map((category) => ({
      category,
      amount: categoryData[category]
    }))
  } else {
    const { data } = await supabase.rpc('get_expenses_by_category')
    return data || []
  }
}

export function SalesChart({ userRole, locationFilter }: ChartsProps) {
  const { data: salesData, isLoading, error } = useQuery({
    queryKey: ['sales-chart', locationFilter],
    queryFn: () => fetchSalesData(locationFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: userRole !== 'warehouse_manager'
  })

  if (userRole === 'warehouse_manager') return null

  if (isLoading) return <ChartSkeleton />

  if (error || !salesData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Failed to load sales data</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>Monthly sales for the current year</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${value}`, 'Total']} />
            <Legend />
            <Bar dataKey="total" fill="#8884d8" name="Total Sales" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ExpenseChart({ userRole, locationFilter }: ChartsProps) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  const { data: expenseData, isLoading, error } = useQuery({
    queryKey: ['expense-chart', locationFilter],
    queryFn: () => fetchExpenseData(locationFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: userRole !== 'warehouse_manager'
  })

  if (userRole === 'warehouse_manager') return null

  if (isLoading) return <ChartSkeleton />

  if (error || !expenseData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Failed to load expense data</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>Expenses by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="amount"
              nameKey="category"
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {expenseData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}