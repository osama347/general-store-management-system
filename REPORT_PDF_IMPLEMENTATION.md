# PDF Report Generation Implementation Guide

## Overview
This document outlines the implementation for generating PDF reports from the reports page. The frontend has been redesigned to be a filter-based report generator.

## Current Implementation

### Frontend (✅ Completed)
- **Location**: `src/app/[locale]/(main)/reports/page.tsx`
- **Features**:
  - Clean filter-based UI
  - 8 report types based on database schema
  - Dynamic filters based on report type
  - Date range selection (required)
  - Location, category, staff, and status filters
  - Single "Generate PDF Report" button
  - **✅ Full Supabase data fetching implemented** for all report types
  - Proper error handling and loading states
  - Data validation before PDF generation

### Report Types
Based on the database schema (`db.txt`):

1. **Sales Report** (`reportType: 'sales'`)
   - Tables: `sales`, `sale_items`, `customers`, `profiles`, `products`
   - Filters: Location, Staff, Status, Date Range
   
2. **Inventory Report** (`reportType: 'inventory'`)
   - Tables: `inventory`, `products`, `locations`, `categories`
   - Filters: Location, Category, Date Range
   
3. **Expenses Report** (`reportType: 'expenses'`)
   - Tables: `expenses`, `expense_categories`, `locations`, `profiles`
   - Filters: Location, Expense Category, Staff, Status, Date Range
   
4. **Loans Report** (`reportType: 'loans'`)
   - Tables: `loans`, `customers`, `locations`
   - Filters: Location, Status, Date Range
   
5. **Inventory Transfers Report** (`reportType: 'transfers'`)
   - Tables: `inventory_transfers`, `products`, `locations` (from/to), `profiles`
   - Filters: Location, Staff, Date Range
   
6. **Customers Report** (`reportType: 'customers'`)
   - Tables: `customers`, `locations`, `sales`
   - Filters: Location, Date Range
   
7. **Financial Summary Report** (`reportType: 'financial'`)
   - Tables: `sales`, `expenses`, `loans`
   - Filters: Location, Date Range
   
8. **Product Performance Report** (`reportType: 'products'`)
   - Tables: `products`, `categories`, `sale_items`, `inventory`
   - Filters: Location, Category, Date Range

## Data Fetching (✅ Completed)

The frontend now fetches complete data from Supabase with proper joins and filters:

### Sales Report
- Fetches: `sales` with `customers`, `profiles`, `locations`, `sale_items` (with `products`)
- Filters: Date range, location, staff, status
- Ordered by: `sale_date` descending

### Inventory Report
- Fetches: `inventory` with `products` (with `categories`), `locations`
- Filters: Date range, location, product category
- Ordered by: `updated_at` descending

### Expenses Report
- Fetches: `expenses` with `expense_categories`, `locations`, `profiles`
- Filters: Date range, location, expense category, staff, status
- Ordered by: `expense_date` descending

### Loans Report
- Fetches: `loans` with `customers`, `locations`
- Filters: Date range, location, status
- Ordered by: `loan_date` descending

### Transfers Report
- Fetches: `inventory_transfers` with `products`, `from_location`, `to_location`, `profiles`
- Filters: Date range, location (from OR to), staff
- Ordered by: `created_at` descending

### Customers Report
- Fetches: `customers` with `locations`, `sales`, `loans`
- Filters: Date range, location
- Ordered by: `created_at` descending

### Financial Summary Report
- Fetches: 
  - Completed `sales`
  - Approved `expenses` with categories
  - All `loans`
- Filters: Date range, location
- Returns: Object with `sales`, `expenses`, `loans` arrays

### Product Performance Report
- Fetches: `products` with `categories`, `sale_items`, `inventory` (with `locations`)
- Filters: Product category
- Ordered by: `name` ascending

## Backend Implementation (TODO)

### Option 1: Supabase Edge Function (Recommended)

#### Create Edge Function
```bash
cd supabase/functions
supabase functions new generate-report
```

#### Implementation Steps

1. **Install Dependencies** (`supabase/functions/generate-report/index.ts`):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1"

