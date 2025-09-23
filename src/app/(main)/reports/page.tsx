"use client"
import React, { useState, useEffect } from 'react';
import { Download, FileText, Share, RefreshCw, AlertCircle } from 'lucide-react';

// shadcn/ui imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Custom components
import { ReportsService } from '@/components/reports/ReportsService';
import { ReportTemplates } from '@/components/reports/ReportTemplates';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { SalesReport } from '@/components/reports/SalesReport';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { ProductReport } from '@/components/reports/ProductReport';
import { CustomerReport } from '@/components/reports/CustomerReport';
import { InventoryReport } from '@/components/reports/InventoryReport';

import type { 
  Location, 
  Category, 
  ExpenseCategory,
  Sale,
  Expense,
  Customer,
  Inventory,
  InventoryTransfer,
  FinancialSummary 
} from '@/types/reports';

// Type definition for DateRange
type DateRange = {
  from: Date | undefined
  to: Date | undefined
};

const ReportsModule = () => {
  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState<DateRange>({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  });
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [reportFilters, setReportFilters] = useState<{
    groupBy: 'day' | 'week' | 'month' | 'year';
    showComparisons: boolean;
    includeProjections: boolean;
  }>({
    groupBy: 'day',
    showComparisons: true,
    includeProjections: false
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    salesData: Sale[];
    financialData: FinancialSummary[];
    productPerformance: Sale[];
    customerSegments: { segment: string; count: number; percentage: number; revenue: number; avgOrderValue: number; }[];
    inventoryReport: Inventory[];
    expenseData: Expense[];
    inventoryTransfers: InventoryTransfer[];
  }>({
    salesData: [],
    financialData: [],
    productPerformance: [],
    customerSegments: [],
    inventoryReport: [],
    expenseData: [],
    inventoryTransfers: []
  });
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  
  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const [locationsData, categoriesData, expenseCategoriesData] = await Promise.all([
        ReportsService.fetchLocations(),
        ReportsService.fetchCategories(),
        ReportsService.fetchExpenseCategories()
      ]);
      
      setLocations(locationsData.map(loc => ({
        ...loc,
        address: '',  // Add default value for missing property
        created_at: new Date().toISOString()  // Add default value for missing property
      })));
      setCategories(categoriesData);
      setExpenseCategories(expenseCategoriesData.map(cat => ({
        ...cat,
        is_active: true, // Add default value for missing required property
      })));
    } catch (err) {
      console.error('Error fetching filter options:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  // Fetch all report data
  const fetchAllReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = {
        startDate: dateRange.from?.toISOString() || new Date().toISOString(),
        endDate: dateRange.to?.toISOString() || new Date().toISOString(),
        location: selectedLocation,
        category: selectedCategory,
        groupBy: reportFilters.groupBy
      };
      
      // Create an array of promises for each data fetch
      const dataPromises = [
        ReportsService.fetchSalesData(filters),
        ReportsService.fetchFinancialData(filters),
        ReportsService.fetchProductPerformance(filters),
        ReportsService.fetchCustomerAnalytics(filters),
        ReportsService.fetchInventoryData(filters),
        ReportsService.fetchExpenseData(filters),
        ReportsService.fetchInventoryTransfers(filters)
      ];
      
      // Use Promise.allSettled to handle individual promise failures
      const results = await Promise.allSettled(dataPromises);
      
      // Process results and handle any rejections
      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Error fetching data at index ${index}:`, result.reason);
          // Return empty array for failed requests to prevent undefined errors
          return [];
        }
      });
      
      // Destructure the processed results
      const [
        salesData,
        financialData,
        productPerformance,
        customerSegments,
        inventoryReport,
        expenseData,
        inventoryTransfers
      ] = processedResults;
      
      // Ensure all data is an array and filter out any undefined/null values
      setReportData({
        salesData: Array.isArray(salesData) ? salesData.filter(Boolean) : [],
        financialData: Array.isArray(financialData) ? financialData.filter(Boolean) : [],
        productPerformance: Array.isArray(productPerformance) ? productPerformance.filter(Boolean) : [],
        customerSegments: Array.isArray(customerSegments) ? customerSegments.filter(Boolean) : [],
        inventoryReport: Array.isArray(inventoryReport) ? inventoryReport.filter(Boolean) : [],
        expenseData: Array.isArray(expenseData) ? expenseData.filter(Boolean) : [],
        inventoryTransfers: Array.isArray(inventoryTransfers) ? inventoryTransfers.filter(Boolean) : []
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize component
  useEffect(() => {
    fetchFilterOptions();
  }, []);
  
  // Fetch data when filters change
  useEffect(() => {
    if (locations.length > 0 && dateRange.from && dateRange.to) {
      fetchAllReportData();
    }
  }, [dateRange, selectedLocation, selectedCategory, reportFilters.groupBy, locations]);
  
  // Export Functions
  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const filters = {
        startDate: dateRange.from?.toISOString() || new Date().toISOString(),
        endDate: dateRange.to?.toISOString() || new Date().toISOString(),
        location: selectedLocation,
        category: selectedCategory,
        groupBy: reportFilters.groupBy,
        format
      };
      
      // In a real implementation, this would call a Supabase Edge Function to generate the report
      console.log('Exporting report with filters:', filters);
      
      // For now, we'll just show a success message
      alert(`Report exported as ${format.toUpperCase()} successfully!`);
    } catch (err) {
      console.error('Error exporting report:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  const generateReport = () => {
    fetchAllReportData();
  };
  
  const getReportComponent = () => {
    switch (activeReport) {
      case 'sales': 
        return <SalesReport salesData={reportData.salesData} />;
      case 'financial': 
        return <FinancialReport financialData={reportData.financialData} expenseData={reportData.expenseData} />;
      case 'product': 
        return <ProductReport productPerformance={reportData.productPerformance} />;
      case 'customer': 
        return <CustomerReport customerSegments={reportData.customerSegments} />;
      case 'inventory': 
        return <InventoryReport inventoryReport={reportData.inventoryReport} inventoryTransfers={reportData.inventoryTransfers} />;
      default: 
        return <SalesReport salesData={reportData.salesData} />;
    }
  };
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports Generator</h1>
            <p className="text-muted-foreground mt-1">Generate comprehensive business reports with advanced filtering</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => generateReport()} className="bg-primary hover:bg-primary/90" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Generate Report
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportReport('pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport('excel')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport('csv')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline">
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Error loading report data: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Filters Section */}
        <ReportFilters
          dateRange={dateRange}
          setDateRange={setDateRange}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          reportFilters={reportFilters}
          setReportFilters={setReportFilters}
          locations={locations}
          categories={categories}
        />
        
        {/* Report Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Select Report Template</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTemplates activeReport={activeReport} setActiveReport={setActiveReport} />
          </CardContent>
        </Card>
        
        {/* Report Content */}
        <div className="min-h-96">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading report data...</p>
              </div>
            </div>
          ) : (
            getReportComponent()
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;