import { prisma } from "@/lib/prisma";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import AchievementsCard from "@/components/achievements-card";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";
import {
  StatsGrid,
  ContentGrid,
  BottomGrid,
} from "@/components/dashboard-animated";
import { MotionContentCard } from "@/components/motion-content-card";
import { CheckCircle, Clock, Calendar, TrendingUp } from "lucide-react";
import { AnimatedStatsGrid } from "@/components/animated-stats-grid";

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
    pendingShifts,
    nextShift,
    recentShifts,
    totalVolunteers,
    monthlyShifts,
    friendsUpcomingShifts,
  ] = await Promise.all([
    // Total shifts ever signed up for (including pending)
    prisma.signup.count({
      where: {
        userId: userId!,
        status: { in: ["PENDING", "CONFIRMED", "WAITLISTED"] },
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

    // Pending approval shifts count
    prisma.signup.count({
      where: {
        userId: userId!,
        shift: { start: { gte: now } },
        status: "PENDING",
      },
    }),

    // Next upcoming shift (confirmed or pending)
    prisma.signup.findFirst({
      where: {
        userId: userId!,
        shift: { start: { gte: now } },
        status: { in: ["PENDING", "CONFIRMED"] },
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

    // Friends' upcoming shifts
    prisma.signup.findMany({
      where: {
        status: "CONFIRMED",
        shift: { start: { gte: now } },
        user: {
          AND: [
            {
              OR: [
                {
                  friendships: {
                    some: {
                      friendId: userId!,
                      status: "ACCEPTED",
                    },
                  },
                },
                {
                  friendOf: {
                    some: {
                      userId: userId!,
                      status: "ACCEPTED",
                    },
                  },
                },
              ],
            },
            // Only include friends with public or friends-only visibility
            {
              friendVisibility: {
                in: ["PUBLIC", "FRIENDS_ONLY"],
              },
            },
          ],
        },
      },
      include: {
        shift: {
          include: { shiftType: true },
        },
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
      orderBy: { shift: { start: "asc" } },
      take: 6, // Show up to 6 friend shifts
    }),
  ]);

  console.log("totalShifts", totalShifts);

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
    <PageContainer testid="dashboard-page">
      <PageHeader
        title={`Welcome back${userName ? `, ${userName}` : ""}!`}
        description="Here's what's happening with your volunteer journey"
      ></PageHeader>

      {/* Stats Overview */}
      <AnimatedStatsGrid
        stats={[
          {
            title: "Shifts Completed",
            value: completedShifts.length,
            iconType: "checkCircle",
            variant: "green",
          },
          {
            title: "Hours Contributed",
            value: totalHours,
            iconType: "clock",
            variant: "amber",
          },
          {
            title: "Confirmed Shifts",
            value: upcomingShifts,
            subtitle:
              pendingShifts > 0
                ? `+${pendingShifts} pending approval`
                : undefined,
            iconType: "calendar",
            variant: "blue",
          },
          {
            title: "This Month",
            value: monthlyShifts,
            iconType: "trendingUp",
            variant: "purple",
          },
        ]}
      />

      <ContentGrid>
        {/* Next Shift */}
        <MotionContentCard className="h-fit flex-1 min-w-80" delay={0.2}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary dark:text-emerald-400" />
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
                    {nextShift.status === "PENDING" && (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 mt-2"
                      >
                        Pending Approval
                      </Badge>
                    )}
                    {nextShift.status === "CONFIRMED" && (
                      <Badge className="mt-2">Confirmed</Badge>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {formatDistanceToNow(nextShift.shift.start, {
                      addSuffix: true,
                    })}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                    {format(nextShift.shift.start, "EEEE, MMMM do")}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                    {format(nextShift.shift.start, "h:mm a")} -{" "}
                    {format(nextShift.shift.end, "h:mm a")}
                  </div>
                </div>
                {nextShift.shift.notes && (
                  <div className="p-3 bg-accent/10 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm dark:text-gray-200">
                      {nextShift.shift.notes}
                    </p>
                  </div>
                )}
                <Button asChild size="sm" className="w-full">
                  <Link href="/shifts/mine">View All My Shifts</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted dark:bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground dark:text-gray-500" />
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
        </MotionContentCard>

        {/* Recent Activity */}
        <MotionContentCard className="h-fit flex-1 min-w-80" delay={0.3}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary dark:text-emerald-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentShifts.length > 0 ? (
              <div className="space-y-4">
                {recentShifts.map((signup: CompletedSignup) => (
                  <div
                    key={signup.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-primary/10 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-primary dark:text-emerald-400" />
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
                <div className="w-16 h-16 bg-muted dark:bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground dark:text-gray-500" />
                </div>
                <h3 className="font-semibold mb-2">No completed shifts yet</h3>
                <p className="text-muted-foreground text-sm">
                  Your completed shifts will appear here after you volunteer.
                </p>
              </div>
            )}
          </CardContent>
        </MotionContentCard>

        {/* Friends Activity */}
        {friendsUpcomingShifts.length > 0 && (
          <MotionContentCard className="h-fit flex-1 min-w-80" delay={0.4}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary dark:text-emerald-400" />
                  Friends&apos; Activity
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {friendsUpcomingShifts.slice(0, 4).map((signup) => {
                  const displayName =
                    signup.user.name ||
                    `${signup.user.firstName || ""} ${
                      signup.user.lastName || ""
                    }`.trim() ||
                    signup.user.email;
                  const initials = (
                    signup.user.firstName?.[0] ||
                    signup.user.name?.[0] ||
                    signup.user.email[0]
                  ).toUpperCase();

                  return (
                    <Link
                      className="block"
                      key={signup.id}
                      href={`/friends/${signup.user.id}`}
                    >
                      <div className="flex items-center gap-3 p-3 bg-muted/30 dark:bg-muted/20 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors cursor-pointer">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={signup.user.profilePhotoUrl || undefined}
                            alt={displayName}
                          />
                          <AvatarFallback className="bg-primary/10 dark:bg-emerald-900/30 text-primary dark:text-emerald-400">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {signup.shift.shiftType.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">
                            {format(signup.shift.start, "MMM d")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {friendsUpcomingShifts.length > 4 && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link href="/friends/stats">View All</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </MotionContentCard>
        )}
      </ContentGrid>

      <BottomGrid>
        {/* Achievements */}
        <div>
          <AchievementsCard />
        </div>

        {/* Impact & Community Stats */}
        <MotionContentCard className="h-fit" delay={0.6}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary dark:text-emerald-400" />
              Your Impact & Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary dark:text-emerald-400 mb-2">
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
                <div className="text-3xl font-bold text-accent dark:text-yellow-400 mb-2">
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
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
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
        </MotionContentCard>
      </BottomGrid>

      {/* Quick Actions */}
      <MotionContentCard className="h-fit" delay={0.7}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto py-4">
              <Link href="/shifts" className="flex flex-col items-center gap-2">
                <svg
                  className="w-6 h-6 text-foreground dark:text-gray-300"
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
                <Calendar className="w-6 h-6 text-foreground dark:text-gray-300" />
                <span className="text-sm">My Schedule</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4">
              <Link
                href="/profile"
                className="flex flex-col items-center gap-2"
              >
                <svg
                  className="w-6 h-6 text-foreground dark:text-gray-300"
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
                  className="w-6 h-6 text-foreground dark:text-gray-300"
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
      </MotionContentCard>
    </PageContainer>
  );
}
