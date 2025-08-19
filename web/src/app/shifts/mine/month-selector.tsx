"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface MonthSelectorProps {
  currentMonth: Date;
  viewMonth: Date;
}

export function MonthSelector({ currentMonth, viewMonth }: MonthSelectorProps) {
  const router = useRouter();
  
  // Generate month options (6 months back and 12 months forward)
  const monthOptions = [];
  const startMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 6, 1);
  
  for (let i = 0; i < 18; i++) {
    const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    monthOptions.push({
      value: monthDate.getTime().toString(),
      label: format(monthDate, "MMMM yyyy"),
      date: monthDate
    });
  }
  
  const handleMonthChange = (value: string) => {
    if (value === currentMonth.getTime().toString()) {
      // Navigate to current month (no query params)
      router.push("/shifts/mine");
    } else {
      // Navigate to selected month
      router.push(`/shifts/mine?month=${value}`);
    }
  };
  
  return (
    <Select 
      value={viewMonth.getTime().toString()}
      onValueChange={handleMonthChange}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {monthOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
            {option.date.getMonth() === currentMonth.getMonth() && 
             option.date.getFullYear() === currentMonth.getFullYear() && 
             " (Current)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}