

import { createClient } from '@/lib/supabase/client';
import type {
  ReportFilters,
  Location,
  Category,
  ExpenseCategory,
  Sale,
  SaleItem,
  Product,
  Customer,
  Expense,
  Inventory,
  InventoryTransfer,
  Staff,
  
  FinancialSummary
} from '@/types/reports';

const supabase = createClient();

export const ReportsService = {
  // Fetch locations
  fetchLocations: async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('location_id, name, address, location_type, created_at, original_id')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('category_id, name, description')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Fetch all expense categories
  fetchExpenseCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('category_id, name, description, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      throw error;
    }
  },

  // Fetch sales data with detailed information
  fetchSalesData: async (filters: ReportFilters) => {
    try {
      let query = supabase
        .from('sales')
        .select(`
          sale_id,
          customer_id,
          staff_id,
          sale_date,
          total_amount,
          status,
          customers!sales_customer_id_fkey (
            customer_id,
            first_name,
            last_name,
            email,
            phone
          ),
          staff!sales_staff_id_fkey (
            staff_id,
            first_name,
            last_name,
            role
          ),
          sale_items!sale_items_sale_id_fkey (
            sale_item_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products!sale_items_product_id_fkey (
              product_id,
              name,
              sku,
              base_price,
              categories!products_category_id_fkey (
                name
              )
            )
          )
        `)
        .gte('sale_date', filters.startDate)
        .lte('sale_date', filters.endDate)
        .order('sale_date', { ascending: false });

      if (filters.location && filters.location !== 'all') {
        query = query.eq('staff.location_id', filters.location);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales data:', error);
        throw error;
      }

      if (!data) return [];

      // Process and aggregate data by date
      interface DailyData {
        date: string;
        revenue: number;
        orders: number;
        uniqueCustomers: number;
        customerIds: string[];
        totalItems: number;
        averageOrderValue: number;
      }

      const dailyData = data.reduce((acc: DailyData[], sale) => {
        const date = new Date(sale.sale_date).toISOString().split('T')[0];
        const existing = acc.find(item => item.date === date);

        if (existing) {
          existing.revenue += sale.total_amount;
          existing.orders += 1;
          if (!existing.customerIds.includes(sale.customer_id)) {
            existing.customerIds.push(sale.customer_id);
            existing.uniqueCustomers += 1;
          }
          existing.totalItems += sale.sale_items?.reduce((sum: number, item: any) => 
            sum + item.quantity, 0) || 0;
          existing.averageOrderValue = existing.revenue / existing.orders;
        } else {
          acc.push({
            date,
            revenue: sale.total_amount,
            orders: 1,
            uniqueCustomers: 1,
            customerIds: [sale.customer_id],
            totalItems: sale.sale_items?.reduce((sum: number, item: any) => 
              sum + item.quantity, 0) || 0,
            averageOrderValue: sale.total_amount
          });
        }
        
        return acc;
      }, []);

      return dailyData.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error in fetchSalesData:', error);
      throw error;
    }
  },
  
  // Fetch financial data
  fetchFinancialData: async (filters:any) => {
    // Fetch sales data for revenue
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('sale_date, total_amount')
      .gte('sale_date', filters.startDate)
      .lte('sale_date', filters.endDate);

    if (salesError) {
      console.error('Error fetching sales data for financial report:', salesError);
      throw salesError;
    }

    // Fetch expense data
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('expense_date, amount, category_id, expense_categories!expenses_category_id_fkey(name)')
      .gte('expense_date', filters.startDate)
      .lte('expense_date', filters.endDate);

    if (expenseError) {
      console.error('Error fetching expense data:', expenseError);
      throw expenseError;
    }

    // Fetch loans data
    const { data: loansData, error: loansError } = await supabase
      .from('loans')
      .select('loan_date, loan_amount, status')
      .gte('loan_date', filters.startDate)
      .lte('loan_date', filters.endDate);

    if (loansError) {
      console.error('Error fetching loans data:', loansError);
      throw loansError;
    }

    // Define interface for monthly data
    interface MonthlyData {
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
      loans: number;
    }

    // Aggregate by month
    const monthlyData: { [key: string]: MonthlyData } = {};
    
    // Process sales
    salesData.forEach(sale => {
      const month = new Date(sale.sale_date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, expenses: 0, profit: 0, loans: 0 };
      }
      monthlyData[month].revenue += sale.total_amount;
    });

    // Process expenses
    expenseData.forEach(expense => {
      const month = new Date(expense.expense_date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, expenses: 0, profit: 0, loans: 0 };
      }
      monthlyData[month].expenses += expense.amount;
    });

    // Process loans
    loansData.forEach(loan => {
      const month = new Date(loan.loan_date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, expenses: 0, profit: 0, loans: 0 };
      }
      monthlyData[month].loans += loan.loan_amount;
    });

    // Calculate profit
    Object.values(monthlyData).forEach(month => {
      month.profit = month.revenue - month.expenses;
    });

    return Object.values(monthlyData);
  },
  
  // Fetch product performance data
  fetchProductPerformance: async (filters:any) => {
    let query = supabase
      .from('sale_items')
      .select(`
        quantity,
        unit_price,
        product_id,
        sales!sale_items_sale_id_fkey(sale_date),
        products:products!sale_items_product_id_fkey(
          product_id,
          name,
          sku,
          base_price,
          categories:categories!products_category_id_fkey(name)
        )
      `)
      .gte('sales.sale_date', filters.startDate)
      .lte('sales.sale_date', filters.endDate);

    if (filters.category && filters.category !== 'all') {
      query = query.eq('products.category_id', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching product performance data:', error);
      throw error;
    }

    interface ProductMapItem {
      product_id: number;
      product: string;
      category: string;
      sku: string;
      unitsSold: number;
      revenue: number;
      profit: number;
      stock: number;
    }

    // Aggregate by product
    const productMap: { [key: number]: ProductMapItem } = {};
    
    data.forEach(item => {
      const product = item.products[0];
      if (!productMap[product.product_id]) {
        productMap[product.product_id] = {
          product_id: product.product_id,
          product: product.name,
          category: product.categories?.[0]?.name || 'Unknown',
          sku: product.sku,
          unitsSold: 0,
          revenue: 0,
          profit: 0,
          stock: 0 // Will fetch separately
        };
      }
      
      productMap[product.product_id].unitsSold += item.quantity;
      productMap[product.product_id].revenue += item.quantity * item.unit_price;
      productMap[product.product_id].profit += item.quantity * (item.unit_price - product.base_price);
    });

    // Fetch current stock levels
    const productIds = Object.keys(productMap);
    if (productIds.length > 0) {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('product_id, quantity')
        .in('product_id', productIds);

      if (inventoryError) {
        console.error('Error fetching inventory data:', inventoryError);
        throw inventoryError;
      }

      inventoryData.forEach(inv => {
        if (productMap[inv.product_id]) {
          productMap[inv.product_id].stock = inv.quantity;
        }
      });
    }

    return Object.values(productMap);
  },
  
  // Fetch customer analytics data
  fetchCustomerAnalytics: async (filters:any) => {
    // Fetch all customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('customer_id, first_name, last_name, created_at');

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      throw customersError;
    }

    // Fetch sales data for customer segmentation
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('customer_id, total_amount, sale_date')
      .gte('sale_date', filters.startDate)
      .lte('sale_date', filters.endDate);

    if (salesError) {
      console.error('Error fetching sales for customer analytics:', salesError);
      throw salesError;
    }

    type CustomerSegmentKey = 'New Customers' | 'Returning Customers' | 'VIP Customers' | 'Inactive Customers';
    const customerSegments = {
      'New Customers': { count: 0, revenue: 0, avgOrderValue: 0 },
      'Returning Customers': { count: 0, revenue: 0, avgOrderValue: 0 },
      'VIP Customers': { count: 0, revenue: 0, avgOrderValue: 0 },
      'Inactive Customers': { count: 0, revenue: 0, avgOrderValue: 0 }
    };

    interface CustomerStat {
      totalSpent: number;
      orderCount: number;
      lastOrder: Date;
    }

    const customerStats: { [key: string]: CustomerStat } = {};
    
    // Calculate customer stats
    sales.forEach(sale => {
      if (!customerStats[sale.customer_id]) {
        customerStats[sale.customer_id] = {
          totalSpent: 0,
          orderCount: 0,
          lastOrder: new Date(sale.sale_date)
        };
      }
      
      customerStats[sale.customer_id].totalSpent += sale.total_amount;
      customerStats[sale.customer_id].orderCount += 1;
      
      const saleDate = new Date(sale.sale_date);
      if (saleDate > customerStats[sale.customer_id].lastOrder) {
        customerStats[sale.customer_id].lastOrder = saleDate;
      }
    });

    // Segment customers based on their activity
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    customers.forEach(customer => {
      const stats = customerStats[customer.customer_id] || {
        totalSpent: 0,
        orderCount: 0,
        lastOrder: new Date(customer.created_at)
      };

      let segment: CustomerSegmentKey = 'Inactive Customers';
      
      if (stats.lastOrder >= thirtyDaysAgo) {
        if (stats.totalSpent > 1000) {
          segment = 'VIP Customers';
        } else if (stats.orderCount > 1) {
          segment = 'Returning Customers';
        } else {
          segment = 'New Customers';
        }
      } else if (stats.lastOrder >= ninetyDaysAgo) {
        segment = 'Returning Customers';
      }

      customerSegments[segment].count += 1;
      customerSegments[segment].revenue += stats.totalSpent;
      customerSegments[segment].avgOrderValue = 
        customerSegments[segment].count > 0 
          ? customerSegments[segment].revenue / customerSegments[segment].count 
          : 0;
    });

    // Convert to array and calculate percentages
    const totalCustomers = customers.length;
    return Object.entries(customerSegments).map(([segment, data]) => ({
      segment,
      count: data.count,
      percentage: totalCustomers > 0 ? Math.round((data.count / totalCustomers) * 100) : 0,
      revenue: data.revenue,
      avgOrderValue: Math.round(data.avgOrderValue)
    }));
  },
  
  // Fetch inventory data
  fetchInventoryData: async (filters: ReportFilters) => {
    try {
      let query = supabase
        .from('inventory')
        .select(`
          product_id,
          location_id,
          quantity,
          reserved_quantity,
          updated_at,
          products!inventory_product_id_fkey (
            product_id,
            name,
            sku,
            base_price,
            description,
            categories!products_category_id_fkey (
              name
            )
          ),
          locations!inventory_location_id_fkey (
            location_id,
            name,
            location_type
          )
        `);

      if (filters.location && filters.location !== 'all') {
        query = query.eq('location_id', filters.location);
      }

      if (filters.category && filters.category !== 'all') {
        query = query.eq('products.category_id', filters.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inventory data:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(item => {
        const available = (item.quantity || 0) - (item.reserved_quantity || 0);
        let status = 'In Stock';
        
        if (available <= 0) {
          status = 'Out of Stock';
        } else if (available <= 10) {
          status = 'Low Stock';
        }

        return {
          product_id: item.product_id,
          location_id: item.location_id,
          name: item.products?.[0]?.name,
          sku: item.products?.[0]?.sku,
          quantity: item.quantity || 0,
          reserved_quantity: item.reserved_quantity || 0,
          available_quantity: available,
          reorder_point: 10,
          status,
          location_name: item.locations[0]?.name,
          category: item.products[0]?.categories[0]?.name
        };
      });
    } catch (error) {
      console.error('Error in fetchInventoryData:', error);
      throw error;
    }
  },
  
  // Fetch expense data
  fetchExpenseData: async (filters: ReportFilters) => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          expense_id,
          location_id,
          staff_id,
          category_id,
          amount,
          expense_date,
          status,
          receipt_number,
          vendor_name,
          notes,
          created_at,
          expense_categories!expenses_category_id_fkey (
            category_id,
            name,
            description
          ),
          locations!expenses_location_id_fkey (
            location_id,
            name
          ),
          staff!expenses_staff_id_fkey (
            staff_id,
            first_name,
            last_name
          )
        `)
        .gte('expense_date', filters.startDate)
        .lte('expense_date', filters.endDate);

      if (filters.location && filters.location !== 'all') {
        query = query.eq('location_id', filters.location);
      }

      if (filters.category && filters.category !== 'all') {
        query = query.eq('category_id', filters.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching expense data:', error);
        throw error;
      }

      if (!data) return [];

      // Process and aggregate data
      const aggregated = data.reduce((acc: { [key: string]: any }, expense) => {
        const category = expense.expense_categories[0]?.name || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = {
            category,
            amount: 0,
            count: 0,
            location: expense.locations[0]?.name,
            staff: `${expense.staff[0]?.first_name || ''} ${expense.staff[0]?.last_name || ''}`.trim(),
            entries: []
          };
        }
        acc[category].amount += expense.amount;
        acc[category].count++;
        acc[category].entries.push({
          expense_id: expense.expense_id,
          amount: expense.amount,
          date: new Date(expense.expense_date).toISOString(),
          status: expense.status,
          vendor: expense.vendor_name,
          receipt: expense.receipt_number
        });
        return acc;
      }, {});

      return Object.values(aggregated).map((category: any) => ({
        ...category,
        entries: category.entries.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
    } catch (error) {
      console.error('Error in fetchExpenseData:', error);
      throw error;
    }
  },
  
  // Fetch inventory transfers
  fetchInventoryTransfers: async (filters: ReportFilters) => {
    try {
      let query = supabase
        .from('inventory_transfers')
        .select(`
          transfer_id,
          product_id,
          from_location_id,
          to_location_id,
          quantity,
          created_at,
          created_by,
          products!inventory_transfers_product_id_fkey (
            product_id,
            name,
            sku
          ),
          from_location:locations!inventory_transfers_from_location_id_fkey (
            location_id,
            name
          ),
          to_location:locations!inventory_transfers_to_location_id_fkey (
            location_id,
            name
          ),
          staff!inventory_transfers_created_by_fkey (
            staff_id,
            first_name,
            last_name
          )
        `)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate)
        .order('created_at', { ascending: false });

      if (filters.location && filters.location !== 'all') {
        query = query.or(`and(from_location_id.eq.${filters.location},to_location_id.eq.${filters.location})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inventory transfers:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(transfer => ({
        transfer_id: transfer.transfer_id,
        product_name: transfer.products[0]?.name || 'Unknown Product',
        product_sku: transfer.products[0]?.sku || 'N/A',
        from_location: transfer.from_location[0]?.name || 'Unknown Location',
        to_location: transfer.to_location[0]?.name || 'Unknown Location',
        quantity: transfer.quantity,
        created_at: new Date(transfer.created_at).toISOString(),
        created_by: `${transfer.staff[0]?.first_name || ''} ${transfer.staff[0]?.last_name || ''}`.trim() || 'Unknown'
      }));
    } catch (error) {
      console.error('Error in fetchInventoryTransfers:', error);
      throw error;
    }
  },
  
  // Fetch locations for filters
  fetchLocationsForFilters: async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('location_id, name, location_type')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
    return data;
  },
  
  // Fetch categories for filters
  fetchCategoriesForFilters: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id, name')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
    return data;
  },
  
  // Fetch expense categories
  // fetchExpenseCategories: async () => {
  //   const { data, error } = await supabase
  //     .from('expense_categories')
  //     .select('category_id, name')
  //     .eq('is_active', true)
  //     .order('name');

  //   if (error) {
  //     console.error('Error fetching expense categories:', error);
  //     throw error;
  //   }
  //   return data;
  // }
};