import { createClient } from "@/lib/supabase/server";
import ExpensesManagement from "@/components/expenses/expensesManagement";

export default async function ExpensesPage() {
  const supabase = await createClient();

  try {
    // Fetch expenses data
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (expensesError) throw new Error(`Expenses error: ${expensesError.message}`);

    // Transform expenses data
    const transformedExpenses = expenses?.map(expense => ({
      id: expense.expense_id.toString(),
      type: expense.expense_type,
      amount: expense.amount,
      date: expense.expense_date,
      description: expense.description || "No description"
    })) || [];

    return (
      <main className="container mx-auto p-6 space-y-4">
        <ExpensesManagement
          expenses={transformedExpenses}
        />
      </main>
    );

  } catch (error) {
    console.error("Error loading expenses:", error);
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Expenses</h2>
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

