// ReportsService.ts temporary file
import { createClient } from '@/lib/supabase/client';
import type {
  ReportFilters,
  Location,
  Category,
  ExpenseCategory,
  Sale,
  Customer,
  Expense,
  Inventory,
  InventoryTransfer,
  FinancialSummary,
  SalesSummary
} from '@/types/reports';

const supabase = createClient();

export const ReportsService = {
  // Fetch inventory data
  fetchInventoryData: async (filters:any) => {
    try {
      // First get the inventory data
      let query = supabase
        .from('inventory')
        .select('inventory_id, product_id, location_id, quantity, reserved_quantity');

      if (filters.location && filters.location !== 'all') {
        query = query.eq('location_id', filters.location);
      }

      const { data: inventoryData, error: inventoryError } = await query;

      if (inventoryError) {
        console.error('Error fetching inventory data:', inventoryError);
        throw inventoryError;
      }

      if (!inventoryData?.length) {
        return [];
      }

      // Get unique IDs
      const productIds = [...new Set(inventoryData.map(item => item.product_id))];
      const locationIds = [...new Set(inventoryData.map(item => item.location_id))];

      // Fetch product and location data in parallel
      const [productsResult, locationsResult] = await Promise.all([
        supabase
          .from('products')
          .select('product_id, name, sku, base_price')
          .in('product_id', productIds),
        supabase
          .from('locations')
          .select('location_id, name')
          .in('location_id', locationIds)
      ]);

      if (productsResult.error) {
        console.error('Error fetching product data:', productsResult.error);
        throw productsResult.error;
      }

      if (locationsResult.error) {
        console.error('Error fetching location data:', locationsResult.error);
        throw locationsResult.error;
      }

      // Create lookup maps
      const products = new Map(
        productsResult.data.map(p => [p.product_id, p])
      );
      const locations = new Map(
        locationsResult.data.map(l => [l.location_id, l])
      );

      // Process and combine the data
      return inventoryData
        .map(item => {
          const product = products.get(item.product_id);
          const location = locations.get(item.location_id);

          if (!product || !location) {
            console.warn('Missing data for inventory item:', 
              {item_id: item.inventory_id, product_id: item.product_id, location_id: item.location_id});
            return null;
          }

          const available = (item.quantity || 0) - (item.reserved_quantity || 0);
          let status = 'In Stock';
          
          if (available <= 0) {
            status = 'Out of Stock';
          } else if (available <= 10) {
            status = 'Low Stock';
          }

          return {
            product_id: item.product_id,
            location_id: item.location_id,
            name: product.name,
            sku: product.sku,
            quantity: item.quantity || 0,
            reserved_quantity: item.reserved_quantity || 0,
            available_quantity: available,
            reorder_point: 10,
            status,
            location_name: location.name
          };
        })
        .filter(item => item !== null);
    } catch (error) {
      console.error('Error in fetchInventoryData:', error);
      throw error;
    }
  },
};
