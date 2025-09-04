import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin } from "lucide-react";
import { PageContainer } from "@/components/page-container";
import { safeParseAvailability } from "@/lib/parse-availability";
import { ShiftsCalendar } from "@/components/shifts-calendar";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;
type LocationOption = (typeof LOCATIONS)[number];

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
}


export default async function ShiftsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // Get current user 
  let currentUser = null;
  if (session?.user?.email) {
    currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, availableLocations: true },
    });
  }

  // Parse user's preferred locations
  const userPreferredLocations = safeParseAvailability(
    currentUser?.availableLocations
  );

  // Handle location filtering
  const rawLocation = Array.isArray(params.location)
    ? params.location[0]
    : params.location;
  const selectedLocation: LocationOption | undefined = LOCATIONS.includes(
    (rawLocation as LocationOption) ?? ("" as LocationOption)
  )
    ? (rawLocation as LocationOption)
    : undefined;

  const showAll = params.showAll === "true";

  // Determine filter locations
  let filterLocations: string[] = [];
  let isUsingProfileFilter = false;

  if (selectedLocation) {
    filterLocations = [selectedLocation];
  } else if (showAll) {
    filterLocations = [];
  } else if (userPreferredLocations.length > 0) {
    filterLocations = userPreferredLocations.filter((loc: string) =>
      LOCATIONS.includes(loc as LocationOption)
    );
    isUsingProfileFilter = true;
  }

  // Fetch shifts for calendar view - simplified data structure
  const shifts = await prisma.shift.findMany({
    where: {
      start: { gte: new Date() },
      ...(filterLocations.length > 0
        ? { location: { in: filterLocations } }
        : {}),
    },
    orderBy: { start: "asc" },
    include: {
      shiftType: {
        select: {
          name: true,
          description: true,
        },
      },
      _count: {
        select: {
          signups: {
            where: {
              status: {
                in: ["CONFIRMED", "PENDING"],
              },
            },
          },
        },
      },
    },
  });

  // Transform to ShiftSummary format for calendar
  const shiftSummaries: ShiftSummary[] = shifts.map((shift) => ({
    id: shift.id,
    start: shift.start,
    end: shift.end,
    location: shift.location,
    capacity: shift.capacity,
    confirmedCount: shift._count.signups, // This includes both CONFIRMED and PENDING
    pendingCount: 0, // For calendar view, we simplify this
    shiftType: {
      name: shift.shiftType.name,
      description: shift.shiftType.description,
    },
  }));

  return (
    <PageContainer testid="shifts-browse-page">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <PageHeader
          title="Volunteer Shifts"
          description={`Find and sign up for upcoming volunteer opportunities${
            selectedLocation
              ? ` in ${selectedLocation}`
              : isUsingProfileFilter
              ? ` in your preferred locations`
              : ""
          }. Click on any date to see details and sign up.`}
          className="flex-1"
          data-testid="shifts-page-header"
        />

        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          {/* Location filter */}
          <div className="flex flex-col gap-3" data-testid="location-filter">
            <span className="text-sm font-medium text-muted-foreground">
              Filter by location:
            </span>
            <Tabs
              value={
                selectedLocation ||
                (isUsingProfileFilter ? "preferences" : "all")
              }
              className="w-fit"
              data-testid="location-tabs"
            >
              <TabsList
                className="flex-wrap h-auto"
                data-testid="location-tabs-list"
              >
                {userPreferredLocations.length > 0 && (
                  <TabsTrigger
                    value="preferences"
                    asChild
                    data-testid="location-tab-preferences"
                  >
                    <Link href="/shifts">My Locations</Link>
                  </TabsTrigger>
                )}
                <TabsTrigger value="all" asChild data-testid="location-tab-all">
                  <Link href="/shifts?showAll=true">All</Link>
                </TabsTrigger>
                {LOCATIONS.map((loc) => (
                  <TabsTrigger
                    key={loc}
                    value={loc}
                    asChild
                    data-testid={`location-tab-${loc
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    <Link href={`/shifts?location=${loc}`}>{loc}</Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Profile filter notification */}
      {isUsingProfileFilter && (
        <div
          className="mb-8 p-4 bg-primary/5 rounded-lg border border-primary/30"
          data-testid="profile-filter-notification"
        >
          <p className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Showing shifts in your preferred locations:{" "}
            {userPreferredLocations.join(", ")}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <Link href="/profile/edit" className="underline hover:text-primary">
              Update your preferences
            </Link>{" "}
            or select a specific location above.
          </p>
        </div>
      )}

      {/* Calendar View */}
      <ShiftsCalendar 
        shifts={shiftSummaries} 
        selectedLocation={selectedLocation}
      />

      {/* Upcoming Shifts Preview - for backward compatibility with tests */}
      {shiftSummaries.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Upcoming Shifts</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shiftSummaries.slice(0, 6).map((shift) => (
              <div key={shift.id} data-testid={`shift-card-${shift.id}`} className="p-6 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                <h3 data-testid={`shift-name-${shift.id}`} className="font-semibold text-lg mb-2">
                  {shift.shiftType.name}
                </h3>
                <div data-testid={`shift-time-${shift.id}`} className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {format(shift.start, "h:mm a")} - {format(shift.end, "h:mm a")}
                </div>
                <div data-testid={`shift-location-${shift.id}`} className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {shift.location || "TBD"}
                </div>
                <div data-testid={`shift-capacity-${shift.id}`} className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  <span data-testid={`shift-capacity-count-${shift.id}`}>
                    {shift.confirmedCount}/{shift.capacity}
                  </span>
                  <div data-testid={`shift-progress-bar-${shift.id}`} className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{width: `${Math.min(100, (shift.confirmedCount / shift.capacity) * 100)}%`}}
                    ></div>
                  </div>
                </div>
                <div data-testid={`shift-category-${shift.id}`} className="mb-2">
                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {shift.shiftType.name}
                  </span>
                </div>
                <div data-testid={`shift-duration-${shift.id}`} className="mb-4">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                    {Math.round((shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60))}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  {shift.confirmedCount >= shift.capacity ? (
                    <span data-testid={`shift-waitlist-badge-${shift.id}`} className="text-xs text-orange-600 font-medium">
                      Waitlist Only
                    </span>
                  ) : (
                    <span data-testid={`shift-spots-badge-${shift.id}`} className="text-xs text-green-600 font-medium">
                      {shift.capacity - shift.confirmedCount} spots left
                    </span>
                  )}
                </div>
                <div data-testid={`shift-actions-${shift.id}`} className="mt-4">
                  <Link 
                    href={`/shifts/${shift.id}`}
                    className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
