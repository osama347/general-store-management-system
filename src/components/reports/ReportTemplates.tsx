import React from 'react';
import { BarChart3, DollarSign, Package, Users, TrendingUp } from 'lucide-react';

interface ReportTemplatesProps {
  activeReport: string;
  setActiveReport: (report: string) => void;
}

const reportTemplates = [
  { id: 'sales', name: 'Sales Performance', icon: BarChart3, description: 'Sales analytics and trends' },
  { id: 'financial', name: 'Financial Summary', icon: DollarSign, description: 'Revenue, expenses, and profit' },
  { id: 'inventory', name: 'Inventory Status', icon: Package, description: 'Stock levels and transfers' },
  { id: 'customer', name: 'Customer Analytics', icon: Users, description: 'Customer segmentation' },
  { id: 'product', name: 'Product Performance', icon: TrendingUp, description: 'Product sales and metrics' }
];

export const ReportTemplates: React.FC<ReportTemplatesProps> = ({ activeReport, setActiveReport }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {reportTemplates.map((template) => {
        const IconComponent = template.icon;
        return (
          <button
            key={template.id}
            onClick={() => setActiveReport(template.id)}
            className={`p-4 border rounded-lg text-left transition-all hover:shadow-md ${
              activeReport === template.id 
                ? 'border-primary bg-primary/5 shadow-md' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <IconComponent className={`h-8 w-8 mb-3 ${
              activeReport === template.id ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <h3 className="font-medium text-sm mb-1">{template.name}</h3>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </button>
        );
      })}
    </div>
  );
};