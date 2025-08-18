'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Warehouse,
  AlertTriangle,
  Plus,
  BarChart3,
  FileText,
  Settings
} from "lucide-react"
import Link from "next/link"
import { useStaff } from '@/contexts/StaffContext'

interface DashboardStats {
  totalProducts: number
  totalCustomers: number
  totalSales: number
  totalRevenue: number
  lowStockItems: number
  totalWarehouses: number
  totalStores: number
  totalStaff: number
}

interface RecentActivity {
  id: string
  type: 'sale' | 'purchase' | 'transfer' | 'expense'
  description: string
  amount?: number
  date: string
}

export default function DashboardPage() {
  const { currentStaff } = useStaff()
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    totalWarehouses: 0,
    totalStores: 0,
    totalStaff: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, you'd fetch this data from your API
    // For now, using mock data
    setStats({
      totalProducts: 156,
      totalCustomers: 89,
      totalSales: 234,
      totalRevenue: 45678.90,
      lowStockItems: 12,
      totalWarehouses: 3,
      totalStores: 5,
      totalStaff: 18
    })

    setRecentActivities([
      {
        id: '1',
        type: 'sale',
        description: 'Sale #1234 - Electronics Department',
        amount: 299.99,
        date: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        type: 'transfer',
        description: 'Inventory transfer from Warehouse A to Store 1',
        date: '2024-01-15T09:15:00Z'
      },
      {
        id: '3',
        type: 'expense',
        description: 'Utility bill payment',
        amount: 450.00,
        date: '2024-01-15T08:00:00Z'
      },
      {
        id: '4',
        type: 'purchase',
        description: 'New product shipment received',
        date: '2024-01-14T16:45:00Z'
      }
    ])

    setIsLoading(false)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="h-4 w-4 text-green-600" />
      case 'purchase':
        return <Package className="h-4 w-4 text-blue-600" />
      case 'transfer':
        return <Warehouse className="h-4 w-4 text-purple-600" />
      case 'expense':
        return <DollarSign className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      {currentStaff && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
          <h1 className="text-lg font-semibold text-primary mb-1">
            Welcome back, {currentStaff.first_name}!
          </h1>
          <p className="text-sm text-muted-foreground">
            You're logged in as {currentStaff.role} • Staff ID: {currentStaff.staff_id}
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <div className="flex items-center text-xs text-blue-600 mt-1">
              <Package className="h-3 w-3 mr-1" />
              Active inventory
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
            <div className="flex items-center text-xs text-orange-600 mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs attention
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{stats.totalCustomers}</div>
            <div className="text-xs text-muted-foreground">Active customers</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warehouses</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{stats.totalWarehouses}</div>
            <div className="text-xs text-muted-foreground">Storage locations</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{stats.totalStaff}</div>
            <div className="text-xs text-muted-foreground">Team members</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <Button asChild variant="outline" className="w-full justify-start h-9">
              <Link href="/sales">
                <Plus className="h-3.5 w-3.5 mr-2" />
                New Sale
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-9">
              <Link href="/products">
                <Package className="h-3.5 w-3.5 mr-2" />
                Add Product
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-9">
              <Link href="/inventory">
                <Warehouse className="h-3.5 w-3.5 mr-2" />
                Check Inventory
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-9">
              <Link href="/reports">
                <BarChart3 className="h-3.5 w-3.5 mr-2" />
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest system activities and transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                  </div>
                  {activity.amount && (
                    <Badge variant="secondary" className="text-xs">
                      {formatCurrency(activity.amount)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">System Status</CardTitle>
          <CardDescription>Current system health and performance</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Database: Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">API: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Storage: Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Performance: Good</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

