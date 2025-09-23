import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface CustomerReportProps {
  customerSegments: any[];
}

export const CustomerReport: React.FC<CustomerReportProps> = ({ customerSegments }) => {
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
            <Users className="h-5 w-5" />
            Customer Segmentation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerSegments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({segment, percentage}) => `${segment}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {customerSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              {customerSegments.map((segment, index) => (
                <div key={segment.segment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{segment.segment}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{segment.count} customers</div>
                    <div className="text-sm text-muted-foreground">
                      ${segment.revenue.toLocaleString()} • Avg: ${segment.avgOrderValue}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};