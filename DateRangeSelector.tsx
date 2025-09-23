// src/components/reports/DateRangeSelector.tsx
"use client";

import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const handleSelectStartDate = (date: Date | undefined) => {
    if (!date) {
      onChange({ ...value, from: undefined });
      setOpenStart(false);
      return;
    }

    // If end date is set and new start date is after end date, adjust end date
    if (value.to && date > value.to) {
      onChange({ from: date, to: date });
    } else {
      onChange({ ...value, from: date });
    }
    setOpenStart(false);
  };

  const handleSelectEndDate = (date: Date | undefined) => {
    if (!date) {
      onChange({ ...value, to: undefined });
      setOpenEnd(false);
      return;
    }

    // If start date is set and new end date is before start date, adjust start date
    if (value.from && date < value.from) {
      onChange({ from: date, to: date });
    } else {
      onChange({ ...value, to: date });
    }
    setOpenEnd(false);
  };

  const clearDates = () => {
    onChange({ from: undefined, to: undefined });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <label className="text-sm font-medium mb-1 block">Start Date</label>
        <Popover open={openStart} onOpenChange={setOpenStart}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.from ? format(value.from, "PPP") : "Select start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.from}
              onSelect={handleSelectStartDate}
              disabled={(date) => (value.to ? date > value.to : false)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1">
        <label className="text-sm font-medium mb-1 block">End Date</label>
        <Popover open={openEnd} onOpenChange={setOpenEnd}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.to ? format(value.to, "PPP") : "Select end date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.to}
              onSelect={handleSelectEndDate}
              disabled={(date) => (value.from ? date < value.from : false)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-end">
        <Button
          variant="outline"
          size="icon"
          onClick={clearDates}
          className="mt-1"
          disabled={!value.from && !value.to}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// For the ReportsModule, we'll update the ReportFilters component to use our new DateRangeSelector
// We'll create a wrapper component for the date range filter

export function DateRangeFilter({
  dateRange,
  setDateRange,
}: {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Date Range</CardTitle>
      </CardHeader>
      <CardContent>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </CardContent>
    </Card>
  );
}