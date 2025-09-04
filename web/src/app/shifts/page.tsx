import { prisma } from "@/lib/prisma";
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
    <PageContainer testid="shifts-calendar-page">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <PageHeader
          title="Volunteer Shifts Calendar"
          description={`View available shifts by date and location${
            selectedLocation
              ? ` in ${selectedLocation}`
              : isUsingProfileFilter
              ? ` in your preferred locations`
              : ""
          }. Click on any date to see details and sign up.`}
          className="flex-1"
          data-testid="shifts-calendar-page-header"
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
    </PageContainer>
  );
}
