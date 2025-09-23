"use client"

import * as React from "react"
import { addDays, format, isBefore, isEqual } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface RangeCalendarProps {
  className?: string
  date?: DateRange
  onDateChange: (date: DateRange | undefined) => void
  align?: "start" | "center" | "end"
}

export function RangeCalendar({
  className,
  date,
  onDateChange,
  align = "start",
}: RangeCalendarProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Helper function to check if a date range is valid (start is before or equal to end)
  const isValidRange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return true
    return isBefore(range.from, range.to) || isEqual(range.from, range.to)
  }

  // Predefined ranges
  const predefinedRanges = {
    "Today": {
      from: new Date(),
      to: new Date(),
    },
    "Yesterday": {
      from: addDays(new Date(), -1),
      to: addDays(new Date(), -1),
    },
    "Last 7 Days": {
      from: addDays(new Date(), -7),
      to: new Date(),
    },
    "Last 30 Days": {
      from: addDays(new Date(), -30),
      to: new Date(),
    },
    "This Month": {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    },
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="space-y-4 p-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(predefinedRanges).map(([label, range]) => (
                <Button
                  key={label}
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    onDateChange(range)
                    setIsOpen(false)
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(selectedRange) => {
                if (isValidRange(selectedRange)) {
                  onDateChange(selectedRange)
                  if (selectedRange?.from && selectedRange?.to) {
                    setIsOpen(false)
                  }
                }
              }}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
