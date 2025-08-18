import { createClient } from "@/lib/supabase/server";
import LoansManagement from "@/components/loans/loansManagement";

export default async function LoansPage() {
  const supabase = await createClient();

  try {
    // Fetch loans data with customer information
    const { data: loans, error: loansError } = await supabase
      .from("loans")
      .select(`
        loan_id,
        loan_amount,
        loan_date,
        due_date,
        status,
        customer_id,
        customers (first_name, last_name, email)
      `)
      .order("loan_date", { ascending: false });

    if (loansError) throw new Error(`Loans error: ${loansError.message}`);

    // Transform loans data
    const transformedLoans = loans?.map(loan => ({
      id: loan.loan_id.toString(),
      amount: loan.loan_amount,
      loanDate: loan.loan_date,
      dueDate: loan.due_date,
      status: loan.status,
      customerId: loan.customer_id?.toString() || "N/A",
      customerName: loan.customers ? `${loan.customers.first_name} ${loan.customers.last_name}` : "Unknown Customer",
      customerEmail: loan.customers?.email || "N/A"
    })) || [];

    return (
      <main className="container mx-auto p-6 space-y-4">
        <LoansManagement
          loans={transformedLoans}
        />
      </main>
    );

  } catch (error) {
    console.error("Error loading loans:", error);
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Loans</h2>
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

