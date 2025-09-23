import React from 'react';
import { Package, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InventoryReportProps {
  inventoryReport: any[];
  inventoryTransfers: any[];
}

export const InventoryReport: React.FC<InventoryReportProps> = ({ inventoryReport, inventoryTransfers }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Status Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventoryReport.map((item, index) => (
              <div key={`${item.product_id}-${item.location_id}`} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    item.status === 'Out of Stock' ? 'bg-destructive' :
                    item.status === 'Low Stock' ? 'bg-yellow-500' : 'bg-primary'
                  }`} />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">SKU: {item.sku} • {item.location_name}</div>
                    <Badge variant={
                      item.status === 'Out of Stock' ? 'destructive' :
                      item.status === 'Low Stock' ? 'secondary' : 'default'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-8 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{item.quantity}</div>
                    <div className="text-muted-foreground">Total Stock</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{item.reserved_quantity}</div>
                    <div className="text-muted-foreground">Reserved</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{item.available_quantity}</div>
                    <div className="text-muted-foreground">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{item.reorder_point}</div>
                    <div className="text-muted-foreground">Reorder Point</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Recent Inventory Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventoryTransfers.map((transfer, index) => (
              <div key={transfer.transfer_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <div>
                    <div className="font-medium">{transfer.product_name}</div>
                    <div className="text-sm text-muted-foreground">{transfer.created_at}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">From</div>
                    <div className="font-medium">{transfer.from_location_name}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">To</div>
                    <div className="font-medium">{transfer.to_location_name}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Quantity</div>
                    <div className="font-medium">{transfer.quantity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};