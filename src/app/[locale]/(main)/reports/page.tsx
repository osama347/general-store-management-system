"use client"
import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Loader2, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
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
  const { profile } = useAuth();
  
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
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const t = useTranslations('reports');
  
  // Fetch filter options
  const fetchFilterOptions = async () => {
    setLoading(true);
    try {
      const [locationsRes, categoriesRes, expenseCategoriesRes, staffRes] = await Promise.all([
        supabase.from('locations').select('location_id, name, location_type'),
        supabase.from('categories').select('category_id, name'),
        supabase.from('expense_categories').select('category_id, name').eq('is_active', true),
        supabase.from('profiles').select('id, full_name, email').eq('is_active', true)
      ]);
      
      if (locationsRes.data) setLocations(locationsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (expenseCategoriesRes.data) setExpenseCategories(expenseCategoriesRes.data);
      if (staffRes.data) setStaff(staffRes.data);
    } catch (err) {
      console.error('Error fetching filter options:', err);
      toast.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch report data from Supabase
  const fetchReportData = async () => {
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59`;
    
    console.log('Fetching report data for:', {
      reportType,
      startDateTime,
      endDateTime,
      selectedLocation,
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
          
          if (selectedLocation !== 'all') salesQuery = salesQuery.eq('location_id', selectedLocation);
          if (selectedStaff !== 'all') salesQuery = salesQuery.eq('profile_id', selectedStaff);
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
          
          if (selectedLocation !== 'all') inventoryQuery = inventoryQuery.eq('location_id', selectedLocation);
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
          
          if (selectedLocation !== 'all') expensesQuery = expensesQuery.eq('location_id', selectedLocation);
          if (selectedExpenseCategory !== 'all') expensesQuery = expensesQuery.eq('category_id', selectedExpenseCategory);
          if (selectedStaff !== 'all') expensesQuery = expensesQuery.eq('profile_id', selectedStaff);
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
          
          if (selectedLocation !== 'all') loansQuery = loansQuery.eq('location_id', selectedLocation);
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
          
          if (selectedLocation !== 'all') {
            transfersQuery = transfersQuery.or(`from_location_id.eq.${selectedLocation},to_location_id.eq.${selectedLocation}`);
          }
          if (selectedStaff !== 'all') transfersQuery = transfersQuery.eq('created_by_profile_id', selectedStaff);
          
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
          
          if (selectedLocation !== 'all') customersQuery = customersQuery.eq('location_id', selectedLocation);
          
          const { data: customersData, error: customersError } = await customersQuery;
          if (customersError) throw customersError;
          data = customersData;
          break;
        }
          
        case 'financial': {
          // Fetch multiple datasets for financial summary
          const [salesRes, expensesRes, loansRes] = await Promise.all([
            supabase
              .from('sales')
              .select('sale_id, sale_date, total_amount, status, location_id')
              .gte('sale_date', startDateTime)
              .lte('sale_date', endDateTime)
              .eq('status', 'Completed'),
            supabase
              .from('expenses')
              .select('expense_id, expense_date, amount, status, location_id, expense_categories(name)')
              .gte('expense_date', startDateTime)
              .lte('expense_date', endDateTime)
              .eq('status', 'approved'),
            supabase
              .from('loans')
              .select('loan_id, loan_date, loan_amount, status, location_id')
              .gte('loan_date', startDateTime)
              .lte('loan_date', endDateTime)
          ]);
          
          if (salesRes.error) throw salesRes.error;
          if (expensesRes.error) throw expensesRes.error;
          if (loansRes.error) throw loansRes.error;
          
          // Filter by location if needed
          const filterByLocation = (items: any[]) => {
            if (selectedLocation === 'all') return items;
            return items.filter(item => item.location_id?.toString() === selectedLocation);
          };
          
          data = {
            sales: filterByLocation(salesRes.data || []),
            expenses: filterByLocation(expensesRes.data || []),
            loans: filterByLocation(loansRes.data || [])
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
    
    console.log('Starting PDF generation for:', reportType);
    setGenerating(true);
    
    try {
      // Fetch data from Supabase
      console.log('Calling fetchReportData...');
      const reportData = await fetchReportData();
      console.log('fetchReportData completed:', reportData ? 'Data received' : 'No data');
      
      if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
        toast.error('No data found for the selected filters');
        setGenerating(false);
        return;
      }
      
      // Prepare filters for PDF generation
      const filters = {
        reportType,
        startDate,
        endDate,
        location: selectedLocation !== 'all' ? (locations.find(l => l.location_id.toString() === selectedLocation)?.name || 'Unknown Location') : 'All Locations',
        category: selectedCategory !== 'all' ? (categories.find(c => c.category_id.toString() === selectedCategory)?.name || 'Unknown Category') : 'All Categories',
        expenseCategory: selectedExpenseCategory !== 'all' ? (expenseCategories.find(c => c.category_id.toString() === selectedExpenseCategory)?.name || 'Unknown Category') : 'All Categories',
        staff: selectedStaff !== 'all' ? (staff.find(s => s.id === selectedStaff)?.full_name || staff.find(s => s.id === selectedStaff)?.email || 'Unknown Staff') : 'All Staff',
        status: reportStatus !== 'all' ? reportStatus : 'All Statuses',
        generatedBy: profile?.full_name || profile?.email || 'Unknown',
        generatedAt: new Date().toLocaleString()
      };
      
      // Generate and download PDF
      try {
        const pdfGenerator = new PDFGenerator();
        pdfGenerator.download(reportType, reportData, filters);
        
        const dataCount = Array.isArray(reportData) 
          ? reportData.length 
          : Object.values(reportData).flat().length;
        
        toast.success(`PDF report generated successfully!`, {
          description: `Report contains ${dataCount} records and has been downloaded.`
        });
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        throw new Error('Failed to generate PDF: ' + (pdfError instanceof Error ? pdfError.message : 'Unknown error'));
      }
      
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
  
  // Initialize component
  useEffect(() => {
    fetchFilterOptions();
  }, []);
  
  const infoCardItems = [
    t('generator.infoCard.items.0'),
    t('generator.infoCard.items.1'),
    t('generator.infoCard.items.2'),
    t('generator.infoCard.items.3')
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{t('generator.page.title')}</h1>
          <p className="text-gray-600">{t('generator.page.description')}</p>
        </div>

        <Card className="border-gray-200">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-xl">{t('generator.form.card.title')}</CardTitle>
            <CardDescription>{t('generator.form.card.description')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reportType" className="text-sm font-medium">
                {t('generator.form.fields.reportType.label')}
              </Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="reportType">
                  <SelectValue placeholder={t('generator.form.fields.reportType.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{t('generator.form.fields.reportType.options.sales')}</SelectItem>
                  <SelectItem value="inventory">{t('generator.form.fields.reportType.options.inventory')}</SelectItem>
                  <SelectItem value="expenses">{t('generator.form.fields.reportType.options.expenses')}</SelectItem>
                  <SelectItem value="loans">{t('generator.form.fields.reportType.options.loans')}</SelectItem>
                  <SelectItem value="transfers">{t('generator.form.fields.reportType.options.transfers')}</SelectItem>
                  <SelectItem value="customers">{t('generator.form.fields.reportType.options.customers')}</SelectItem>
                  <SelectItem value="financial">{t('generator.form.fields.reportType.options.financial')}</SelectItem>
                  <SelectItem value="products">{t('generator.form.fields.reportType.options.products')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">{t('generator.form.fields.reportType.helpText')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-medium">
                  {t('generator.form.fields.startDate.label')}
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium">
                  {t('generator.form.fields.endDate.label')}
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                {t('generator.form.fields.location.label')}
              </Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="location">
                  <SelectValue placeholder={t('generator.form.fields.location.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('generator.form.fields.location.placeholder')}</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.location_id.toString()} value={location.location_id.toString()}>
                      {location.name} ({location.location_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(reportType === 'sales' || reportType === 'products' || reportType === 'inventory') && (
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  {t('generator.form.fields.category.label')}
                </Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={t('generator.form.fields.category.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('generator.form.fields.category.placeholder')}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.category_id} value={category.category_id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === 'expenses' && (
              <div className="space-y-2">
                <Label htmlFor="expenseCategory" className="text-sm font-medium">
                  {t('generator.form.fields.expenseCategory.label')}
                </Label>
                <Select value={selectedExpenseCategory} onValueChange={setSelectedExpenseCategory}>
                  <SelectTrigger id="expenseCategory">
                    <SelectValue placeholder={t('generator.form.fields.expenseCategory.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('generator.form.fields.expenseCategory.placeholder')}</SelectItem>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.category_id} value={category.category_id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(reportType === 'sales' || reportType === 'expenses' || reportType === 'transfers') && (
              <div className="space-y-2">
                <Label htmlFor="staff" className="text-sm font-medium">
                  {t('generator.form.fields.staff.label')}
                </Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger id="staff">
                    <SelectValue placeholder={t('generator.form.fields.staff.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('generator.form.fields.staff.placeholder')}</SelectItem>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(reportType === 'sales' || reportType === 'loans' || reportType === 'expenses') && (
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  {t('generator.form.fields.status.label')}
                </Label>
                <Select value={reportStatus} onValueChange={setReportStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t('generator.form.fields.status.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('generator.form.fields.status.placeholder')}</SelectItem>
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

            <div className="pt-4">
              <Button
                onClick={generatePDFReport}
                disabled={generating || !startDate || !endDate}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12 text-base font-medium"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('generator.actions.generating')}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    {t('generator.actions.generate')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 space-y-1">
                <p className="font-medium">{t('generator.infoCard.title')}</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 ml-2">
                  {infoCardItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsModule;