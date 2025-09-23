"use client";

import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, ShoppingCart } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import type { Sale } from '@/types/reports';

interface SalesReportProps {
  salesData: Sale[];
}

export const SalesReport: React.FC<SalesReportProps> = ({ salesData }) => {
  const aggregatedData = useMemo(() => {
    const dailyData: Record<string, {
      date: string;
      totalRevenue: number;
      orders: number;
      avgOrderValue: number;
      totalItems: number;
    }> = {};

    salesData.forEach((sale) => {
      const date = new Date(sale.sale_date).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          totalRevenue: 0,
          orders: 0,
          avgOrderValue: 0,
          totalItems: 0,
        };
      }

      dailyData[date].totalRevenue += sale.total_amount;
      dailyData[date].orders += 1;
      if (sale.sale_items) {
        dailyData[date].totalItems += sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);
      }
    });

    return Object.values(dailyData).map(data => ({
      ...data,
      avgOrderValue: data.totalRevenue / data.orders,
    }));
  }, [salesData]);

  const totals = useMemo(() => ({
    revenue: salesData.reduce((sum, sale) => sum + sale.total_amount, 0),
    orders: salesData.length,
    items: salesData.reduce((sum, sale) => 
      sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0),
    customers: new Set(salesData.map(sale => sale.customer_id)).size
  }), [salesData]);

  const avgOrderValue = totals.revenue / totals.orders;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.revenue.toLocaleString()}</div>
            <Badge variant="secondary" className="mt-2">
              Avg. ${avgOrderValue.toFixed(2)} per order
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.orders.toLocaleString()}</div>
            <Badge variant="secondary" className="mt-2">
              {totals.items.toLocaleString()} items sold
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.customers.toLocaleString()}</div>
            <Badge variant="secondary" className="mt-2">
              {(totals.orders / totals.customers).toFixed(1)} orders per customer
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <Badge variant="secondary" className="mt-2">
              {(totals.items / totals.orders).toFixed(1)} items per order
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Daily revenue and order trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'totalRevenue' 
                      ? `$${value.toLocaleString()}`
                      : value.toLocaleString(),
                    name === 'totalRevenue' 
                      ? 'Revenue'
                      : name === 'orders'
                      ? 'Orders'
                      : 'Items'
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="totalRevenue"
                  name="Revenue"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
};