import { createClient } from "@/lib/supabase/server";
// import StaffManagement from "@/components/staff/staffManagement";

export default async function StaffPage() {
  const supabase = await createClient();

  try {
    // Fetch staff data
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .order("hire_date", { ascending: false });

    if (staffError) throw new Error(`Staff error: ${staffError.message}`);

    // Fetch sales data for staff performance
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(`
        sale_id,
        total_amount,
        staff_id,
        sale_date
      `);

    if (salesError) throw new Error(`Sales error: ${salesError.message}`);

    // Transform staff data
    const transformedStaff = staff?.map(member => {
      const memberSales = sales?.filter(sale => sale.staff_id === member.staff_id) || []
      const totalSales = memberSales.length
      const totalRevenue = memberSales.reduce((sum, sale) => sum + sale.total_amount, 0)
      const lastSale = memberSales.length > 0 ? Math.max(...memberSales.map(s => new Date(s.sale_date).getTime())) : null

      return {
        id: member.staff_id.toString(),
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email || "N/A",
        phone: member.phone || "N/A",
        role: member.role,
        hireDate: member.hire_date,
        totalSales,
        totalRevenue,
        lastSale: lastSale ? new Date(lastSale).toISOString() : null
      }
    }) || [];

    return (
      // <main className="container mx-auto p-6 space-y-4">
      //   <StaffManagement
      //     staff={transformedStaff}
      //   />
      // </main>
      <>
      
      </>
    );

  } catch (error) {
    console.error("Error loading staff:", error);
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Staff</h2>
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

