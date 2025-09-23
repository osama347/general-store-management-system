export interface ReportFilters {
  startDate: string;
  endDate: string;
  location?: string;
  category?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export interface Location {
  location_id: number;
  name: string;
  address: string;
  location_type: 'warehouse' | 'store';
  created_at: string;
  original_id?: string;
}

export interface Category {
  category_id: number;
  name: string;
  description?: string;
}

export interface ExpenseCategory {
  category_id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Sale {
  sale_id: number;
  customer_id: number;
  staff_id: number;
  sale_date: string;
  total_amount: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  customers?: Customer;
  staff?: Staff;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  sale_item_id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: Product;
}

export interface Product {
  product_id: number;
  category_id: number;
  name: string;
  description?: string;
  sku?: string;
  base_price: number;
  categories?: Category;
  inventory?: Inventory[];
}

export interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  sales?: Sale[];
  loans?: Loan[];
}

export interface Staff {
  staff_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: 'manager' | 'salesperson' | 'cashier' | 'other';
  hire_date: string;
}

export interface Expense {
  expense_id: number;
  location_id?: number;
  staff_id?: number;
  category_id?: number;
  amount: number;
  expense_date: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_number?: string;
  vendor_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  locations?: Location;
  staff?: Staff;
  expense_categories?: ExpenseCategory;
}

export interface Inventory {
  product_id: number;
  location_id: number;
  quantity: number;
  reserved_quantity: number;
  updated_at: string;
  products?: Product;
  locations?: Location;
}

export interface InventoryTransfer {
  transfer_id: number;
  product_id: number;
  from_location_id: number;
  to_location_id: number;
  quantity: number;
  created_at: string;
  created_by: number;
  products?: Product;
  from_location?: Location;
  to_location?: Location;
  staff?: Staff;
}

export interface Loan {
  loan_id: number;
  loan_amount: number;
  loan_date: string;
  due_date?: string;
  status: 'pending' | 'paid';
  customer_id?: number;
  customers?: Customer;
}

export interface FinancialSummary {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  loans: number;
}

export interface SalesSummary {
  date: string;
  total_sales: number;
  total_items: number;
  average_order_value: number;
  total_customers: number;
}
