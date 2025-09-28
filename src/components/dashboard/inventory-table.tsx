'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Building, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TableSkeleton } from './skeletons'
import { validateInventoryItem, ValidatedInventoryItem } from '@/lib/data-validation'

interface InventoryTableProps {
  userRole: string
  locationFilter: string | null
  dashboardType: string
}

async function fetchInventoryData(userRole: string, locationFilter: string | null, dashboardType: string): Promise<ValidatedInventoryItem[]> {
  const supabase = createClient()
  const showWarehouseData = dashboardType === 'warehouse' || userRole === 'warehouse_manager'

  let query = supabase
    .from('inventory')
    .select(`
      quantity,
      reserved_quantity,
      products(name, sku, base_price),
      locations!inner(name, location_type)
    `)
    .lt('quantity', 10)

  if (locationFilter) {
    query = query.eq('location_id', locationFilter)
  }

  if (showWarehouseData) {
    query = query.eq('locations.location_type', 'warehouse')
  } else {
    query = query.eq('locations.location_type', 'store')
  }

  const { data, error } = await query.order('quantity', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch inventory: ${error.message}`)
  }

  // Validate and transform the data
  return (data || [])
    .map(validateInventoryItem)
    .filter((item): item is ValidatedInventoryItem => item !== null)
}

export function InventoryTable({ userRole, locationFilter, dashboardType }: InventoryTableProps) {
  const { data: inventory, isLoading, error } = useQuery({
    queryKey: ['inventory', userRole, locationFilter, dashboardType],
    queryFn: () => fetchInventoryData(userRole, locationFilter, dashboardType),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  if (isLoading) {
    return <TableSkeleton rows={6} columns={6} />
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-sm text-muted-foreground">Failed to load inventory data</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Reserved</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inventory && inventory.length > 0 ? (
          inventory.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.product.name}</TableCell>
              <TableCell>{item.product.sku}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {item.location.location_type === 'warehouse' ? (
                    <Building className="h-4 w-4 mr-1 text-blue-500" />
                  ) : (
                    <Truck className="h-4 w-4 mr-1 text-green-500" />
                  )}
                  {item.location.name}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.quantity < 5 ? "destructive" : "secondary"}>
                  {item.quantity}
                </Badge>
              </TableCell>
              <TableCell>{item.reserved_quantity}</TableCell>
              <TableCell>${(item.quantity * item.product.base_price).toFixed(2)}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4">
              No low stock items found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}