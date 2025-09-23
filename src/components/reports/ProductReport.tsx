import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductReportProps {
  productPerformance: any[];
}

export const ProductReport: React.FC<ProductReportProps> = ({ productPerformance }) => {
  // Primary color palette
  const COLORS = [
    'hsl(var(--primary))', 
    'hsl(var(--destructive))', 
    'hsl(var(--chart-3))', 
    'hsl(var(--chart-4))', 
    'hsl(var(--chart-5))', 
    'hsl(var(--chart-2))'
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Product Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productPerformance.map((product, index) => (
              <div key={product.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <div className="font-medium">{product.product}</div>
                    <div className="text-sm text-muted-foreground">{product.category} • SKU: {product.sku}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-8 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{product.unitsSold}</div>
                    <div className="text-muted-foreground">Units Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">${product.revenue.toLocaleString()}</div>
                    <div className="text-muted-foreground">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">${product.profit.toLocaleString()}</div>
                    <div className="text-muted-foreground">Profit</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{product.stock}</div>
                    <div className="text-muted-foreground">In Stock</div>
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