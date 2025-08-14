import { prisma } from "@/lib/prisma";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShiftSignupDialog } from "@/components/shift-signup-dialog";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GroupBookingDialogWrapper } from "@/components/group-booking-dialog-wrapper";
import { PageContainer } from "@/components/page-container";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;
type LocationOption = (typeof LOCATIONS)[number];

// Shift type theming configuration
const SHIFT_THEMES = {
  Dishwasher: {
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    emoji: "🧽",
  },
  "FOH Set-Up & Service": {
    gradient: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    emoji: "✨",
  },
  "Front of House": {
    gradient: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    emoji: "🌟",
  },
  "Kitchen Prep": {
    gradient: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    emoji: "🔪",
  },
  "Kitchen Prep & Service": {
    gradient: "from-red-500 to-pink-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    emoji: "🍳",
  },
  "Kitchen Service & Pack Down": {
    gradient: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
    emoji: "📦",
  },
} as const;

const DEFAULT_THEME = {
  gradient: "from-gray-500 to-slate-500",
  bgColor: "bg-gray-50",
  borderColor: "border-gray-200",
  textColor: "text-gray-700",
  emoji: "❤️",
};

function getShiftTheme(shiftTypeName: string) {
  return (
    SHIFT_THEMES[shiftTypeName as keyof typeof SHIFT_THEMES] || DEFAULT_THEME
  );
}

function getDurationInHours(start: Date, end: Date): string {
  const durationMs = end.getTime() - start.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return minutes === 0 ? `${wholeHours}h` : `${wholeHours}h ${minutes}m`;
}

