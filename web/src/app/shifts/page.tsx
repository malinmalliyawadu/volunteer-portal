import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShiftSignupDialog } from "@/components/shift-signup-dialog";
import { PageHeader } from "@/components/page-header";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;

type LocationOption = (typeof LOCATIONS)[number];

// Shift type theming configuration
const SHIFT_THEMES = {
  Dishwasher: {
    icon: "🍽️",
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    category: "Kitchen",
    emoji: "🧽",
  },
  "FOH Set-Up & Service": {
    icon: "🏪",
    gradient: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    category: "Service",
    emoji: "✨",
  },
  "Front of House": {
    icon: "🤝",
    gradient: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    category: "Service",
    emoji: "🌟",
  },
  "Kitchen Prep": {
    icon: "🥕",
    gradient: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    category: "Kitchen",
    emoji: "🔪",
  },
  "Kitchen Prep & Service": {
    icon: "👨‍🍳",
    gradient: "from-red-500 to-pink-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    category: "Kitchen",
    emoji: "🍳",
  },
  "Kitchen Service & Pack Down": {
    icon: "🍜",
    gradient: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
    category: "Kitchen",
    emoji: "📦",
  },
} as const;

// Default theme for unknown shift types
const DEFAULT_THEME = {
  icon: "🤲",
  gradient: "from-gray-500 to-slate-500",
  bgColor: "bg-gray-50",
  borderColor: "border-gray-200",
  textColor: "text-gray-700",
  category: "Volunteer",
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

  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
}

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  // Load user's profile data to get location preferences
  let userProfile = null;
  if (session?.user?.email) {
    userProfile = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        availableLocations: true,
      },
    });
  }

  // Parse user's preferred locations
  const userPreferredLocations = userProfile?.availableLocations
    ? JSON.parse(userProfile.availableLocations)
    : [];

  const params = await searchParams;

  // Normalize and validate selected location
  const rawLocation = Array.isArray(params.location)
    ? params.location[0]
    : params.location;
  const selectedLocation: LocationOption | undefined = LOCATIONS.includes(
    (rawLocation as LocationOption) ?? ("" as LocationOption)
  )
    ? (rawLocation as LocationOption)
    : undefined;

  // Check if user wants to see all locations (override profile preferences)
  const showAll = params.showAll === "true";

  // Determine filter locations
  let filterLocations: string[] = [];
  let isUsingProfileFilter = false;

  if (selectedLocation) {
    // Explicit location selected via URL parameter
    filterLocations = [selectedLocation];
  } else if (showAll) {
    // User explicitly wants to see all locations
    filterLocations = [];
    isUsingProfileFilter = false;
  } else if (userPreferredLocations.length > 0) {
    // No explicit location, use user's profile preferences
    filterLocations = userPreferredLocations.filter((loc: string) =>
      LOCATIONS.includes(loc as LocationOption)
    );
    isUsingProfileFilter = true;
  }
  // If no selection and no preferences, show all locations (empty filter)

  const shifts = await prisma.shift.findMany({
    orderBy: { start: "asc" },
    include: { shiftType: true, signups: true },
    where: {
      start: { gte: new Date() },
      ...(filterLocations.length > 0
        ? { location: { in: filterLocations } }
        : {}),
    },
  });

  type ShiftWithRelations = (typeof shifts)[number];

  // Group shifts by calendar date (yyyy-MM-dd)
  const groups = new Map<string, ShiftWithRelations[]>();
  for (const s of shifts) {
    const key = format(s.start, "yyyy-MM-dd");
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  // Sort group keys by date ascending
  const sortedKeys = Array.from(groups.keys()).sort();

  return (
    <div className="max-w-6xl mx-auto py-4 animate-fade-in">
      <PageHeader
        title="Volunteer Shifts"
        description={`Find and sign up for upcoming shifts${
          selectedLocation
            ? ` in ${selectedLocation}`
            : isUsingProfileFilter
            ? ` in your preferred locations`
            : ""
        }.`}
      >
        {/* Location filter */}
        <div className="mt-6 p-6 bg-card-bg rounded-xl border border-border">
          {isUsingProfileFilter && (
            <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <span>📍</span>
                Showing shifts in your preferred locations:{" "}
                {userPreferredLocations.join(", ")}
              </p>
              <p className="text-xs text-primary/80 mt-1">
                You can override this by selecting a specific location below, or{" "}
                <Link
                  href="/profile/edit"
                  className="underline hover:text-primary"
                >
                  update your preferences
                </Link>
                .
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-foreground mr-2">
              Filter by location:
            </span>
            {userPreferredLocations.length > 0 && (
              <Button
                asChild
                variant={
                  !selectedLocation && !showAll && isUsingProfileFilter
                    ? "default"
                    : "secondary"
                }
                size="sm"
                className={
                  !selectedLocation && !showAll && isUsingProfileFilter
                    ? "btn-primary"
                    : ""
                }
              >
                <Link href={{ pathname: "/shifts", query: {} }}>
                  Your preferences
                </Link>
              </Button>
            )}
            {LOCATIONS.map((loc) => (
              <Button
                asChild
                key={loc}
                variant={selectedLocation === loc ? "default" : "secondary"}
                size="sm"
                className={selectedLocation === loc ? "btn-primary" : ""}
              >
                <Link href={{ pathname: "/shifts", query: { location: loc } }}>
                  {loc}
                </Link>
              </Button>
            ))}
            <Button
              asChild
              variant={
                (!selectedLocation && !isUsingProfileFilter) || showAll
                  ? "default"
                  : "secondary"
              }
              size="sm"
              className={
                (!selectedLocation && !isUsingProfileFilter) || showAll
                  ? "btn-primary"
                  : ""
              }
            >
              <Link href={{ pathname: "/shifts", query: { showAll: "true" } }}>
                All locations
              </Link>
            </Button>
          </div>
        </div>
      </PageHeader>

      {shifts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-primary/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No shifts available</h3>
          <p className="text-muted-foreground">
            No upcoming shifts
            {selectedLocation
              ? ` in ${selectedLocation}`
              : isUsingProfileFilter
              ? ` in your preferred locations`
              : ""}
            . Check back later for new opportunities.
          </p>
          {isUsingProfileFilter && (
            <p className="text-muted-foreground mt-2">
              Try{" "}
              <Link
                href="/shifts"
                className="text-primary underline hover:text-primary/80"
              >
                viewing all locations
              </Link>{" "}
              or{" "}
              <Link
                href="/profile/edit"
                className="text-primary underline hover:text-primary/80"
              >
                updating your location preferences
              </Link>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {sortedKeys.map((key, dayIndex) => {
            const dayShifts = groups.get(key)!;
            const heading = format(new Date(key), "EEEE, dd MMMM yyyy");
            return (
              <section
                key={key}
                className="animate-slide-up"
                style={{ animationDelay: `${dayIndex * 0.1}s` }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-2xl font-bold">{heading}</h2>
                  <Badge variant="outline" className="badge-primary">
                    {dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {dayShifts.map((s: ShiftWithRelations, shiftIndex) => {
                    let confirmedCount = 0;
                    let waitlistCount = 0;
                    let pendingCount = 0;
                    for (const signup of s.signups) {
                      if (signup.status === "CONFIRMED") confirmedCount += 1;
                      if (signup.status === "WAITLISTED") waitlistCount += 1;
                      if (signup.status === "PENDING") pendingCount += 1;
                      // Note: CANCELED signups are excluded from all counts
                    }
                    const totalSignedUp =
                      confirmedCount + waitlistCount + pendingCount;
                    const remaining = Math.max(0, s.capacity - totalSignedUp);
                    const isFull = remaining === 0;

                    // Determine if the current user is already signed up for this shift (excluding canceled)
                    const currentUserId = (
                      session?.user as { id?: string } | undefined
                    )?.id;
                    const mySignup = currentUserId
                      ? s.signups.find(
                          (su: (typeof s.signups)[number]) =>
                            su.userId === currentUserId &&
                            su.status !== "CANCELED"
                        )
                      : undefined;

                    const theme = getShiftTheme(s.shiftType.name);
                    const duration = getDurationInHours(s.start, s.end);

                    return (
                      <Card
                        key={s.id}
                        className={`group hover:shadow-xl transition-all duration-300 overflow-hidden animate-slide-up border-l-4 ${theme.borderColor} ${theme.bgColor} hover:scale-[1.02] py-0`}
                        style={{
                          animationDelay: `${
                            dayIndex * 0.1 + shiftIndex * 0.05
                          }s`,
                        }}
                      >
                        <CardContent className="p-6">
                          {/* Header with icon and title */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white text-xl shadow-lg`}
                                >
                                  {theme.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                    {s.shiftType.name}
                                  </h3>
                                  <div
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${theme.bgColor} ${theme.textColor} border ${theme.borderColor}`}
                                  >
                                    <span>{theme.emoji}</span>
                                    <span>{theme.category}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Time and location info */}
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-4 h-4 flex items-center justify-center">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  </div>
                                  <span className="font-medium">
                                    {format(s.start, "h:mm a")} -{" "}
                                    {format(s.end, "h:mm a")}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${theme.bgColor} ${theme.textColor}`}
                                  >
                                    {duration}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-4 h-4 flex items-center justify-center">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                    </svg>
                                  </div>
                                  <span className="font-medium">
                                    {s.location}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {mySignup ? (
                              <Badge
                                variant="outline"
                                className={
                                  mySignup.status === "CONFIRMED"
                                    ? "badge-primary"
                                    : mySignup.status === "PENDING"
                                    ? "badge-accent"
                                    : "badge-accent"
                                }
                              >
                                {mySignup.status === "CONFIRMED"
                                  ? "✅ Confirmed"
                                  : mySignup.status === "PENDING"
                                  ? "⏳ Pending Approval"
                                  : "⏳ Waitlisted"}
                              </Badge>
                            ) : null}
                          </div>

                          {/* Description */}
                          {s.shiftType.description && (
                            <div className="mb-4 p-3 bg-white/50 rounded-lg border border-white/20">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {s.shiftType.description}
                              </p>
                            </div>
                          )}

                          {/* Enhanced capacity indicator */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-muted-foreground"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                  </svg>
                                </div>
                                <span className="text-muted-foreground font-medium">
                                  Volunteers
                                </span>
                              </div>
                              <span className="font-bold text-base">
                                {totalSignedUp}/{s.capacity}
                              </span>
                            </div>
                            <div className="progress-bar bg-gray-200">
                              <div
                                className={`progress-fill bg-gradient-to-r ${theme.gradient}`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(
                                      (totalSignedUp / s.capacity) * 100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                            {(pendingCount > 0 || waitlistCount > 0) && (
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {pendingCount > 0 && (
                                  <p className="flex items-center gap-1">
                                    <span>⏳</span>
                                    <span>{pendingCount} pending approval</span>
                                  </p>
                                )}
                                {waitlistCount > 0 && (
                                  <p className="flex items-center gap-1">
                                    <span>🎯</span>
                                    <span>{waitlistCount} on waitlist</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center justify-between">
                            {isFull ? (
                              <Badge
                                variant="secondary"
                                className="badge-outline"
                              >
                                🎯 Waitlist open
                              </Badge>
                            ) : (
                              <Badge
                                className={`${theme.bgColor} ${theme.textColor} border ${theme.borderColor}`}
                              >
                                ✨ {remaining} spot{remaining !== 1 ? "s" : ""}{" "}
                                left
                              </Badge>
                            )}

                            {mySignup ? (
                              <span className="text-sm text-muted-foreground font-medium">
                                You&apos;re signed up! 🎉
                              </span>
                            ) : isFull ? (
                              session ? (
                                <ShiftSignupDialog
                                  shift={{
                                    id: s.id,
                                    start: s.start,
                                    end: s.end,
                                    location: s.location,
                                    capacity: s.capacity,
                                    shiftType: {
                                      name: s.shiftType.name,
                                      description: s.shiftType.description,
                                    },
                                  }}
                                  confirmedCount={confirmedCount}
                                  isWaitlist={true}
                                >
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="btn-outline hover:scale-105 transition-transform"
                                  >
                                    🎯 Join waitlist
                                  </Button>
                                </ShiftSignupDialog>
                              ) : (
                                <Button
                                  asChild
                                  size="sm"
                                  className="btn-primary hover:scale-105 transition-transform"
                                >
                                  <Link
                                    href={{
                                      pathname: "/login",
                                      query: { callbackUrl: "/shifts" },
                                    }}
                                  >
                                    🎯 Join waitlist
                                  </Link>
                                </Button>
                              )
                            ) : session ? (
                              <ShiftSignupDialog
                                shift={{
                                  id: s.id,
                                  start: s.start,
                                  end: s.end,
                                  location: s.location,
                                  capacity: s.capacity,
                                  shiftType: {
                                    name: s.shiftType.name,
                                    description: s.shiftType.description,
                                  },
                                }}
                                confirmedCount={confirmedCount}
                              >
                                <Button
                                  type="button"
                                  size="sm"
                                  className={`btn-primary bg-gradient-to-r ${theme.gradient} hover:scale-105 transition-transform shadow-lg`}
                                >
                                  ✨ Sign up
                                </Button>
                              </ShiftSignupDialog>
                            ) : (
                              <Button
                                asChild
                                size="sm"
                                className="btn-primary hover:scale-105 transition-transform"
                              >
                                <Link
                                  href={{
                                    pathname: "/login",
                                    query: { callbackUrl: "/shifts" },
                                  }}
                                >
                                  ✨ Sign up
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
