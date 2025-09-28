'use client'

import { useAuth } from '@/hooks/use-auth'
import { useLocation } from '@/contexts/LocationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, DollarSign, TrendingDown, Users, Package, ArrowUpRight, ArrowDownRight, Truck, Building } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useState, useEffect, JSX, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

// Define TypeScript interfaces
interface Product {
  name: string;
  sku: string;
  base_price: number;
}

interface Location {
  name: string;
  location_type: 'store' | 'warehouse';
}

interface InventoryItem {
  quantity: number;
  reserved_quantity: number;
  products: Product[];
  locations: Location[];
}

interface TransferItem {
  transfer_id: number;
  quantity: number;
  created_at: string;
  products: Product[];
  from_location: Location[];
  to_location: Location[];
}

interface ActivityItem {
  type: string;
  date: string;
  description: string;
  icon: JSX.Element;
}

interface SalesItem {
  sale_id: number;
  sale_date: string;
  total_amount: number;
  customer_name: string;
  location_name: string;
  status: string;
}

interface ExpenseItem {
  expense_id: number;
  expense_date: string;
  amount: number;
  vendor_name: string;
  category_name: string;
  status: string;
}

interface LoanItem {
  loan_id: number;
  loan_amount: number;
  loan_date: string;
  due_date: string;
  status: string;
  customer_name: string;
  location_name: string;
}

interface ChartDataItem {
  month: string;
  total: number;
}

interface ExpenseChartDataItem {
  category: string;
  amount: number;
}

// Transformation functions
function transformInventoryItem(item: any): InventoryItem {
  return {
    quantity: item.quantity,
    reserved_quantity: item.reserved_quantity,
    products: item.products || [],
    locations: item.locations || []
  };
}

function transformTransferItem(item: any): TransferItem {
  return {
    transfer_id: item.transfer_id,
    quantity: item.quantity,
    created_at: item.created_at,
    products: item.products || [],
    from_location: item.from_location || [],
    to_location: item.to_location || []
  };
}

function transformSalesItem(sale: any): SalesItem {
  return {
    sale_id: sale.sale_id,
    sale_date: sale.sale_date,
    total_amount: sale.total_amount,
    customer_name: sale.customers ? `${(sale.customers as any).first_name || ''} ${(sale.customers as any).last_name || ''}` : 'Unknown',
    location_name: sale.locations ? (sale.locations as any).name || 'N/A' : 'N/A',
    status: 'Completed'
  };
}

function transformExpenseItem(expense: any): ExpenseItem {
  return {
    expense_id: expense.expense_id,
    expense_date: expense.expense_date,
    amount: expense.amount,
    vendor_name: expense.vendor_name || 'N/A',
    category_name: expense.expense_categories ? (expense.expense_categories as any).name || 'Other' : 'Other',
    status: expense.status || 'pending'
  };
}

function transformLoanItem(loan: any): LoanItem {
  return {
    loan_id: loan.loan_id,
    loan_amount: loan.loan_amount,
    loan_date: loan.loan_date,
    due_date: loan.due_date,
    status: loan.status,
    customer_name: loan.customers ? `${(loan.customers as any).first_name || ''} ${(loan.customers as any).last_name || ''}` : 'Unknown',
    location_name: loan.locations ? (loan.locations as any).name || 'N/A' : 'N/A'
  };
}