interface ShiftWithRelations {
  id: string;
  start: Date;
  end: Date;
  location: string | null;
  capacity: number;
  notes: string | null;
  shiftType: {
    id: string;
    name: string;
    description: string | null;
  };
  signups: Array<{
    id: string;
    userId: string;
    status: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  groupBookings: Array<{
    id: string;
    name: string;
    status: string;
    signups: Array<{
      id: string;
      userId: string;
      status: string;
    }>;
  }>;
}

function ShiftCard({
  shift,
  currentUserId,
  session,
}: {
  shift: ShiftWithRelations;
  currentUserId?: string;
  session: unknown;
}) {
  const theme = getShiftTheme(shift.shiftType.name);
  const duration = getDurationInHours(shift.start, shift.end);

  // Calculate signup counts
  let confirmedCount = 0;
  let pendingCount = 0;

  for (const signup of shift.signups) {
    if (signup.status === "CONFIRMED") confirmedCount += 1;
    if (signup.status === "PENDING") pendingCount += 1;
  }

  const remaining = Math.max(0, shift.capacity - confirmedCount - pendingCount);
  const isFull = remaining === 0;

  // Check if user has existing signup
  const mySignup = currentUserId
    ? shift.signups.find(
        (s) => s.userId === currentUserId && s.status !== "CANCELED"
      )
    : undefined;

  return (
    <Card
      className={`group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${theme.bgColor}`}
    >
      {/* Gradient accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`}
      />

      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with emoji and title */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`p-2 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg flex items-center justify-center text-white text-lg font-medium`}
              >
                {theme.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xl text-gray-900 truncate mb-1">
                  {shift.shiftType.name}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs font-medium ${theme.textColor} ${theme.bgColor} border ${theme.borderColor}`}
                  >
                    {duration}
                  </Badge>
                  {mySignup && (
                    <Badge
                      variant={
                        mySignup.status === "CONFIRMED"
                          ? "default"
                          : "secondary"
                      }
                      className={`text-xs font-medium ${
                        mySignup.status === "CONFIRMED"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {mySignup.status === "CONFIRMED"
                        ? "✅ Confirmed"
                        : mySignup.status === "PENDING"
                        ? "⏳ Pending"
                        : "⏳ Waitlisted"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {shift.shiftType.description && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {shift.shiftType.description}
            </p>
          )}

          {/* Time and capacity info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-white/50 rounded-lg">
              <Clock className="h-4 w-4 text-gray-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {format(shift.start, "h:mm a")}
                </div>
                <div className="text-xs text-gray-500">
                  to {format(shift.end, "h:mm a")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/50 rounded-lg">
              <Users className="h-4 w-4 text-gray-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {confirmedCount + pendingCount}/{shift.capacity}
                </div>
                <div className="text-xs text-gray-500">
                  {remaining > 0 ? (
                    <span className="text-green-600 font-medium">
                      {remaining} spots left
                    </span>
                  ) : (
                    <span className="text-orange-600 font-medium">Full</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Group bookings indicator */}
          {shift.groupBookings.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                {shift.groupBookings.length} group booking
                {shift.groupBookings.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Action button */}
          {!mySignup && (
            <div className="pt-2">
              {session ? (
                <ShiftSignupDialog
                  shift={{
                    id: shift.id,
                    start: shift.start,
                    end: shift.end,
                    location: shift.location,
                    capacity: shift.capacity,
                    shiftType: {
                      name: shift.shiftType.name,
                      description: shift.shiftType.description,
                    },
                  }}
                  confirmedCount={confirmedCount}
                  isWaitlist={isFull}
                >
                  <Button
                    className={`w-full font-medium transition-all duration-200 ${
                      isFull
                        ? "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:border-orange-300"
                        : "bg-gradient-to-r " +
                          theme.gradient +
                          " hover:shadow-lg transform hover:scale-[1.02] text-white"
                    }`}
                    variant={isFull ? "outline" : "default"}
                  >
                    {isFull ? "🎯 Join Waitlist" : "✨ Sign Up Now"}
                  </Button>
                </ShiftSignupDialog>
              ) : (
                <Button
                  asChild
                  className={`w-full font-medium bg-gradient-to-r ${theme.gradient} hover:shadow-lg transform hover:scale-[1.02] text-white transition-all duration-200`}
                >
                  <Link href="/login?callbackUrl=/shifts">✨ Sign Up Now</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ShiftsPageRedesigned({
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
  const userPreferredLocations = currentUser?.availableLocations
    ? JSON.parse(currentUser.availableLocations)
    : [];

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

  // Fetch shifts
  const shifts = (await prisma.shift.findMany({
    where: {
      start: { gte: new Date() },
      ...(filterLocations.length > 0
        ? { location: { in: filterLocations } }
        : {}),
    },
    orderBy: { start: "asc" },
    include: {
      shiftType: true,
      signups: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      groupBookings: {
        include: {
          signups: true,
        },
      },
    },
  })) as ShiftWithRelations[];

  // Group shifts by date and location
  const shiftsByDate = new Map<string, Map<string, ShiftWithRelations[]>>();

  for (const shift of shifts) {
    const dateKey = format(shift.start, "yyyy-MM-dd");
    const locationKey = shift.location || "No location specified";

    if (!shiftsByDate.has(dateKey)) {
      shiftsByDate.set(dateKey, new Map());
    }

    const dateGroup = shiftsByDate.get(dateKey)!;
    if (!dateGroup.has(locationKey)) {
      dateGroup.set(locationKey, []);
    }

    dateGroup.get(locationKey)!.push(shift);
  }

  // Sort dates
  const sortedDates = Array.from(shiftsByDate.keys()).sort();

  return (
    <PageContainer testId="shifts-browse-page">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <PageHeader
          title="Volunteer Shifts"
          description={`Find and sign up for upcoming volunteer opportunities${
            selectedLocation
              ? ` in ${selectedLocation}`
              : isUsingProfileFilter
              ? ` in your preferred locations`
              : ""
          }.`}
          className="flex-1"
          data-testid="shifts-page-header"
        />

        {/* Location filter */}
        <div className="flex flex-col gap-3" data-testid="location-filter">
          <span className="text-sm font-medium text-muted-foreground">
            Filter by location:
          </span>
          <Tabs
            value={
              selectedLocation || (isUsingProfileFilter ? "preferences" : "all")
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

      {/* Profile filter notification */}
      {isUsingProfileFilter && (
        <div
          className="mb-8 p-4 bg-primary/10 rounded-lg border border-primary/20"
          data-testid="profile-filter-notification"
        >
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Showing shifts in your preferred locations:{" "}
            {userPreferredLocations.join(", ")}
          </p>
          <p className="text-xs text-primary/80 mt-2">
            <Link href="/profile/edit" className="underline hover:text-primary">
              Update your preferences
            </Link>{" "}
            or select a specific location above.
          </p>
        </div>
      )}

      {shifts.length === 0 ? (
        <div className="text-center py-20" data-testid="empty-state">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-primary/60" />
          </div>
          <h3
            className="text-2xl font-semibold mb-3"
            data-testid="empty-state-title"
          >
            No shifts available
          </h3>
          <p
            className="text-muted-foreground max-w-md mx-auto"
            data-testid="empty-state-description"
          >
            No upcoming shifts found
            {selectedLocation
              ? ` in ${selectedLocation}`
              : isUsingProfileFilter
              ? ` in your preferred locations`
              : ""}
            . Check back later for new opportunities.
          </p>
          {isUsingProfileFilter && (
            <div className="mt-4 space-x-4">
              <Button asChild variant="outline">
                <Link href="/shifts?showAll=true">View All Locations</Link>
              </Button>
              <Button asChild>
                <Link href="/profile/edit">Update Preferences</Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8" data-testid="shifts-list">
          {sortedDates.map((dateKey, dateIndex) => {
            const locationGroups = shiftsByDate.get(dateKey)!;
            const sortedLocations = Array.from(locationGroups.keys()).sort();
            const dateObj = parseISO(dateKey);
            const totalShiftsThisDate = Array.from(
              locationGroups.values()
            ).reduce((sum, shifts) => sum + shifts.length, 0);

            return (
              <section
                key={dateKey}
                className="animate-slide-up"
                style={{ animationDelay: `${dateIndex * 0.1}s` }}
                data-testid={`shifts-date-section-${dateKey}`}
              >
                {/* Date Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h2
                        className="text-2xl font-bold"
                        data-testid={`shifts-date-heading-${dateKey}`}
                      >
                        {format(dateObj, "EEEE, MMMM d, yyyy")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {totalShiftsThisDate} shift
                        {totalShiftsThisDate !== 1 ? "s" : ""} available
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Groups */}
                <div className="space-y-6">
                  {sortedLocations.map((locationKey) => {
                    const locationShifts = locationGroups.get(locationKey)!;

                    return (
                      <Collapsible
                        key={locationKey}
                        defaultOpen
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between gap-8">
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="flex-1 justify-start p-4 h-auto hover:bg-muted/50"
                              data-testid={`location-toggle-${dateKey}-${locationKey
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <MapPin className="h-5 w-5 text-primary" />
                                  <div className="text-left">
                                    <h3 className="font-semibold text-lg">
                                      {locationKey}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      {locationShifts.length} shift
                                      {locationShifts.length !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              </div>
                            </Button>
                          </CollapsibleTrigger>

                          {/* Group Booking Button at Location Level */}
                          {session && (
                            <GroupBookingDialogWrapper
                              shifts={locationShifts}
                              date={format(dateObj, "EEEE, MMMM d, yyyy")}
                              location={locationKey}
                              testId={`group-booking-${dateKey}-${locationKey
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                            />
                          )}
                        </div>

                        <CollapsibleContent className="space-y-3 pl-4">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {locationShifts.map((shift) => (
                              <ShiftCard
                                key={shift.id}
                                shift={shift}
                                currentUserId={currentUser?.id}
                                session={session}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
