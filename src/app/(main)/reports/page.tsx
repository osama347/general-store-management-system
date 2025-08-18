import { createClient } from "@/lib/supabase/server";
import ReportsDashboard from "@/components/reports/reportsDashboard";

export default async function ReportsPage() {
  const supabase = await createClient();

  try {
    // Fetch data for reports
    const [salesResult, productsResult, customersResult, expensesResult] = await Promise.all([
      supabase.from("sales").select("sale_date, total_amount, staff_id").order("sale_date", { ascending: false }),
      supabase.from("products").select("product_id, name, base_price, category_id").order("name"),
      supabase.from("customers").select("customer_id, created_at").order("created_at", { ascending: false }),
      supabase.from("expenses").select("expense_date, amount, expense_type").order("expense_date", { ascending: false })
    ]);

    if (salesResult.error) throw new Error(`Sales error: ${salesResult.error.message}`);
    if (productsResult.error) throw new Error(`Products error: ${productsResult.error.message}`);
    if (customersResult.error) throw new Error(`Customers error: ${customersResult.error.message}`);
    if (expensesResult.error) throw new Error(`Expenses error: ${expensesResult.error.message}`);

    // Transform data for reports
    const salesData = salesResult.data || []
    const productsData = productsResult.data || []
    const customersData = customersResult.error ? [] : customersResult.data || []
    const expensesData = expensesResult.data || []

    return (
      <main className="container mx-auto p-6 space-y-4">
        <ReportsDashboard
          salesData={salesData}
          productsData={productsData}
          customersData={customersData}
          expensesData={expensesData}
        />
      </main>
    );

  } catch (error) {
    console.error("Error loading reports data:", error);
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Reports</h2>
        <p>Please try again later or check your connection.</p>
        <details className="mt-4 text-sm">
          <summary>Technical Details</summary>
          <pre className="bg-white p-2 rounded mt-2">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </pre>
        </details>
      </div>
    );
  }
}

