import { prisma } from "@/lib/prisma";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AchievementsCard from "@/components/achievements-card";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const userName = (session?.user as { name?: string } | undefined)?.name;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const now = new Date();

  // Get comprehensive user statistics
  const [
    totalShifts,
    completedShifts,
    upcomingShifts,
    nextShift,
    recentShifts,
    totalVolunteers,
    monthlyShifts,
  ] = await Promise.all([
    // Total shifts ever signed up for
    prisma.signup.count({
      where: {
        userId: userId!,
        status: { in: ["CONFIRMED", "WAITLISTED"] },
      },
    }),

    // Completed shifts (past shifts with CONFIRMED status)
    prisma.signup.findMany({
      where: {
        userId: userId!,
        shift: { end: { lt: now } },
        status: "CONFIRMED",
      },
      include: { shift: { include: { shiftType: true } } },
    }),

    // Upcoming confirmed shifts count
    prisma.signup.count({
      where: {
        userId: userId!,
        shift: { start: { gte: now } },
        status: "CONFIRMED",
      },
    }),

    // Next upcoming shift
    prisma.signup.findFirst({
      where: {
        userId: userId!,
        shift: { start: { gte: now } },
        status: "CONFIRMED",
      },
      include: { shift: { include: { shiftType: true } } },
      orderBy: { shift: { start: "asc" } },
    }),

    // Recent completed shifts (last 3)
    prisma.signup.findMany({
      where: {
        userId: userId!,
        shift: { end: { lt: now } },
        status: "CONFIRMED",
      },
      include: { shift: { include: { shiftType: true } } },
      orderBy: { shift: { start: "desc" } },
      take: 3,
    }),

    // Total active volunteers (for community stats)
    prisma.user.count({
      where: { role: "VOLUNTEER" },
    }),

    // This month's shifts for the user
    prisma.signup.count({
      where: {
        userId: userId!,
        status: "CONFIRMED",
        shift: {
          start: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      },
    }),
  ]);

  // Define types for better type safety
  type CompletedSignup = (typeof completedShifts)[number];

  // Calculate total hours volunteered
  const totalHours = completedShifts.reduce(
    (total: number, signup: CompletedSignup) => {
      const hours = differenceInHours(signup.shift.end, signup.shift.start);
      return total + hours;
    },
    0
  );

  // Get user's favorite shift type
  const shiftTypeCounts = completedShifts.reduce(
    (acc: Record<string, number>, signup: CompletedSignup) => {
      const typeName = signup.shift.shiftType.name;
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const favoriteShiftType = Object.entries(shiftTypeCounts).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0]?.[0];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-700 bg-clip-text text-transparent">
            Welcome back{userName ? `, ${userName}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your volunteer journey
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Button asChild size="sm" variant="outline">
            <Link href="/shifts">Browse Shifts</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/shifts/mine">My Schedule</Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{completedShifts.length}</p>
                <p className="text-sm text-muted-foreground">
                  Shifts Completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-accent"
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
              <div>
                <p className="text-2xl font-bold">{totalHours}</p>
                <p className="text-sm text-muted-foreground">
                  Hours Contributed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
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
              <div>
                <p className="text-2xl font-bold">{upcomingShifts}</p>
                <p className="text-sm text-muted-foreground">Upcoming Shifts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{monthlyShifts}</p>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Shift */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
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
              Your Next Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextShift ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {nextShift.shift.shiftType.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {nextShift.shift.location}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {formatDistanceToNow(nextShift.shift.start, {
                      addSuffix: true,
                    })}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {format(nextShift.shift.start, "EEEE, MMMM do")}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
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
                    {format(nextShift.shift.start, "h:mm a")} -{" "}
                    {format(nextShift.shift.end, "h:mm a")}
                  </div>
                </div>
                {nextShift.shift.notes && (
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <p className="text-sm">{nextShift.shift.notes}</p>
                  </div>
                )}
                <Button asChild size="sm" className="w-full">
                  <Link href="/shifts/mine">View All My Shifts</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
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
                <h3 className="font-semibold mb-2">No upcoming shifts</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Browse available shifts and sign up for your next volunteer
                  opportunity.
                </p>
                <Button asChild size="sm">
                  <Link href="/shifts">Browse Shifts</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.5s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
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
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentShifts.length > 0 ? (
              <div className="space-y-4">
                {recentShifts.map((signup: CompletedSignup) => (
                  <div
                    key={signup.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {signup.shift.shiftType.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(signup.shift.start, "MMM d")} •{" "}
                        {signup.shift.location}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Completed
                    </Badge>
                  </div>
                ))}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/shifts/mine">View All History</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
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
                <h3 className="font-semibold mb-2">No completed shifts yet</h3>
                <p className="text-muted-foreground text-sm">
                  Your completed shifts will appear here after you volunteer.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <AchievementsCard />

        {/* Impact & Community Stats */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.6s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              Your Impact & Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {totalHours * 15}
                </div>
                <p className="text-sm text-muted-foreground">
                  Estimated meals helped prepare
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on ~15 meals per volunteer hour
                </p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-accent mb-2">
                  {totalVolunteers}
                </div>
                <p className="text-sm text-muted-foreground">
                  Active volunteers in our community
                </p>
                {favoriteShiftType && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Your specialty: {favoriteShiftType}
                  </p>
                )}
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {Math.round(totalHours * 2.5 * 10) / 10}kg
                </div>
                <p className="text-sm text-muted-foreground">
                  Estimated food waste prevented
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on rescue food operations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="animate-slide-up" style={{ animationDelay: "0.7s" }}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto py-4">
              <Link href="/shifts" className="flex flex-col items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="text-sm">Find Shifts</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4">
              <Link
                href="/shifts/mine"
                className="flex flex-col items-center gap-2"
              >
                <svg
                  className="w-6 h-6"
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
                <span className="text-sm">My Schedule</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4">
              <Link
                href="/profile"
                className="flex flex-col items-center gap-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-sm">My Profile</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4">
              <a
                href="https://everybodyeats.nz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span className="text-sm">Visit Main Site</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
