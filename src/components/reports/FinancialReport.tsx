import React from 'react';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialReportProps {
  financialData: any[];
  expenseData: any[];
}

export const FinancialReport: React.FC<FinancialReportProps> = ({ financialData, expenseData }) => {
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
            <DollarSign className="h-5 w-5" />
            Financial Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis tickFormatter={(value) => `$${value/1000}k`} className="text-muted-foreground" />
                <Tooltip 
                  formatter={(value) => [`$${value.toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
                <Area type="monotone" dataKey="profit" stackId="3" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseData.map((expense, index) => (
                <div key={expense.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm">{expense.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${expense.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{expense.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Loans & Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis tickFormatter={(value) => `$${value/1000}k`} className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Loans']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="loans" 
                    stroke="hsl(var(--chart-5))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-5))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};