"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Calendar,
  FileText
} from "lucide-react"

interface SalesData {
  sale_date: string
  total_amount: number
  staff_id: number | null
}

interface ProductsData {
  product_id: number
  name: string
  base_price: number
  category_id: number
}

interface CustomersData {
  customer_id: number
  created_at: string
}

interface ExpensesData {
  expense_date: string
  amount: number
  expense_type: string
}

interface ReportsDashboardProps {
  salesData: SalesData[]
  productsData: ProductsData[]
  customersData: CustomersData[]
  expensesData: ExpensesData[]
}

export default function ReportsDashboard({ 
  salesData, 
  productsData, 
  customersData, 
  expensesData 
}: ReportsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("30")

  // Calculate time-based data
  const timeBasedData = useMemo(() => {
    const now = new Date()
    const periods = {
      "7": 7,
      "30": 30,
      "90": 90,
      "365": 365
    }
    
    const days = periods[selectedPeriod as keyof typeof periods] || 30
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

    const filteredSales = salesData.filter(sale => new Date(sale.sale_date) >= startDate)
    const filteredExpenses = expensesData.filter(expense => new Date(expense.expense_date) >= startDate)
    const filteredCustomers = customersData.filter(customer => new Date(customer.created_at) >= startDate)

    return {
      sales: filteredSales,
      expenses: filteredExpenses,
      customers: filteredCustomers
    }
  }, [salesData, expensesData, customersData, selectedPeriod])

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalSales = timeBasedData.sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalExpenses = timeBasedData.expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const netProfit = totalSales - totalExpenses
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0

    return {
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      totalProducts: productsData.length,
      totalCustomers: customersData.length,
      newCustomers: timeBasedData.customers.length
    }
  }, [timeBasedData, productsData, customersData])

  // Calculate sales trends
  const salesTrends = useMemo(() => {
    const dailySales = timeBasedData.sales.reduce((acc, sale) => {
      const date = new Date(sale.sale_date).toDateString()
      acc[date] = (acc[date] || 0) + sale.total_amount
      return acc
    }, {} as Record<string, number>)

    const sortedDates = Object.keys(dailySales).sort()
    const recentSales = sortedDates.slice(-7).map(date => dailySales[date])
    
    if (recentSales.length < 2) return { trend: "stable", percentage: 0 }
    
    const current = recentSales[recentSales.length - 1]
    const previous = recentSales[recentSales.length - 2]
    const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
    
    return {
      trend: percentage > 0 ? "up" : percentage < 0 ? "down" : "stable",
      percentage: Math.abs(percentage)
    }
  }, [timeBasedData.sales])

  // Calculate top expense categories
  const topExpenseCategories = useMemo(() => {
    const categoryTotals = timeBasedData.expenses.reduce((acc, expense) => {
      acc[expense.expense_type] = (acc[expense.expense_type] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }))
  }, [timeBasedData.expenses])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Business insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalSales)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {salesTrends.trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : salesTrends.trend === "down" ? (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              ) : (
                <BarChart3 className="h-3 w-3 text-gray-600 mr-1" />
              )}
              {salesTrends.trend === "stable" ? "No change" : `${salesTrends.percentage.toFixed(1)}% ${salesTrends.trend === "up" ? "increase" : "decrease"}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(metrics.profitMargin)} margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In last {selectedPeriod} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Revenue vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Revenue</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(metrics.totalSales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Expenses</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(metrics.totalExpenses)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Profit</span>
                      <span className={`text-sm font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(metrics.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Expense Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topExpenseCategories.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.category}</span>
                      <span className="text-sm font-bold text-red-600">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {timeBasedData.sales.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {timeBasedData.sales.length > 0 ? formatCurrency(metrics.totalSales / timeBasedData.sales.length) : "$0.00"}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Sale</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {formatPercentage(metrics.profitMargin)}
                  </div>
                  <div className="text-sm text-muted-foreground">Profit Margin</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Expense Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {timeBasedData.expenses.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {timeBasedData.expenses.length > 0 ? formatCurrency(metrics.totalExpenses / timeBasedData.expenses.length) : "$0.00"}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Expense</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {topExpenseCategories.length > 0 ? topExpenseCategories[0].category : "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Top Category</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {metrics.totalCustomers.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Customers</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.newCustomers}
                  </div>
                  <div className="text-sm text-muted-foreground">New This Period</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {metrics.totalCustomers > 0 ? formatPercentage((metrics.newCustomers / metrics.totalCustomers) * 100) : "0%"}
                  </div>
                  <div className="text-sm text-muted-foreground">Growth Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline">
              Export Sales Report
            </Button>
            <Button variant="outline">
              Export Expense Report
            </Button>
            <Button variant="outline">
              Export Customer Report
            </Button>
            <Button variant="outline">
              Export All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

