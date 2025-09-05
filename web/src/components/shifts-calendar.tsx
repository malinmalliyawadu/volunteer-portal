"use client";

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarList } from "@/components/ui/avatar-list";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  MapPin,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftSummary {
  id: string;
  start: Date;
  end: Date;
  location: string | null;
  capacity: number;
  confirmedCount: number;
  pendingCount: number;
  shiftType: {
    name: string;
    description: string | null;
  };
  friendSignups?: Array<{
    user: {
      id: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string;
      profilePhotoUrl: string | null;
    };
  }>;
}

interface ShiftsCalendarProps {
  shifts: ShiftSummary[];
  selectedLocation?: string;
}

interface DayShifts {
  date: Date;
  shifts: ShiftSummary[];
  totalCapacity: number;
  totalConfirmed: number;
  totalPending: number;
  spotsAvailable: number;
  allFriendSignups: Array<{
    user: {
      id: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string;
      profilePhotoUrl: string | null;
    };
  }>;
}

export function ShiftsCalendar({
  shifts,
  selectedLocation,
}: ShiftsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Create a proper calendar grid that starts with Sunday and includes padding days
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group shifts by restaurant location
  const shiftsByLocation = shifts.reduce((acc, shift) => {
    const location = shift.location || "TBD";
    if (!acc[location]) acc[location] = [];
    acc[location].push(shift);
    return acc;
  }, {} as Record<string, ShiftSummary[]>);

  const locations = Object.keys(shiftsByLocation).sort();

  // Group shifts by date for each location
  const getLocationDayShifts = (location: string): DayShifts[] => {
    const locationShifts = shiftsByLocation[location] || [];

    return calendarDays.map((date) => {
      const dayShifts = locationShifts.filter((shift) =>
        isSameDay(shift.start, date)
      );

      const totalCapacity = dayShifts.reduce((sum, s) => sum + s.capacity, 0);
      const totalConfirmed = dayShifts.reduce(
        (sum, s) => sum + s.confirmedCount,
        0
      );
      const totalPending = dayShifts.reduce(
        (sum, s) => sum + s.pendingCount,
        0
      );
      const spotsAvailable = Math.max(
        0,
        totalCapacity - totalConfirmed - totalPending
      );

      // Collect all friend signups for this day
      const allFriendSignups = dayShifts.reduce((acc, shift) => {
        if (shift.friendSignups) {
          acc.push(...shift.friendSignups);
        }
        return acc;
      }, [] as typeof dayShifts[0]['friendSignups']);

      return {
        date,
        shifts: dayShifts,
        totalCapacity,
        totalConfirmed,
        totalPending,
        spotsAvailable,
        allFriendSignups: allFriendSignups || [],
      };
    });
  };

  const getDayStatus = (dayShifts: DayShifts) => {
    if (dayShifts.shifts.length === 0) return "none";
    if (dayShifts.spotsAvailable === 0) return "full";
    if (dayShifts.spotsAvailable <= 2) return "limited";
    return "available";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700";
      case "limited":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700";
      case "full":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700";
      default:
        return "bg-gray-50 dark:bg-gray-900/30 text-gray-400 dark:text-gray-600";
    }
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  // Show only selected location if filter is applied
  const displayLocations = selectedLocation
    ? locations.filter((loc) => loc === selectedLocation)
    : locations;

  // Check if any display locations have shifts in the current month
  const hasAnyShiftsInMonth = displayLocations.some((location) => {
    const locationDayShifts = getLocationDayShifts(location);
    return locationDayShifts.some((day) => day.shifts.length > 0);
  });

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Click on any date to view and sign up for shifts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
            disabled={format(currentMonth, "yyyy-MM") <= format(new Date(), "yyyy-MM")}
            data-testid="calendar-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            data-testid="calendar-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Available spots</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Limited spots</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Waitlist only</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span>No shifts</span>
        </div>
      </div>

      {/* Calendars by Restaurant */}
      <div className="space-y-8">
        {displayLocations.map((location) => {
          const locationDayShifts = getLocationDayShifts(location);
          const hasAnyShifts = locationDayShifts.some(
            (day) => day.shifts.length > 0
          );

          if (!hasAnyShifts) return null;

          return (
            <Card
              key={location}
              className="overflow-hidden py-0"
              data-testid={`calendar-${location
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {/* Only show location header when displaying multiple locations */}
              {!selectedLocation && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-6 py-4 border-b">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-semibold">{location}</h3>
                  </div>
                </div>
              )}

              <CardContent className="p-6">
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {locationDayShifts.map((dayShifts, index) => {
                    const status = getDayStatus(dayShifts);
                    const isCurrentMonth = isSameMonth(
                      dayShifts.date,
                      currentMonth
                    );
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dayStart = new Date(dayShifts.date);
                    dayStart.setHours(0, 0, 0, 0);
                    const isPastDate = dayStart < today;
                    const isToday = isSameDay(dayShifts.date, today);

                    const dayContent = (
                      <div
                        className={cn(
                          "relative aspect-square rounded-lg border-2 transition-all duration-200 group",
                          isCurrentMonth
                            ? isPastDate
                              ? "border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 opacity-50"
                              : isToday
                              ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-300 dark:border-blue-700 shadow-md ring-2 ring-blue-200/40 dark:ring-blue-800/40"
                              : status === "none"
                              ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
                              : `border-transparent ${getStatusColor(
                                  status
                                )} hover:shadow-md hover:scale-105 cursor-pointer`
                            : "border-gray-100 dark:border-gray-800 bg-gray-25 dark:bg-gray-950/50 opacity-40",
                          dayShifts.shifts.length > 0 &&
                            isCurrentMonth &&
                            !isPastDate &&
                            "hover:border-primary"
                        )}
                        data-testid={`calendar-day-${format(
                          dayShifts.date,
                          "yyyy-MM-dd"
                        )}`}
                      >
                        {/* Date number */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                          <span
                            className={cn(
                              "text-sm font-medium w-6 h-6 rounded-full flex items-center justify-center",
                              !isCurrentMonth && "text-muted-foreground/50",
                              isPastDate &&
                                isCurrentMonth &&
                                "text-muted-foreground",
                              isToday &&
                                isCurrentMonth &&
                                "text-white bg-blue-500 shadow-md font-bold"
                            )}
                          >
                            {format(dayShifts.date, "d")}
                          </span>
                          {isToday && (
                            <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                              Today
                            </div>
                          )}
                        </div>

                        {/* Shift indicators */}
                        {dayShifts.shifts.length > 0 &&
                          isCurrentMonth &&
                          !isPastDate && (
                            <div className="absolute inset-2 flex flex-col justify-center">
                              {/* Center - availability info */}
                              <div className="text-center space-y-2">
                                {status === "full" ? (
                                  <div className="text-xs font-semibold text-orange-500">
                                    WAITLIST
                                  </div>
                                ) : status === "limited" ? (
                                  <div className="text-xs font-semibold text-yellow-500">
                                    {dayShifts.spotsAvailable} LEFT
                                  </div>
                                ) : (
                                  <div className="text-xs font-semibold text-green-500">
                                    {dayShifts.spotsAvailable} available
                                  </div>
                                )}
                                
                                {/* Friend avatars */}
                                {dayShifts.allFriendSignups.length > 0 && (
                                  <div className="flex justify-center">
                                    <AvatarList
                                      users={dayShifts.allFriendSignups.map(signup => signup.user)}
                                      size="sm"
                                      maxDisplay={3}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    );

                    return (
                      <div key={index}>
                        {dayShifts.shifts.length > 0 &&
                        isCurrentMonth &&
                        !isPastDate ? (
                          <Link
                            href={`/shifts/details?date=${format(
                              dayShifts.date,
                              "yyyy-MM-dd"
                            )}&location=${encodeURIComponent(location)}`}
                            className="block"
                          >
                            {dayContent}
                          </Link>
                        ) : (
                          dayContent
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!hasAnyShiftsInMonth && (
        <Card>
          <CardContent className="py-12 text-center" data-testid="empty-state">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="empty-state-title">No shifts scheduled</h3>
            <p className="text-muted-foreground mb-4" data-testid="empty-state-description">
              {selectedLocation
                ? `No shifts found for ${selectedLocation} in ${format(currentMonth, "MMMM yyyy")}.`
                : `No shifts are currently scheduled for ${format(currentMonth, "MMMM yyyy")}.`}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(currentMonth, "yyyy-MM") > format(new Date(), "yyyy-MM")
                ? "Shifts are usually published closer to the date."
                : format(currentMonth, "yyyy-MM") < format(new Date(), "yyyy-MM")
                ? "This month has passed. Try viewing current or future months."
                : "Check back soon for upcoming shifts, or try a different location."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
