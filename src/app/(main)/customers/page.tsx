import { createClient } from "@/lib/supabase/server";
import CustomersManagement from "@/components/customers/customersManagement";

export default async function CustomersPage() {
  const supabase = await createClient();

  try {
    // Fetch customers data
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (customersError) throw new Error(`Customers error: ${customersError.message}`);

    // Fetch loans data for customer details
    const { data: loans, error: loansError } = await supabase
      .from("loans")
      .select(`
        loan_id,
        loan_amount,
        loan_date,
        due_date,
        status,
        customer_id
      `);

    if (loansError) throw new Error(`Loans error: ${loansError.message}`);

    // Transform customers data
    const transformedCustomers = customers?.map(customer => ({
      id: customer.customer_id.toString(),
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email || "N/A",
      phone: customer.phone || "N/A",
      address: customer.address || "N/A",
      createdAt: customer.created_at,
      loans: loans?.filter(loan => loan.customer_id === customer.customer_id) || []
    })) || [];

    return (
      <main className="container mx-auto p-6 space-y-4">
        <CustomersManagement
          customers={transformedCustomers}
        />
      </main>
    );

  } catch (error) {
    console.error("Error loading customers:", error);
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Customers</h2>
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

