import { prisma } from "@/lib/prisma";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageContainer } from "@/components/page-container";
import { AdminPageWrapper } from "@/components/admin-page-wrapper";
import { ShiftLocationSelector } from "@/components/shift-location-selector";
import { ShiftCalendarWrapper } from "@/components/shift-calendar-wrapper";
import { AnimatedShiftCardsWrapper } from "@/components/animated-shift-cards-wrapper";
import { FlexiblePlacementManager } from "@/components/flexible-placement-manager";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;
type LocationOption = (typeof LOCATIONS)[number];

interface AdminShiftsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminShiftsPage({
  searchParams,
}: AdminShiftsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  // Parse search parameters
  const dateString =
    (params.date as string) || format(new Date(), "yyyy-MM-dd");
  const selectedLocation = (params.location as LocationOption) || "Wellington";
  const selectedDate = parseISO(dateString);
  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = dateString === today;


  // Fetch shifts for the selected date and location
  const shifts = await prisma.shift.findMany({
    where: {
      location: selectedLocation,
      start: {
        gte: startOfDay(selectedDate),
        lte: endOfDay(selectedDate),
      },
    },
    include: {
      shiftType: true,
      signups: {
        where: {
          status: {
            in: ["CONFIRMED", "PENDING", "WAITLISTED", "REGULAR_PENDING"],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              volunteerGrade: true,
              profilePhotoUrl: true,
            },
          },
        },
      },
      groupBookings: {
        include: {
          signups: {
            where: {
              status: {
                in: ["CONFIRMED", "PENDING", "WAITLISTED", "REGULAR_PENDING"],
              },
            },
          },
        },
      },
      _count: {
        select: {
          signups: {
            where: {
              status: "CONFIRMED",
            },
          },
        },
      },
    },
    orderBy: {
      start: "asc",
    },
  });

  // Get shift data for the calendar with location, capacity, and confirmed counts
  const calendarShifts = await prisma.shift.findMany({
    where: {
      start: {
        gte: new Date(),
      },
    },
    select: {
      start: true,
      location: true,
      capacity: true,
      signups: {
        where: {
          status: "CONFIRMED",
        },
        select: {
          id: true,
        },
      },
    },
  });

  // Process shifts into calendar-friendly format
  const shiftSummariesMap = new Map<string, {
    count: number;
    totalCapacity: number;
    totalConfirmed: number;
    locations: string[];
  }>();

  calendarShifts.forEach((shift) => {
    const dateKey = format(shift.start, "yyyy-MM-dd");
    const location = shift.location || "Unknown";
    
    if (!shiftSummariesMap.has(dateKey)) {
      shiftSummariesMap.set(dateKey, {
        count: 0,
        totalCapacity: 0,
        totalConfirmed: 0,
        locations: [],
      });
    }

    const summary = shiftSummariesMap.get(dateKey)!;
    summary.count++;
    summary.totalCapacity += shift.capacity;
    summary.totalConfirmed += shift.signups.length;
    
    if (!summary.locations.includes(location)) {
      summary.locations.push(location);
    }
  });

  const processedShiftSummaries = Array.from(shiftSummariesMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));

  return (
    <AdminPageWrapper
      title="Restaurant Schedule"
      actions={
        <Button asChild size="sm" data-testid="create-shift-button">
          <Link href="/admin/shifts/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Shift
          </Link>
        </Button>
      }
    >
      <PageContainer>
        {/* Success Messages */}
        {params.created && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription
              data-testid="shift-created-message"
              className="text-green-800"
            >
              Shift created successfully!
            </AlertDescription>
          </Alert>
        )}
        {params.updated && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription
              data-testid="shift-updated-message"
              className="text-blue-800"
            >
              Shift updated successfully!
            </AlertDescription>
          </Alert>
        )}
        {params.deleted && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription
              data-testid="shift-deleted-message"
              className="text-red-800"
            >
              Shift deleted successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation Controls */}
        <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Section: Date Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <ShiftCalendarWrapper
                    selectedDate={selectedDate}
                    selectedLocation={selectedLocation}
                    shiftSummaries={processedShiftSummaries}
                  />
                </div>

                <div className="hidden sm:block h-8 w-px bg-slate-200" />

                {/* Location Selector */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <ShiftLocationSelector
                    selectedLocation={selectedLocation}
                    dateString={dateString}
                    locations={LOCATIONS}
                  />
                </div>
              </div>

              {/* Right Section: Quick Actions */}
              <div className="flex items-center gap-3">
                <Button
                  asChild
                  variant={isToday ? "default" : "outline"}
                  size="sm"
                  className="h-10"
                  data-testid="today-button"
                >
                  <Link
                    href={`/admin/shifts?date=${today}&location=${selectedLocation}`}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Today
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Shifts Display */}
        {shifts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No shifts scheduled
            </h3>
            <p className="text-slate-600 mb-6">
              Get started by creating your first shift for{" "}
              {format(selectedDate, "EEEE, MMMM d, yyyy")} in {selectedLocation}
              .
            </p>
            <Button asChild size="sm" className="btn-primary">
              <Link href="/admin/shifts/new">
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Shift
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Flexible Placement Manager - shows above regular shifts */}
            <FlexiblePlacementManager 
              selectedDate={dateString}
              selectedLocation={selectedLocation}
            />
            
            <AnimatedShiftCardsWrapper 
              shifts={shifts}
              dateString={dateString}
              selectedLocation={selectedLocation}
            />
          </>
        )}
      </PageContainer>
    </AdminPageWrapper>
  );
}
