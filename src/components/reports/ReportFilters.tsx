import React from 'react';
import { Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import type { DateRange } from "react-day-picker";
import { RangeCalendar } from "@/components/reports/RangeCalendar";



import type { Location, Category } from '@/types/reports';

interface ReportFiltersProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  reportFilters: {
    groupBy: 'day' | 'week' | 'month' | 'year';
    showComparisons: boolean;
    includeProjections: boolean;
  };
  locations: Location[];
  categories: Category[];
  setReportFilters: (filters: any) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  dateRange,
  setDateRange,
  selectedLocation,
  setSelectedLocation,
  selectedCategory,
  setSelectedCategory,
  reportFilters,
  setReportFilters,
  locations,
  categories
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Report Filters & Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <RangeCalendar
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full"
            />
          </div>

          
          
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.location_id} value={location.location_id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.category_id} value={category.category_id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Group By</Label>
            <Select value={reportFilters.groupBy} onValueChange={(value) => 
              setReportFilters({...reportFilters, groupBy: value})
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="comparisons" 
              checked={reportFilters.showComparisons}
              onCheckedChange={(checked) => 
                setReportFilters({...reportFilters, showComparisons: checked})
              }
            />
            <Label htmlFor="comparisons">Show Period Comparisons</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="projections" 
              checked={reportFilters.includeProjections}
              onCheckedChange={(checked) => 
                setReportFilters({...reportFilters, includeProjections: checked})
              }
            />
            <Label htmlFor="projections">Include Projections</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};