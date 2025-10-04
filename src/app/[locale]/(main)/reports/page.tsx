"use client"
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  AlertCircle, 
  Loader2, 
  Download, 
  Calendar,
  Building2,
  Package,
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  Receipt,
  TruckIcon,
  Boxes,
  FileBarChart,
  Filter
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from '@/contexts/LocationContext';
import { PDFGenerator } from '@/lib/pdf-generator';
import { useTranslations } from 'next-intl';

// shadcn/ui imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Location = {
  location_id: bigint;
  name: string;
  location_type: 'warehouse' | 'store';
};

type Category = {
  category_id: number;
  name: string;
};

type ExpenseCategory = {
  category_id: number;
  name: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

const ReportsModule = () => {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const { currentLocation, isLoading: locationLoading } = useLocation();
  
  // Get user's location and role
  const userLocationId = profile?.location_id;
  const isAdmin = profile?.role === 'admin';
  
  // Form state
  const [reportType, setReportType] = useState<string>('sales');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [reportStatus, setReportStatus] = useState<string>('all');
  
  // Data state
  const [generating, setGenerating] = useState(false);

  const t = useTranslations('reports');
  const rawInfoCardItems = t.raw('generator.infoCard.items');
  const infoCardItems = Array.isArray(rawInfoCardItems) ? (rawInfoCardItems as string[]) : [];
  
  // Fetch filter options with React Query
  const fetchFilterOptions = async () => {
    const [locationsRes, categoriesRes, expenseCategoriesRes, staffRes] = await Promise.all([
      supabase.from('locations').select('location_id, name, location_type'),
      supabase.from('categories').select('category_id, name'),
      supabase.from('expense_categories').select('category_id, name').eq('is_active', true),
      supabase.from('profiles').select('id, full_name, email').eq('is_active', true)
    ]);
    
    if (locationsRes.error) throw locationsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (expenseCategoriesRes.error) throw expenseCategoriesRes.error;
    if (staffRes.error) throw staffRes.error;
    
    return {
      locations: locationsRes.data || [],
      categories: categoriesRes.data || [],
      expenseCategories: expenseCategoriesRes.data || [],
      staff: staffRes.data || []
    };
  };

  // React Query for filter options
  const { data, isLoading: loading } = useQuery({
    queryKey: ['report-filters'],
    queryFn: fetchFilterOptions,
    enabled: !authLoading && !locationLoading,
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  const locations = data?.locations || [];
  const categories = data?.categories || [];
  const expenseCategories = data?.expenseCategories || [];
  const staff = data?.staff || [];
  
  // Fetch report data from Supabase
  const fetchReportData = async () => {
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59`;
    
    // Determine effective location for filtering
    let effectiveLocationId: string | undefined;
    if (isAdmin) {
      // Admin uses currentLocation from sidebar or 'all'
      effectiveLocationId = currentLocation?.location_id?.toString();
    } else {
      // Non-admin must use their assigned location
      effectiveLocationId = userLocationId?.toString();
    }
    
    console.log('Fetching report data for:', {
      reportType,
      startDateTime,
      endDateTime,
      effectiveLocationId,
      isAdmin,
      userId: profile?.id,
      selectedCategory
    });
    
    try {
      let query;
      let data;
      
      switch (reportType) {
        case 'sales': {
          let salesQuery = supabase
            .from('sales')
            .select(`
              *,
              customers (first_name, last_name, email, phone),
              profiles (full_name, email),
              locations (name, location_type),
              sale_items (
                *,
                products (name, sku, category_id)
              )
            `)
            .gte('sale_date', startDateTime)
            .lte('sale_date', endDateTime)
            .order('sale_date', { ascending: false });
          
          // Apply location filter based on user role
          if (effectiveLocationId) {
            salesQuery = salesQuery.eq('location_id', effectiveLocationId);
          }
          
          // Non-admin can only see their own sales
          if (!isAdmin) {
            salesQuery = salesQuery.eq('profile_id', profile?.id);
          } else if (selectedStaff !== 'all') {
            salesQuery = salesQuery.eq('profile_id', selectedStaff);
          }
          
          if (reportStatus !== 'all') salesQuery = salesQuery.eq('status', reportStatus);
          
          const { data: salesData, error: salesError } = await salesQuery;
          if (salesError) throw salesError;
          data = salesData;
          break;
        }
          
        case 'inventory': {
          let inventoryQuery = supabase
            .from('inventory')
            .select(`
              *,
              products (
                name,
                sku,
                base_price,
                categories (name)
              ),
              locations (name, location_type)
            `)
            .gte('updated_at', startDateTime)
            .lte('updated_at', endDateTime)
            .order('updated_at', { ascending: false });
          
          // Apply location filter based on user role
          if (effectiveLocationId) {
            inventoryQuery = inventoryQuery.eq('location_id', effectiveLocationId);
          }
          
          if (selectedCategory !== 'all') inventoryQuery = inventoryQuery.eq('products.category_id', selectedCategory);
          
          const { data: inventoryData, error: inventoryError } = await inventoryQuery;
          if (inventoryError) throw inventoryError;
          data = inventoryData;
          break;
        }
          
        case 'expenses': {
          let expensesQuery = supabase
            .from('expenses')
            .select(`
              *,
              expense_categories (name),
              locations (name, location_type),
              profiles (full_name, email)
            `)
            .gte('expense_date', startDateTime)
            .lte('expense_date', endDateTime)
            .order('expense_date', { ascending: false });
          
          // Apply location filter based on user role
          if (effectiveLocationId) {
            expensesQuery = expensesQuery.eq('location_id', effectiveLocationId);
          }
          
          // Non-admin can only see their own expenses
          if (!isAdmin) {
            expensesQuery = expensesQuery.eq('profile_id', profile?.id);
          } else if (selectedStaff !== 'all') {
            expensesQuery = expensesQuery.eq('profile_id', selectedStaff);
          }
          
          if (selectedExpenseCategory !== 'all') expensesQuery = expensesQuery.eq('category_id', selectedExpenseCategory);
          if (reportStatus !== 'all') expensesQuery = expensesQuery.eq('status', reportStatus);
          
          const { data: expensesData, error: expensesError } = await expensesQuery;
          if (expensesError) throw expensesError;
          data = expensesData;
          break;
        }
          
        case 'loans': {
          let loansQuery = supabase
            .from('loans')
            .select(`
              *,
              customers (first_name, last_name, email, phone, address),
              locations (name, location_type)
            `)
            .gte('loan_date', startDateTime)
            .lte('loan_date', endDateTime)
            .order('loan_date', { ascending: false });
          
          // Apply location filter based on user role
          if (effectiveLocationId) {
            loansQuery = loansQuery.eq('location_id', effectiveLocationId);
          }
          
          if (reportStatus !== 'all') loansQuery = loansQuery.eq('status', reportStatus);
          
          const { data: loansData, error: loansError } = await loansQuery;
          if (loansError) throw loansError;
          data = loansData;
          break;
        }
        
        case 'transfers': {
          let transfersQuery = supabase
            .from('inventory_transfers')
            .select(`
              *,
              products (name, sku),
              from_location:locations!inventory_transfers_from_location_id_fkey (name, location_type),
              to_location:locations!inventory_transfers_to_location_id_fkey (name, location_type),
              profiles (full_name, email)
            `)
            .gte('created_at', startDateTime)
            .lte('created_at', endDateTime)
            .order('created_at', { ascending: false });
          
          // Apply location filter based on user role
          if (effectiveLocationId) {
            transfersQuery = transfersQuery.or(`from_location_id.eq.${effectiveLocationId},to_location_id.eq.${effectiveLocationId}`);
          }
          
          // Non-admin can only see their own transfers
          if (!isAdmin) {
            transfersQuery = transfersQuery.eq('created_by_profile_id', profile?.id);
          } else if (selectedStaff !== 'all') {
            transfersQuery = transfersQuery.eq('created_by_profile_id', selectedStaff);
          }
          
          const { data: transfersData, error: transfersError } = await transfersQuery;
          if (transfersError) throw transfersError;
          data = transfersData;
          break;
        }
        
        case 'customers': {
          let customersQuery = supabase
            .from('customers')
            .select(`
              *,
              locations (name, location_type),
              sales (sale_id, sale_date, total_amount, status),
              loans (loan_id, loan_amount, loan_date, due_date, status)
            `)
            .gte('created_at', startDateTime)
            .lte('created_at', endDateTime)
            .order('created_at', { ascending: false });
          
          // Apply location filter based on user role
          if (effectiveLocationId) {
            customersQuery = customersQuery.eq('location_id', effectiveLocationId);
          }
          
          const { data: customersData, error: customersError } = await customersQuery;
          if (customersError) throw customersError;
          data = customersData;
          break;
        }
        
        case 'financial': {
          // Build queries for financial summary
          let salesQuery = supabase
            .from('sales')
            .select('sale_id, sale_date, total_amount, status, location_id, profile_id')
            .gte('sale_date', startDateTime)
            .lte('sale_date', endDateTime)
            .eq('status', 'Completed');
          
          let expensesQuery = supabase
            .from('expenses')
            .select('expense_id, expense_date, amount, status, location_id, profile_id, expense_categories(name)')
            .gte('expense_date', startDateTime)
            .lte('expense_date', endDateTime)
            .eq('status', 'approved');
          
          let loansQuery = supabase
            .from('loans')
            .select('loan_id, loan_date, loan_amount, status, location_id')
            .gte('loan_date', startDateTime)
            .lte('loan_date', endDateTime);
          
          // Apply location filter
          if (effectiveLocationId) {
            salesQuery = salesQuery.eq('location_id', effectiveLocationId);
            expensesQuery = expensesQuery.eq('location_id', effectiveLocationId);
            loansQuery = loansQuery.eq('location_id', effectiveLocationId);
          }
          
          // Apply user filter for non-admin
          if (!isAdmin && profile?.id) {
            salesQuery = salesQuery.eq('profile_id', profile.id);
            expensesQuery = expensesQuery.eq('profile_id', profile.id);
          }
          
          // Fetch all data
          const [salesRes, expensesRes, loansRes] = await Promise.all([
            salesQuery,
            expensesQuery,
            loansQuery
          ]);
          
          if (salesRes.error) throw salesRes.error;
          if (expensesRes.error) throw expensesRes.error;
          if (loansRes.error) throw loansRes.error;
          
          data = {
            sales: salesRes.data || [],
            expenses: expensesRes.data || [],
            loans: loansRes.data || []
          };
          break;
        }
          
        case 'products': {
          let productsQuery = supabase
            .from('products')
            .select(`
              *,
              categories (name),
              sale_items (quantity, unit_price, total_price, sale_id),
              inventory (location_id, quantity, reserved_quantity, locations(name))
            `)
            .order('name', { ascending: true });
          
          if (selectedCategory !== 'all') productsQuery = productsQuery.eq('category_id', selectedCategory);
          
          const { data: productsData, error: productsError } = await productsQuery;
          if (productsError) throw productsError;
          data = productsData;
          break;
        }
          
        default:
          throw new Error('Invalid report type');
      }
      
      console.log('Report data fetched successfully:', {
        reportType,
        dataLength: Array.isArray(data) ? data.length : 'N/A (object)',
        dataKeys: !Array.isArray(data) ? Object.keys(data) : null
      });
      
      return data;
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      // Provide detailed error information
      const errorMessage = error?.message || error?.error_description || error?.details || 'Unknown database error';
      throw new Error(`Database error: ${errorMessage}`);
    }
  };
  
  // Generate PDF report
  const generatePDFReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setGenerating(true);
    console.log('Starting PDF generation for:', reportType);
    
    try {
      // Fetch report data first
      const reportData = await fetchReportData();
      
      // Determine location name for PDF
      let locationName = 'All Locations';
      if (isAdmin && currentLocation) {
        locationName = currentLocation.name;
      } else if (!isAdmin && userLocationId) {
        const userLocation = locations.find(l => l.location_id.toString() === userLocationId.toString());
        locationName = userLocation?.name || 'Unknown Location';
      }
      
      // Prepare filters for PDF generation
      const filters = {
        reportType,
        startDate,
        endDate,
        location: locationName,
        category: selectedCategory !== 'all' ? (categories.find(c => c.category_id.toString() === selectedCategory)?.name || 'Unknown Category') : 'All Categories',
        expenseCategory: selectedExpenseCategory !== 'all' ? (expenseCategories.find(c => c.category_id.toString() === selectedExpenseCategory)?.name || 'Unknown Category') : 'All Categories',
        staff: !isAdmin ? (profile?.full_name || profile?.email || 'Unknown Staff') : (selectedStaff !== 'all' ? (staff.find(s => s.id === selectedStaff)?.full_name || staff.find(s => s.id === selectedStaff)?.email || 'Unknown Staff') : 'All Staff'),
        status: reportStatus !== 'all' ? reportStatus : 'All Statuses',
        generatedBy: profile?.full_name || profile?.email || 'Unknown',
        generatedAt: new Date().toLocaleString()
      };
      
      // Generate and download PDF
      const pdfGenerator = new PDFGenerator();
      pdfGenerator.download(reportType, reportData, filters);
      
      const dataCount = Array.isArray(reportData) 
        ? reportData.length 
        : Object.values(reportData).flat().length;
      
      toast.success(`PDF report generated successfully!`, {
        description: `Report contains ${dataCount} records and has been downloaded.`
      });
    } catch (err: any) {
      console.error('Error generating report:', err);
      console.error('Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        full: err
      });
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err?.message || err?.error_description || 'Unknown error occurred');
      
      toast.error('Failed to generate report', {
        description: errorMessage
      });
    } finally {
      setGenerating(false);
    }
  };
  
  // Get report type icon and color
  const getReportTypeConfig = (type: string) => {
    const configs: Record<string, { icon: any; color: string; bgColor: string; borderColor: string }> = {
      sales: { icon: ShoppingCart, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
      inventory: { icon: Boxes, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
      expenses: { icon: Receipt, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
      loans: { icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
      transfers: { icon: TruckIcon, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
      customers: { icon: Users, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
      financial: { icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
      products: { icon: Package, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
    };
    return configs[type] || { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
  };

  const currentConfig = getReportTypeConfig(reportType);
  const ReportIcon = currentConfig.icon;

  // Get effective location name for display
  const getEffectiveLocationName = () => {
    if (isAdmin) {
      return currentLocation?.name || 'All Locations';
    } else if (userLocationId) {
      const userLocation = locations.find(l => l.location_id.toString() === userLocationId.toString());
      return userLocation?.name || 'Your Location';
    }
    return 'No Location';
  };

  if (authLoading || locationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Sticky Header */}
      <header className="bg-white border-b-2 border-teal-200 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileBarChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                  Report Generator
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {getEffectiveLocationName()}
                  {!isAdmin && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full ml-1">Your Reports</span>}
                </p>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-xl border-2 border-teal-200">
              <ReportIcon className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 ">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* Report Type Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: 'sales', label: 'Sales', icon: ShoppingCart, color: 'teal' },
              { type: 'inventory', label: 'Inventory', icon: Boxes, color: 'emerald' },
              { type: 'expenses', label: 'Expenses', icon: Receipt, color: 'red' },
              { type: 'loans', label: 'Loans', icon: DollarSign, color: 'green' },
              { type: 'transfers', label: 'Transfers', icon: TruckIcon, color: 'teal' },
              { type: 'customers', label: 'Customers', icon: Users, color: 'emerald' },
              { type: 'financial', label: 'Financial', icon: TrendingUp, color: 'green' },
              { type: 'products', label: 'Products', icon: Package, color: 'teal' },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = reportType === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => setReportType(item.type)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-br from-teal-50 to-emerald-100 border-teal-300 shadow-lg scale-105'
                      : 'bg-white border-teal-200 hover:border-teal-300 hover:shadow-md'
                  }`}
                >
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${
                    isSelected ? 'text-teal-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-semibold ${
                    isSelected ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {item.label}
                  </p>
                </button>
              );
            })}
          </div>
          
          {/* Main Form Card */}
          <Card className="border-2 border-teal-100 shadow-xl rounded-2xl">
            <CardHeader className="bg-gradient-to-r from-teal-50/50 via-emerald-50/30 to-green-50/30 border-b-2 border-teal-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 border-2 border-teal-200">
                  <ReportIcon className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Report Configuration</CardTitle>
                  <CardDescription>Configure filters and parameters for your report</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Selected Report Type Display */}
              <div className="p-4 rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ReportIcon className="h-8 w-8 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Selected Report</p>
                      <p className="text-lg font-bold text-gray-900">
                        {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-teal-100 border border-teal-200">
                    <FileText className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 border-2 border-teal-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  <h3 className="font-semibold text-gray-900">Date Range</h3>
                  <span className="text-red-500">*</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-semibold text-gray-700">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                      className="border-2 border-teal-200 h-12 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm font-semibold text-gray-700">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="border-2 border-teal-200 h-12 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Location Display - Read-only for non-admin */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-teal-600" />
                      Location {!isAdmin && <span className="text-xs text-gray-500">(Auto-selected)</span>}
                    </Label>
                    {isAdmin ? (
                      <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Report Location</p>
                            <p className="text-lg font-bold text-gray-900">{getEffectiveLocationName()}</p>
                            <p className="text-xs text-gray-500 mt-1">Change location from sidebar to view different reports</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Your Assigned Location</p>
                            <p className="text-lg font-bold text-gray-900">{getEffectiveLocationName()}</p>
                            <p className="text-xs text-gray-500 mt-1">Reports are limited to your assigned location</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filters Row - Conditional based on Report Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Product Category Filter */}
                    {(reportType === 'sales' || reportType === 'products' || reportType === 'inventory') && (
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Package className="h-4 w-4 text-emerald-600" />
                          Product Category
                        </Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger id="category" className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                All Categories
                              </div>
                            </SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.category_id} value={category.category_id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3 text-emerald-600" />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Expense Category Filter */}
                    {reportType === 'expenses' && (
                      <div className="space-y-2">
                        <Label htmlFor="expenseCategory" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-red-600" />
                          Expense Category
                        </Label>
                        <Select value={selectedExpenseCategory} onValueChange={setSelectedExpenseCategory}>
                          <SelectTrigger id="expenseCategory" className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                            <SelectValue placeholder="All expense categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                All Expense Categories
                              </div>
                            </SelectItem>
                            {expenseCategories.map((category) => (
                              <SelectItem key={category.category_id} value={category.category_id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-3 w-3 text-red-600" />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Staff Filter - Only for admin */}
                    {isAdmin && (reportType === 'sales' || reportType === 'expenses' || reportType === 'transfers') && (
                      <div className="space-y-2">
                        <Label htmlFor="staff" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          Staff Member
                        </Label>
                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                          <SelectTrigger id="staff" className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                            <SelectValue placeholder="All staff" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                All Staff
                              </div>
                            </SelectItem>
                            {staff.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3 text-green-600" />
                                  {member.full_name || member.email || 'Unknown'}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Status Filter */}
                    {(reportType === 'sales' || reportType === 'loans' || reportType === 'expenses') && (
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-emerald-600" />
                          {t('generator.form.fields.status.label')}
                        </Label>
                        <Select value={reportStatus} onValueChange={setReportStatus}>
                          <SelectTrigger id="status" className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                            <SelectValue placeholder={t('generator.form.fields.status.placeholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                {t('generator.form.fields.status.placeholder')}
                              </div>
                            </SelectItem>
                            {reportType === 'sales' && (
                              <>
                                <SelectItem value="Completed">{t('generator.form.fields.status.options.sales.completed')}</SelectItem>
                                <SelectItem value="Pending">{t('generator.form.fields.status.options.sales.pending')}</SelectItem>
                                <SelectItem value="Cancelled">{t('generator.form.fields.status.options.sales.cancelled')}</SelectItem>
                              </>
                            )}
                            {reportType === 'loans' && (
                              <>
                                <SelectItem value="pending">{t('generator.form.fields.status.options.loans.pending')}</SelectItem>
                                <SelectItem value="paid">{t('generator.form.fields.status.options.loans.paid')}</SelectItem>
                              </>
                            )}
                            {reportType === 'expenses' && (
                              <>
                                <SelectItem value="pending">{t('generator.form.fields.status.options.expenses.pending')}</SelectItem>
                                <SelectItem value="approved">{t('generator.form.fields.status.options.expenses.approved')}</SelectItem>
                                <SelectItem value="rejected">{t('generator.form.fields.status.options.expenses.rejected')}</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Non-admin info banner */}
                  {!isAdmin && (reportType === 'sales' || reportType === 'expenses' || reportType === 'transfers') && (
                    <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-teal-900">Personal Reports Only</p>
                          <p className="text-xs text-teal-700 mt-1">
                            This report will only include your own {reportType} records
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            

            <div className="pt-4">
              <Button
                onClick={generatePDFReport}
                disabled={generating || !startDate || !endDate}
                className="w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 hover:from-teal-700 hover:via-emerald-700 hover:to-green-700 text-white h-14 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    {t('generator.actions.generating')}
                  </>
                ) : (
                  <>
                    <Download className="mr-3 h-6 w-6" />
                    {t('generator.actions.generate')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 shadow-lg rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-100 rounded-xl border-2 border-teal-200">
                <AlertCircle className="h-6 w-6 text-teal-600 flex-shrink-0" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg text-gray-900 mb-3">{t('generator.infoCard.title')}</p>
                <ul className="space-y-2 text-sm text-teal-900">
                  {infoCardItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  );
};

export default ReportsModule;