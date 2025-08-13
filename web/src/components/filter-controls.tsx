"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Calendar as CalendarIcon, X } from "lucide-react";
import {
  format,
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateFilter } from "@/components/date-filter";

type LocationOption = string;

interface FilterControlsProps {
  selectedLocation?: LocationOption;
  rawDateFrom?: string;
  rawDateTo?: string;
  locations: readonly LocationOption[];
}

const DATE_PRESETS = [
  {
    label: "Today",
    getValue: () => ({
      from: format(new Date(), "yyyy-MM-dd"),
      to: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Tomorrow",
    getValue: () => ({
      from: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      to: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Next 7 days",
    getValue: () => ({
      from: format(new Date(), "yyyy-MM-dd"),
      to: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    }),
  },
  {
    label: "This week",
    getValue: () => ({
      from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    }),
  },
  {
    label: "This month",
    getValue: () => ({
      from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      to: format(new Date(), "yyyy-MM-dd"),
    }),
  },
] as const;

/**
 * Enhanced filter controls component with location dropdown and date presets
 * Provides improved UX for filtering shifts by location and date range
 *
 * @example
 * ```tsx
 * <FilterControls
 *   selectedLocation={selectedLocation}
 *   rawDateFrom={rawDateFrom}
 *   rawDateTo={rawDateTo}
 *   locations={LOCATIONS}
 * />
 * ```
 */
export function FilterControls({
  selectedLocation,
  rawDateFrom,
  rawDateTo,
  locations,
}: FilterControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to create filter URLs
  const createFilterUrl = (
    location?: LocationOption | null,
    newDateFrom?: string,
    newDateTo?: string
  ) => {
    const params = new URLSearchParams(searchParams);

    // Handle location
    if (location !== undefined) {
      if (location) {
        params.set("location", location);
      } else {
        params.delete("location");
      }
    }

    // Handle date from
    if (newDateFrom !== undefined) {
      if (newDateFrom) {
        params.set("dateFrom", newDateFrom);
      } else {
        params.delete("dateFrom");
      }
    }

    // Handle date to
    if (newDateTo !== undefined) {
      if (newDateTo) {
        params.set("dateTo", newDateTo);
      } else {
        params.delete("dateTo");
      }
    }

    return `/admin/shifts?${params.toString()}`;
  };

  const handleLocationChange = (value: string) => {
    const newLocation = value === "all" ? null : (value as LocationOption);
    const url = createFilterUrl(newLocation, rawDateFrom, rawDateTo);
    router.push(url);
  };

  const handleDatePresetClick = (preset: (typeof DATE_PRESETS)[number]) => {
    const { from, to } = preset.getValue();
    const url = createFilterUrl(selectedLocation, from, to);
    router.push(url);
  };

  const clearLocationFilter = () => {
    const url = createFilterUrl(null, rawDateFrom, rawDateTo);
    router.push(url);
  };

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Location</label>
          <Select
            value={selectedLocation || "all"}
            onValueChange={handleLocationChange}
          >
            <SelectTrigger className="w-full" data-testid="location-filter">
              <SelectValue placeholder="Select location..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  All Locations
                </div>
              </SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Date Range
          </label>
          <DateFilter rawDateFrom={rawDateFrom} rawDateTo={rawDateTo} />
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Quick Filters
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handleDatePresetClick(preset)}
              className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
            >
              <CalendarIcon className="h-3 w-3 mr-1.5" />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Filters Summary - Only show if there are active filters */}
      {(selectedLocation || rawDateFrom || rawDateTo) && (
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-700">
                Active:
              </span>
              {selectedLocation && (
                <Badge variant="secondary" className="gap-1">
                  📍 {selectedLocation}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearLocationFilter}
                    className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground ml-1"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
              {rawDateFrom && (
                <Badge variant="secondary" className="gap-1">
                  📅 From: {format(new Date(rawDateFrom), "MMM d")}
                </Badge>
              )}
              {rawDateTo && (
                <Badge variant="secondary" className="gap-1">
                  📅 To: {format(new Date(rawDateTo), "MMM d")}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const url = "/admin/shifts";
                router.push(url);
              }}
              className="text-slate-500 hover:text-slate-700 text-xs"
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
