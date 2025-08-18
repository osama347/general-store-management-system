import { createClient } from "@/lib/supabase/server";
import StoresManagement from "@/components/stores/storesManagement";

export default async function StoresPage() {
  const supabase = await createClient();

  try {
    // Fetch stores data
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("*")
      .order("name");

    if (storesError) throw new Error(`Stores error: ${storesError.message}`);

    // Fetch store inventory for store details
    const { data: storeInventory, error: inventoryError } = await supabase
      .from("store_inventory")
      .select(`
        product_id,
        store_id,
        quantity,
        products (name, sku)
      `);

    if (inventoryError) throw new Error(`Store inventory error: ${inventoryError.message}`);

    // Transform stores data
    const transformedStores = stores?.map(store => {
      const storeItems = storeInventory?.filter(item => item.store_id === store.store_id) || []
      const totalProducts = storeItems.length
      const totalQuantity = storeItems.reduce((sum, item) => sum + item.quantity, 0)

      return {
        id: store.store_id.toString(),
        name: store.name,
        location: store.location || "N/A",
        totalProducts,
        totalQuantity,
        inventory: storeItems.map(item => ({
          productId: item.product_id.toString(),
          productName: item.products?.[0]?.name || "Unknown Product",
          sku: item.products?.[0]?.sku || "N/A",
          quantity: item.quantity
        }))
      }
    }) || [];

    return (
      <main className="container mx-auto p-6 space-y-4">
        <StoresManagement
          stores={transformedStores}
        />
      </main>
    );

  } catch (error) {
    console.error("Error loading stores:", error);
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Stores</h2>
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
