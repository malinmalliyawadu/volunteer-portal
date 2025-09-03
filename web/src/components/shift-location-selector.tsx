"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShiftLocationSelectorProps {
  selectedLocation: string;
  dateString: string;
  locations: readonly string[];
}

export function ShiftLocationSelector({
  selectedLocation,
  dateString,
  locations,
}: ShiftLocationSelectorProps) {
  const router = useRouter();

  const handleLocationChange = (value: string) => {
    router.push(`/admin/shifts?date=${dateString}&location=${value}`);
  };

  return (
    <div className="flex items-center gap-3">
      <MapPin className="h-4 w-4 text-slate-500" />
      <Select value={selectedLocation} onValueChange={handleLocationChange}>
        <SelectTrigger className="w-[180px]" data-testid="location-selector">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location} value={location}>
              {location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}