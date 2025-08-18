import { createClient } from "@/lib/supabase/server";
import SalesManagement from "@/components/sales/salesManagement";

export default async function SalesPage() {
  const supabase = await createClient();

  try {
    // Fetch sales data with related information
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(`
        sale_id,
        sale_date,
        total_amount,
        warehouse_id,
        store_id,
        staff_id,
        warehouses (name, location),
        stores (name, location),
        staff (first_name, last_name, role)
      `)
      .order("sale_date", { ascending: false });

    if (salesError) throw new Error(`Sales error: ${salesError.message}`);

    // Fetch sale items for detailed view
    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select(`
        sale_item_id,
        sale_id,
        product_id,
        quantity,
        unit_price,
        products (name, sku)
      `);

    if (itemsError) throw new Error(`Sale items error: ${itemsError.message}`);

    // Fetch products for new sale creation
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        product_id,
        name,
        sku,
        base_price,
        categories (name)
      `)
      .order("name");

    if (productsError) throw new Error(`Products error: ${productsError.message}`);

    // Fetch staff for assignment
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("staff_id, first_name, last_name, role")
      .order("first_name");

    if (staffError) throw new Error(`Staff error: ${staffError.message}`);

    // Fetch warehouses and stores
    const [warehousesResult, storesResult] = await Promise.all([
      supabase.from("warehouses").select("warehouse_id, name, location").order("name"),
      supabase.from("stores").select("store_id, name, location").order("name")
    ]);

    if (warehousesResult.error) throw new Error(`Warehouses error: ${warehousesResult.error.message}`);
    if (storesResult.error) throw new Error(`Stores error: ${storesResult.error.message}`);

    // Transform sales data
    const transformedSales = sales?.map(sale => ({
      id: sale.sale_id.toString(),
      date: sale.sale_date,
      totalAmount: sale.total_amount,
      warehouse: sale.warehouses?.name || "Unknown",
      store: sale.stores?.name || "N/A",
      staff: sale.staff ? `${sale.staff.first_name} ${sale.staff.last_name}` : "Unknown",
      staffRole: sale.staff?.role || "Unknown"
    })) || [];

    // Transform products data
    const transformedProducts = products?.map(product => ({
      id: product.product_id.toString(),
      name: product.name,
      sku: product.sku || "N/A",
      price: product.base_price,
      category: product.categories?.name || "Uncategorized"
    })) || [];

    // Transform staff data
    const transformedStaff = staff?.map(member => ({
      id: member.staff_id.toString(),
      name: `${member.first_name} ${member.last_name}`,
      role: member.role
    })) || [];

    // Transform warehouses and stores
    const transformedWarehouses = warehousesResult.data?.map(warehouse => ({
      id: warehouse.warehouse_id.toString(),
      name: warehouse.name,
      location: warehouse.location || "N/A"
    })) || [];

    const transformedStores = storesResult.data?.map(store => ({
      id: store.store_id.toString(),
      name: store.name,
      location: store.location || "N/A"
    })) || [];

    return (
      <main className="container mx-auto p-6 space-y-4">
        <SalesManagement
          sales={transformedSales}
          products={transformedProducts}
          staff={transformedStaff}
          warehouses={transformedWarehouses}
          stores={transformedStores}
          saleItems={saleItems || []}
        />
      </main>
    );

  } catch (error) {
    console.error("Error loading sales:", error);
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Sales</h2>
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