export default function DashboardPage() {
  const profile = useAuth()
  const { currentLocation, locations, isLoading: locationLoading, setCurrentLocation } = useLocation()
  const [kpiData, setKpiData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    customerCount: 0,
    inventoryValue: 0,
    revenueChange: 0,
    expensesChange: 0,
    lowStockCount: 0,
    pendingTransfers: 0
  })
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  
  // Memoize values to prevent unnecessary re-renders
  const userRole = useMemo(() => profile?.profile?.role || 'store_manager', [profile?.profile?.role]);
  const isAdmin = useMemo(() => userRole === 'admin', [userRole]);
  const isWarehouseManager = useMemo(() => userRole === 'warehouse_manager', [userRole]);
  const isStoreManager = useMemo(() => userRole === 'store-manager', [userRole]);
  
  // Memoize location filter
  const locationFilter = useMemo(() => {
    if (isAdmin) return null;
    if (currentLocation) return currentLocation.location_id;
    return null;
  }, [isAdmin, currentLocation]);
  
  // Memoized date range strings to prevent unnecessary re-fetching
  const dateRangeStrings = useMemo(() => ({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  }), [dateRange.from, dateRange.to]);
  
  // Fetch KPI data with proper dependencies
  useEffect(() => {
    async function fetchKPIData() {
      if (!profile?.profile || locationLoading) return;
      
      const supabase = createClient();
      
      // For warehouse managers, we only need inventory-related KPIs
      if (isWarehouseManager) {
        // Inventory Value
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('quantity, products(base_price)')
          .eq('locations.location_type', 'warehouse')
          .eq(locationFilter ? 'location_id' : '', locationFilter || '');
          
        const inventoryValue = inventoryData?.reduce((sum, item) => {
          return sum + (item.quantity * (item.products as any)?.base_price || 0);
        }, 0) || 0;
        
        // Low stock count
        const { data: lowStockData } = await supabase
          .from('inventory')
          .select('*', { count: 'exact' })
          .lt('quantity', 10)
          .eq('locations.location_type', 'warehouse')
          .eq(locationFilter ? 'location_id' : '', locationFilter || '');
          
        const lowStockCount = lowStockData?.length || 0;
        
        // Pending transfers
        const { data: transfersData } = await supabase
          .from('inventory_transfers')
          .select('*', { count: 'exact' })
          .or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`, locationFilter ? {} : {});
          
        const pendingTransfers = transfersData?.length || 0;
        
        setKpiData({
          totalRevenue: 0,
          totalExpenses: 0,
          customerCount: 0,
          inventoryValue,
          revenueChange: 0,
          expensesChange: 0,
          lowStockCount,
          pendingTransfers
        });
        return;
      }
      
      // For admin and store managers, fetch all KPIs
      // Total Revenue
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, sale_date')
        .eq('status', 'Completed')
        .gte('sale_date', dateRangeStrings.from)
        .lte('sale_date', dateRangeStrings.to)
        .eq(locationFilter ? 'location_id' : '', locationFilter || '');
        
      const totalRevenue = salesData?.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;
      
      // Previous period revenue for comparison
      const prevFrom = new Date(dateRange.from);
      prevFrom.setMonth(prevFrom.getMonth() - 1);
      const prevTo = new Date(dateRange.to);
      prevTo.setMonth(prevTo.getMonth() - 1);
      const prevFromStr = prevFrom.toISOString();
      const prevToStr = prevTo.toISOString();
      
      const { data: prevSalesData } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('status', 'Completed')
        .gte('sale_date', prevFromStr)
        .lte('sale_date', prevToStr)
        .eq(locationFilter ? 'location_id' : '', locationFilter || '');
        
      const prevRevenue = prevSalesData?.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      
      // Expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('status', 'approved')
        .gte('expense_date', dateRangeStrings.from)
        .lte('expense_date', dateRangeStrings.to)
        .eq(locationFilter ? 'location_id' : '', locationFilter || '');
        
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0) || 0;
      
      // Previous period expenses
      const { data: prevExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('status', 'approved')
        .gte('expense_date', prevFromStr)
        .lte('expense_date', prevToStr)
        .eq(locationFilter ? 'location_id' : '', locationFilter || '');
        
      const prevExpenses = prevExpensesData?.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0) || 0;
      const expensesChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
      
      // Active Customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*', { count: 'exact' });
        
      const customerCount = customersData?.length || 0;
      
      // Inventory Value
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('quantity, products(base_price)')
        .eq(locationFilter ? 'location_id' : '', locationFilter || '');
        
      const inventoryValue = inventoryData?.reduce((sum, item) => {
        return sum + (item.quantity * (item.products as any)?.base_price || 0);
      }, 0) || 0;
      
      // Low stock count
      const { data: lowStockData } = await supabase
        .from('inventory')
        .select('*', { count: 'exact' })
        .lt('quantity', 10)
        .eq(locationFilter ? 'location_id' : '', locationFilter || '');
        
      const lowStockCount = lowStockData?.length || 0;
      
      setKpiData({
        totalRevenue,
        totalExpenses,
        customerCount,
        inventoryValue,
        revenueChange,
        expensesChange,
        lowStockCount,
        pendingTransfers: 0
      });
    }
    
    fetchKPIData();
  }, [profile?.profile, locationLoading, dateRangeStrings, locationFilter, isWarehouseManager]);
  
  // Sales Chart Component (only for admin and store managers)
  function SalesChart() {
    const [salesData, setSalesData] = useState<ChartDataItem[]>([]);
    
    useEffect(() => {
      if (isWarehouseManager) return;
      
      async function fetchSalesData() {
        const supabase = createClient();
        
        // Get monthly sales data based on role and location
        if (locationFilter) {
          // We need a custom function that accepts location filter
          // For now, we'll filter the results on the client side
          const { data } = await supabase
            .from('sales')
            .select('total_amount, sale_date')
            .eq('status', 'Completed')
            .eq('location_id', locationFilter);
            
          // Group by month
          const monthlyData: Record<string, number> = {};
          data?.forEach(sale => {
            const month = format(new Date(sale.sale_date), 'MMM');
            if (!monthlyData[month]) {
              monthlyData[month] = 0;
            }
            monthlyData[month] += parseFloat(sale.total_amount.toString());
          });
          
          const formattedData = Object.keys(monthlyData).map(month => ({
            month,
            total: monthlyData[month]
          }));
          
          setSalesData(formattedData);
        } else {
          const { data } = await supabase.rpc('get_monthly_sales');
          setSalesData(data || []);
        }
      }
      
      fetchSalesData();
    }, [locationFilter, isWarehouseManager]);
    
    if (isWarehouseManager) return null;
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={salesData}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => [`$${value}`, 'Total']} />
          <Legend />
          <Bar dataKey="total" fill="#8884d8" name="Total Sales" />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  
  // Expense Chart Component (only for admin and store managers)
  function ExpenseChart() {
    const [expenseData, setExpenseData] = useState<ExpenseChartDataItem[]>([]);
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
    
    useEffect(() => {
      if (isWarehouseManager) return;
      
      async function fetchExpenseData() {
        const supabase = createClient();
        
        if (locationFilter) {
          // We need a custom function that accepts location filter
          // For now, we'll filter the results on the client side
          const { data } = await supabase
            .from('expenses')
            .select('amount, expense_categories(name)')
            .eq('status', 'approved')
            .eq('location_id', locationFilter);
            
          // Group by category
          const categoryData: Record<string, number> = {};
          data?.forEach((expense: any) => {
            const category = expense.expense_categories?.name || 'Other';
            if (!categoryData[category]) {
              categoryData[category] = 0;
            }
            categoryData[category] += parseFloat(expense.amount.toString());
          });
          
          const formattedData = Object.keys(categoryData).map(category => ({
            category,
            amount: categoryData[category]
          }));
          
          setExpenseData(formattedData);
        } else {
          const { data } = await supabase.rpc('get_expenses_by_category');
          setExpenseData(data || []);
        }
      }
      
      fetchExpenseData();
    }, [locationFilter, isWarehouseManager]);
    
    if (isWarehouseManager) return null;
    
    return (
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
    );
  }
  
  // Inventory Table Component
  function InventoryTable() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      async function fetchInventory() {
        try {
          setLoading(true);
          const supabase = createClient();
          
          let query = supabase
            .from('inventory')
            .select(`
              quantity,
              reserved_quantity,
              products(name, sku, base_price),
              locations(name, location_type)
            `)
            .lt('quantity', 10);
            
          if (locationFilter) {
            query = query.eq('location_id', locationFilter);
          }
          
          if (isWarehouseManager) {
            query = query.eq('locations.location_type', 'warehouse');
          }
          
          const { data } = await query.order('quantity', { ascending: true });
          
          // Transform the data
          const transformedData = data ? data.map(transformInventoryItem) : [];
          setInventory(transformedData);
        } catch (error) {
          console.error('Error fetching inventory:', error);
          setInventory([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchInventory();
    }, [locationFilter, isWarehouseManager]);
    
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <p>Loading inventory data...</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Reserved</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.length > 0 ? (
            inventory.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.products[0]?.name || 'Unknown'}</TableCell>
                <TableCell>{item.products[0]?.sku || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {item.locations[0]?.location_type === 'warehouse' ? (
                      <Building className="h-4 w-4 mr-1 text-blue-500" />
                    ) : (
                      <Truck className="h-4 w-4 mr-1 text-green-500" />
                    )}
                    {item.locations[0]?.name || 'Unknown'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.quantity < 5 ? "destructive" : "secondary"}>
                    {item.quantity}
                  </Badge>
                </TableCell>
                <TableCell>{item.reserved_quantity}</TableCell>
                <TableCell>${(item.quantity * (item.products[0]?.base_price || 0)).toFixed(2)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                No low stock items found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
  
  // Inventory Transfers Table (for warehouse managers)
  function InventoryTransfersTable() {
    const [transfers, setTransfers] = useState<TransferItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      if (!isWarehouseManager) return;
      
      async function fetchTransfers() {
        try {
          setLoading(true);
          const supabase = createClient();
          
          let query = supabase
            .from('inventory_transfers')
            .select(`
              transfer_id,
              quantity,
              created_at,
              products(name, sku),
              from_location:locations(name),
              to_location:locations(name)
            `);
            
          if (locationFilter) {
            query = query.or(`from_location_id.eq.${locationFilter},to_location_id.eq.${locationFilter}`);
          }
          
          const { data } = await query.order('created_at', { ascending: false }).limit(10);
          
          // Transform the data
          const transformedData = data ? data.map(transformTransferItem) : [];
          setTransfers(transformedData);
        } catch (error) {
          console.error('Error fetching transfers:', error);
          setTransfers([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchTransfers();
    }, [locationFilter, isWarehouseManager]);
    
    if (!isWarehouseManager) return null;
    
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <p>Loading transfer data...</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.length > 0 ? (
            transfers.map((transfer, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">#{transfer.transfer_id}</TableCell>
                <TableCell>{transfer.products[0]?.name || 'Unknown'}</TableCell>
                <TableCell>{transfer.quantity}</TableCell>
                <TableCell>{transfer.from_location[0]?.name || 'Unknown'}</TableCell>
                <TableCell>{transfer.to_location[0]?.name || 'Unknown'}</TableCell>
                <TableCell>{format(new Date(transfer.created_at), 'MMM dd, yyyy')}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                No transfer records found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
  
  // Activity Feed Component
  function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      async function fetchActivities() {
        try {
          setLoading(true);
          const supabase = createClient();
          
          if (isWarehouseManager) {
            // For warehouse managers, only show inventory transfers
            const { data: transfers } = await supabase
              .from('inventory_transfers')
              .select('created_at, quantity, products(name), from_location:locations(name), to_location:locations(name)')
              .order('created_at', { ascending: false })
              .limit(8);
              
            const transferActivities = transfers?.map((transfer: any) => ({
              type: 'transfer',
              date: transfer.created_at,
              description: `Transfer of ${transfer.quantity} units of ${(transfer.products as any)?.name || 'Unknown'} from ${(transfer.from_location as any)?.name || 'Unknown'} to ${(transfer.to_location as any)?.name || 'Unknown'}`,
              icon: <Package className="h-4 w-4 text-blue-500" />
            })) || [];
            
            setActivities(transferActivities);
            return;
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
          ]);
          
          // Combine and format activities
          const combinedActivities = [
            ...(sales.data || []).map(sale => ({
              type: 'sale',
              date: sale.sale_date,
              description: `Sale of $${sale.total_amount} to ${(sale.customers as any)?.first_name || 'Unknown'} ${(sale.customers as any)?.last_name || ''}`,
              icon: <DollarSign className="h-4 w-4 text-green-500" />
            })),
            ...(expenses.data || []).map(expense => ({
              type: 'expense',
              date: expense.expense_date,
              description: `Expense of $${expense.amount} to ${expense.vendor_name || 'Unknown'}`,
              icon: <TrendingDown className="h-4 w-4 text-red-500" />
            })),
            ...(transfers.data || []).map(transfer => ({
              type: 'transfer',
              date: transfer.created_at,
              description: `Transfer of ${transfer.quantity} units of ${(transfer.products as any)?.name || 'Unknown'} from ${(transfer.from_location as any)?.name || 'Unknown'} to ${(transfer.to_location as any)?.name || 'Unknown'}`,
              icon: <Package className="h-4 w-4 text-blue-500" />
            }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
          
          setActivities(combinedActivities);
        } catch (error) {
          console.error('Error fetching activities:', error);
          setActivities([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchActivities();
    }, [locationFilter, isWarehouseManager]);
    
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <p>Loading activities...</p>
        </div>
      );
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
    );
  }
  
  // Sales Table Component (only for admin and store managers)
  function SalesTable() {
    const [sales, setSales] = useState<SalesItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      if (isWarehouseManager) return;
      
      async function fetchSales() {
        try {
          setLoading(true);
          const supabase = createClient();
          
          let query = supabase
            .from('sales')
            .select(`
              sale_id,
              sale_date,
              total_amount,
              customers(first_name, last_name),
              locations(name)
            `);
            
          if (locationFilter) {
            query = query.eq('location_id', locationFilter);
          }
          
          const { data, error } = await query.order('sale_date', { ascending: false }).limit(10);
          
          if (error) {
            console.error('Error fetching sales:', error);
            setSales([]);
            return;
          }
          
          const formattedData = data ? data.map(transformSalesItem) : [];
          setSales(formattedData);
        } catch (err) {
          console.error('Error in fetchSales:', err);
          setSales([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchSales();
    }, [locationFilter, isWarehouseManager]);
    
    if (isWarehouseManager) return null;
    
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <p>Loading sales data...</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length > 0 ? (
            sales.map((sale, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">#{sale.sale_id}</TableCell>
                <TableCell>{format(new Date(sale.sale_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{sale.customer_name}</TableCell>
                <TableCell>{sale.location_name}</TableCell>
                <TableCell>${parseFloat(sale.total_amount.toString()).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="default">
                    {sale.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                No sales data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
  
  // Expenses Table Component (only for admin and store managers)
  function ExpensesTable() {
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      if (isWarehouseManager) return;
      
      async function fetchExpenses() {
        try {
          setLoading(true);
          const supabase = createClient();
          
          let query = supabase
            .from('expenses')
            .select(`
              expense_id,
              expense_date,
              amount,
              vendor_name,
              expense_categories(name),
              status
            `);
            
          if (locationFilter) {
            query = query.eq('location_id', locationFilter);
          }
          
          const { data } = await query.order('expense_date', { ascending: false }).limit(10);
          
          const formattedData = data ? data.map(transformExpenseItem) : [];
          setExpenses(formattedData);
        } catch (error) {
          console.error('Error fetching expenses:', error);
          setExpenses([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchExpenses();
    }, [locationFilter, isWarehouseManager]);
    
    if (isWarehouseManager) return null;
    
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <p>Loading expenses data...</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length > 0 ? (
            expenses.map((expense, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">#{expense.expense_id}</TableCell>
                <TableCell>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{expense.vendor_name}</TableCell>
                <TableCell>{expense.category_name}</TableCell>
                <TableCell>${parseFloat(expense.amount.toString()).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={expense.status === 'approved' ? 'default' : expense.status === 'pending' ? 'secondary' : 'destructive'}>
                    {expense.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                No expense data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
  
  // Loans Table Component (only for admin and store managers)
  function LoansTable() {
    const [loans, setLoans] = useState<LoanItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      if (isWarehouseManager) return;
      
      async function fetchLoans() {
        try {
          setLoading(true);
          const supabase = createClient();
          
          let query = supabase
            .from('loans')
            .select(`
              loan_id,
              loan_amount,
              loan_date,
              due_date,
              status,
              customers(first_name, last_name),
              locations(name)
            `);
            
          if (locationFilter) {
            query = query.eq('location_id', locationFilter);
          }
          
          const { data } = await query.order('loan_date', { ascending: false }).limit(10);
          
          const formattedData = data ? data.map(transformLoanItem) : [];
          setLoans(formattedData);
        } catch (error) {
          console.error('Error fetching loans:', error);
          setLoans([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchLoans();
    }, [locationFilter, isWarehouseManager]);
    
    if (isWarehouseManager) return null;
    
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <p>Loading loans data...</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length > 0 ? (
            loans.map((loan, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">#{loan.loan_id}</TableCell>
                <TableCell>{format(new Date(loan.loan_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{loan.customer_name}</TableCell>
                <TableCell>${parseFloat(loan.loan_amount.toString()).toFixed(2)}</TableCell>
                <TableCell>{loan.due_date ? format(new Date(loan.due_date), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={loan.status === 'paid' ? 'default' : 'secondary'}>
                    {loan.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                No loan data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
  
  // Date Range Picker Component
  function DateRangePicker() {
    return (
      <div className="flex items-center space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                if (range) {
                  setDateRange(range as { from: Date; to: Date });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  
  // Location Selector (only for admin)
  function LocationSelector() {
    if (!isAdmin) return null;
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Location:</span>
        <div className="flex items-center space-x-1">
          {locations.map(location => (
            <Button
              key={location.location_id}
              variant={currentLocation?.location_id === location.location_id ? "default" : "outline"}
              size="sm"
              onClick={() => currentLocation?.location_id !== location.location_id && setCurrentLocation(location)}
            >
              {location.name}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  
  // Dashboard header based on role
  const getDashboardTitle = useCallback(() => {
    if (isAdmin) return "Business Dashboard";
    if (isWarehouseManager) return "Warehouse Dashboard";
    return "Store Dashboard";
  }, [isAdmin, isWarehouseManager]);
  
  const getDashboardDescription = useCallback(() => {
    if (isAdmin) return "Overview of all business operations";
    if (isWarehouseManager) return "Inventory and transfer management";
    return "Sales and store performance";
  }, [isAdmin, isWarehouseManager]);
  
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{getDashboardTitle()}</h1>
          <p className="text-muted-foreground">{getDashboardDescription()}</p>
          {currentLocation && (
            <div className="flex items-center mt-1">
              {currentLocation.location_type === 'warehouse' ? (
                <Building className="h-4 w-4 mr-1 text-blue-500" />
              ) : (
                <Truck className="h-4 w-4 mr-1 text-green-500" />
              )}
              <span className="text-sm text-muted-foreground">
                {currentLocation.name} {isAdmin && `(${currentLocation.location_type})`}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <LocationSelector />
          {!isWarehouseManager && <DateRangePicker />}
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.profile?.avatar_url || ''} />
              <AvatarFallback>{profile?.profile?.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{profile?.profile?.full_name}</div>
              <div className="text-xs text-muted-foreground capitalize">{profile?.profile?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {!isWarehouseManager && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${kpiData.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {kpiData.revenueChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">+{kpiData.revenueChange.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-500">{kpiData.revenueChange.toFixed(1)}%</span>
                    </>
                  )}{' '}
                  from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${kpiData.totalExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {kpiData.expensesChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-500">+{kpiData.expensesChange.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">{kpiData.expensesChange.toFixed(1)}%</span>
                    </>
                  )}{' '}
                  from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.customerCount}</div>
                <p className="text-xs text-muted-foreground">
                  +12 new this week
                </p>
              </CardContent>
            </Card>
          </>
        )}
        
        {isWarehouseManager && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${kpiData.inventoryValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Total warehouse value
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.lowStockCount}</div>
                <p className="text-xs text-muted-foreground">
                  Need restocking
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.pendingTransfers}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>
          </>
        )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isWarehouseManager ? "Total Products" : "Inventory Value"}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isWarehouseManager ? "1,248" : `$${kpiData.inventoryValue.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {isWarehouseManager ? "Products in warehouse" : `${kpiData.lowStockCount} products low in stock`}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts - Only for admin and store managers */}
      {!isWarehouseManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Monthly sales for the current year</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesChart />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseChart />
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Inventory & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {isWarehouseManager ? "Inventory Status" : "Low Stock Items"}
            </CardTitle>
            <CardDescription>
              {isWarehouseManager ? "Current stock levels in warehouse" : "Products that need restocking"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryTable />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              {isWarehouseManager ? "Latest inventory transfers" : "Latest transactions and updates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Tables */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Tabs defaultValue={isWarehouseManager ? "transfers" : "sales"} className="w-full">
          <TabsList className={`grid w-full grid-cols-${isWarehouseManager ? '1' : '3'}`}>
            {!isWarehouseManager && (
              <>
                <TabsTrigger value="sales">Recent Sales</TabsTrigger>
                <TabsTrigger value="expenses">Recent Expenses</TabsTrigger>
              </>
            )}
            <TabsTrigger value={isWarehouseManager ? "transfers" : "loans"}>
              {isWarehouseManager ? "Inventory Transfers" : "Loan Status"}
            </TabsTrigger>
          </TabsList>
          
          {!isWarehouseManager && (
            <>
              <TabsContent value="sales">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>Latest sales transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SalesTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="expenses">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Expenses</CardTitle>
                    <CardDescription>Latest expense reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ExpensesTable />
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
          
          <TabsContent value={isWarehouseManager ? "transfers" : "loans"}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {isWarehouseManager ? "Inventory Transfers" : "Loan Status"}
                </CardTitle>
                <CardDescription>
                  {isWarehouseManager ? "Recent inventory transfers" : "Active and pending loans"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isWarehouseManager ? <InventoryTransfersTable /> : <LoansTable />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}