serve(async (req) => {
  try {
    const { filters } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch data based on report type
    const data = await fetchReportData(supabase, filters)
    
    // Generate PDF
    const pdfBytes = await generatePDF(data, filters)
    
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${filters.reportType}-${Date.now()}.pdf"`
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

2. **Data Fetching Functions**:
```typescript
async function fetchReportData(supabase, filters) {
  const { reportType, startDate, endDate, location, category, staff, status } = filters
  
  let query;
  
  switch (reportType) {
    case 'sales':
      query = supabase
        .from('sales')
        .select(`
          *,
          customers(*),
          profiles(*),
          sale_items(*, products(*))
        `)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
      
      if (location !== 'all') query = query.eq('location_id', location)
      if (staff !== 'all') query = query.eq('profile_id', staff)
      if (status !== 'all') query = query.eq('status', status)
      break
      
    case 'inventory':
      query = supabase
        .from('inventory')
        .select(`
          *,
          products(*, categories(*)),
          locations(*)
        `)
        .gte('updated_at', startDate)
        .lte('updated_at', endDate)
      
      if (location !== 'all') query = query.eq('location_id', location)
      if (category !== 'all') query = query.eq('products.category_id', category)
      break
      
    case 'expenses':
      query = supabase
        .from('expenses')
        .select(`
          *,
          expense_categories(*),
          locations(*),
          profiles(*)
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
      
      if (location !== 'all') query = query.eq('location_id', location)
      if (category !== 'all') query = query.eq('category_id', category)
      if (staff !== 'all') query = query.eq('profile_id', staff)
      if (status !== 'all') query = query.eq('status', status)
      break
      
    case 'loans':
      query = supabase
        .from('loans')
        .select(`
          *,
          customers(*),
          locations(*)
        `)
        .gte('loan_date', startDate)
        .lte('loan_date', endDate)
      
      if (location !== 'all') query = query.eq('location_id', location)
      if (status !== 'all') query = query.eq('status', status)
      break
      
    case 'transfers':
      query = supabase
        .from('inventory_transfers')
        .select(`
          *,
          products(*),
          from_location:locations!from_location_id(*),
          to_location:locations!to_location_id(*),
          profiles(*)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
      
      if (location !== 'all') {
        query = query.or(`from_location_id.eq.${location},to_location_id.eq.${location}`)
      }
      if (staff !== 'all') query = query.eq('created_by_profile_id', staff)
      break
      
    case 'customers':
      query = supabase
        .from('customers')
        .select(`
          *,
          locations(*),
          sales(*)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
      
      if (location !== 'all') query = query.eq('location_id', location)
      break
      
    case 'financial':
      // Fetch multiple datasets
      const [salesRes, expensesRes, loansRes] = await Promise.all([
        supabase.from('sales').select('*').gte('sale_date', startDate).lte('sale_date', endDate),
        supabase.from('expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate),
        supabase.from('loans').select('*').gte('loan_date', startDate).lte('loan_date', endDate)
      ])
      
      return {
        sales: salesRes.data,
        expenses: expensesRes.data,
        loans: loansRes.data
      }
      
    case 'products':
      query = supabase
        .from('products')
        .select(`
          *,
          categories(*),
          sale_items(*),
          inventory(*)
        `)
      
      if (category !== 'all') query = query.eq('category_id', category)
      break
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}
```

3. **PDF Generation Function**:
```typescript
async function generatePDF(data, filters) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size
  const { width, height } = page.getSize()
  
  // Title
  page.drawText(`${filters.reportType.toUpperCase()} REPORT`, {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0, 0, 0)
  })
  
  // Date range
  page.drawText(`Period: ${filters.startDate} to ${filters.endDate}`, {
    x: 50,
    y: height - 80,
    size: 12,
    color: rgb(0.3, 0.3, 0.3)
  })
  
  // Data table
  let yPosition = height - 120
  const lineHeight = 20
  
  // Add headers and data based on report type
  // ... (implement table rendering logic)
  
  return await pdfDoc.save()
}
```

4. **Deploy Edge Function**:
```bash
supabase functions deploy generate-report
```

5. **Update Frontend** (`src/app/[locale]/(main)/reports/page.tsx`):
```typescript
const generatePDFReport = async () => {
  if (!startDate || !endDate) {
    toast.error('Please select both start and end dates');
    return;
  }
  
  setGenerating(true);
  try {
    const filters = {
      reportType,
      startDate,
      endDate,
      location: selectedLocation !== 'all' ? selectedLocation : null,
      category: selectedCategory !== 'all' ? selectedCategory : null,
      expenseCategory: selectedExpenseCategory !== 'all' ? selectedExpenseCategory : null,
      staff: selectedStaff !== 'all' ? selectedStaff : null,
      status: reportStatus !== 'all' ? reportStatus : null,
      profileId: profile?.id
    };
    
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: { filters }
    });
    
    if (error) throw error;
    
    // Download PDF
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${reportType}-${Date.now()}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Report generated and downloaded successfully!');
  } catch (err) {
    console.error('Error generating report:', err);
    toast.error('Failed to generate report');
  } finally {
    setGenerating(false);
  }
};
```

### Option 2: Next.js API Route

Create `src/app/api/generate-report/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { filters } = await request.json();
    const supabase = createClient();
    
    // Fetch data
    const data = await fetchReportData(supabase, filters);
    
    // Generate PDF
    const pdfBuffer = await generatePDF(data, filters);
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${filters.reportType}-${Date.now()}.pdf"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Libraries for PDF Generation

### For Deno (Supabase Edge Functions):
- `pdf-lib`: https://esm.sh/pdf-lib
- `jsPDF`: https://esm.sh/jspdf

### For Node.js (Next.js API Routes):
- `pdfkit`: https://www.npmjs.com/package/pdfkit
- `pdf-lib`: https://www.npmjs.com/package/pdf-lib
- `@react-pdf/renderer`: https://www.npmjs.com/package/@react-pdf/renderer

## Testing

### Data Fetching (Currently Working)
1. Open the reports page
2. Select a report type
3. Choose date range and filters
4. Click "Generate PDF Report"
5. Check browser console for:
   - `Report data fetched:` (shows the actual data from Supabase)
   - `Report filters:` (shows applied filters)
6. Success toast will show the number of records found

### PDF Generation (After Implementation)
1. Test each report type individually
2. Verify all filters work correctly
3. Test with large datasets (pagination may be needed)
4. Verify PDF formatting and layout
5. Test download functionality
6. Verify proper error handling for edge cases

## Security Considerations

- Verify user has permission to access the requested data
- Implement rate limiting for report generation
- Validate all input filters
- Use service role key only in backend
- Log report generation for audit trail

## Next Steps

1. Choose implementation approach (Edge Function recommended)
2. Install required dependencies
3. Implement data fetching for each report type
4. Design PDF templates for each report
5. Test thoroughly
6. Deploy to production
