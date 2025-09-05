import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { PageHeader } from "@/components/page-header";
import { MapPin } from "lucide-react";
import { PageContainer } from "@/components/page-container";
import { safeParseAvailability } from "@/lib/parse-availability";
import { ShiftsCalendar } from "@/components/shifts-calendar";
import { LOCATIONS, LocationOption } from "@/lib/locations";

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

export default async function ShiftsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // Get current user
  let currentUser = null;
  let userFriendIds: string[] = [];
  if (session?.user?.email) {
    currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, availableLocations: true },
    });
    
    // Get user's friend IDs if logged in
    if (currentUser?.id) {
      userFriendIds = await prisma.friendship
        .findMany({
          where: {
            AND: [
              {
                OR: [{ userId: currentUser.id }, { friendId: currentUser.id }],
              },
              { status: "ACCEPTED" },
            ],
          },
          select: {
            userId: true,
            friendId: true,
          },
        })
        .then((friendships) =>
          friendships.map((friendship) =>
            friendship.userId === currentUser!.id ? friendship.friendId : friendship.userId
          )
        );
    }
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
  let hasExplicitLocationChoice = false;

  if (selectedLocation) {
    filterLocations = [selectedLocation];
    hasExplicitLocationChoice = true;
  } else if (showAll) {
    filterLocations = [];
    hasExplicitLocationChoice = true;
  } else if (userPreferredLocations.length > 0) {
    // Only auto-filter by profile preferences if there's only one preferred location
    // Otherwise, force explicit selection to avoid confusion
    if (userPreferredLocations.length === 1) {
      filterLocations = userPreferredLocations.filter((loc: string) =>
        LOCATIONS.includes(loc as LocationOption)
      );
      isUsingProfileFilter = true;
      hasExplicitLocationChoice = true;
    }
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

  // Separately fetch friend signups if needed
  type FriendSignup = {
    user: {
      id: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string;
      profilePhotoUrl: string | null;
    };
  };
  let friendSignupsMap: Record<string, FriendSignup[]> = {};
  if (userFriendIds.length > 0) {
    const friendSignups = await prisma.signup.findMany({
      where: {
        shiftId: { in: shifts.map(s => s.id) },
        userId: { in: userFriendIds },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    // Group by shift ID
    friendSignupsMap = friendSignups.reduce<Record<string, FriendSignup[]>>((acc, signup) => {
      if (!acc[signup.shiftId]) acc[signup.shiftId] = [];
      acc[signup.shiftId].push(signup);
      return acc;
    }, {});
  }

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
    friendSignups: friendSignupsMap[shift.id] || [],
  }));

  // If no explicit location choice has been made, show location selection screen
  if (!hasExplicitLocationChoice) {
    return (
      <PageContainer testid="shifts-browse-page">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <MapPin className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="location-selection-title">
                Choose Your Location
              </h1>
              <p className="text-muted-foreground text-lg" data-testid="location-selection-description">
                Please select a location to view available volunteer shifts
              </p>
            </div>
          </div>

          <div className="max-w-md w-full space-y-4" data-testid="location-selection-options">
            {/* User's preferred locations (if any) */}
            {userPreferredLocations.length > 1 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Your preferred locations:</p>
                <div className="grid gap-3">
                  {userPreferredLocations.map((loc) => (
                    LOCATIONS.includes(loc as LocationOption) && (
                      <Link
                        key={loc}
                        href={`/shifts?location=${loc}`}
                        className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 rounded-lg transition-all duration-200 group"
                        data-testid={`preferred-location-${loc.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-medium">{loc}</span>
                        </div>
                        <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          →
                        </div>
                      </Link>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* All locations */}
            <div className="space-y-3">
              {userPreferredLocations.length > 1 && (
                <p className="text-sm font-medium text-muted-foreground">Other locations:</p>
              )}
              <div className="grid gap-3">
                {LOCATIONS.filter((loc) => 
                  userPreferredLocations.length > 1 
                    ? !userPreferredLocations.includes(loc) 
                    : true
                ).map((loc) => (
                  <Link
                    key={loc}
                    href={`/shifts?location=${loc}`}
                    className="flex items-center justify-between p-4 bg-background hover:bg-muted border border-border hover:border-primary/30 rounded-lg transition-all duration-200 group"
                    data-testid={`location-option-${loc.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                      <span className="font-medium">{loc}</span>
                    </div>
                    <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </div>
                  </Link>
                ))}
                
                {/* Show all locations option */}
                <Link
                  href="/shifts?showAll=true"
                  className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 rounded-lg transition-all duration-200 group"
                  data-testid="show-all-locations"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 border-2 border-muted-foreground rounded-full"></div>
                    <span className="font-medium">All Locations</span>
                  </div>
                  <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Help text */}
          <div className="text-sm text-muted-foreground max-w-lg">
            <p>
              Selecting a location helps prevent accidental sign-ups to the wrong shifts. 
              You can change locations at any time using the tabs above the calendar.
            </p>
            {userPreferredLocations.length === 0 && (
              <p className="mt-2">
                <Link href="/profile/edit" className="underline hover:text-primary">
                  Set your preferred locations
                </Link> to customize your experience.
              </p>
            )}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer testid="shifts-browse-page">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <PageHeader
          title={selectedLocation || (showAll ? "All Locations" : (isUsingProfileFilter ? userPreferredLocations.join(", ") : "Shifts"))}
          description={`Find and sign up for upcoming volunteer opportunities${
            selectedLocation
              ? ` in ${selectedLocation}`
              : showAll
              ? " at all locations"
              : isUsingProfileFilter
              ? ` in your preferred location`
              : ""
          }. Click on any date to see details and sign up.`}
          className="flex-1"
          data-testid="shifts-page-header"
        />

        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          {/* Back to locations button */}
          <Link
            href="/shifts"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 rounded-lg transition-colors"
            data-testid="back-to-locations-button"
          >
            ← Choose Different Location
          </Link>
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
            Showing shifts in your preferred location: {userPreferredLocations.join(", ")}
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
