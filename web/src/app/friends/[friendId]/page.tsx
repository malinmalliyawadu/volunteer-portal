import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageContainer } from "@/components/page-container";
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Heart,
  UserCheck,
  Handshake,
} from "lucide-react";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/friends");
  }

  const { friendId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, firstName: true, lastName: true },
  });

  if (!user) {
    redirect("/login?callbackUrl=/friends");
  }

  // Get the friend and verify friendship exists
  const [friend, friendship] = await Promise.all([
    prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePhotoUrl: true,
        friendVisibility: true,
      },
    }),
    prisma.friendship.findFirst({
      where: {
        AND: [
          {
            OR: [
              { userId: user.id, friendId: friendId },
              { userId: friendId, friendId: user.id },
            ],
          },
          { status: "ACCEPTED" },
        ],
      },
      select: {
        createdAt: true,
        userId: true,
        friendId: true,
      },
    }),
  ]);

  if (!friend || !friendship) {
    notFound();
  }

  // Check friend visibility
  if (friend.friendVisibility === "PRIVATE") {
    notFound();
  }

  // Get comprehensive friendship stats
  const [
    sharedShifts,
    friendUpcomingShifts,
    friendCompletedShifts,
    friendTotalShifts,
    friendThisMonthShifts,
  ] = await Promise.all([
    // Shifts where both users were signed up (completed or confirmed)
    prisma.shift.findMany({
      where: {
        signups: {
          some: {
            userId: user.id,
            status: { in: ["CONFIRMED", "PENDING"] },
          },
        },
        AND: {
          signups: {
            some: {
              userId: friendId,
              status: { in: ["CONFIRMED", "PENDING"] },
            },
          },
        },
      },
      include: {
        shiftType: true,
        signups: {
          where: {
            userId: { in: [user.id, friendId] },
            status: { in: ["CONFIRMED", "PENDING"] },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { start: "desc" },
      take: 10,
    }),

    // Friend's upcoming shifts (if visibility allows)
    prisma.signup.findMany({
      where: {
        userId: friendId,
        status: "CONFIRMED",
        shift: { start: { gte: new Date() } },
      },
      include: {
        shift: {
          include: { shiftType: true },
        },
      },
      orderBy: { shift: { start: "asc" } },
      take: 10,
    }),

    // Friend's completed shifts
    prisma.signup.findMany({
      where: {
        userId: friendId,
        status: "CONFIRMED",
        shift: { end: { lt: new Date() } },
      },
      include: {
        shift: {
          include: { shiftType: true },
        },
      },
      orderBy: { shift: { start: "desc" } },
    }),

    // Friend's total shifts
    prisma.signup.count({
      where: {
        userId: friendId,
        status: "CONFIRMED",
      },
    }),

    // Friend's shifts this month
    prisma.signup.count({
      where: {
        userId: friendId,
        status: "CONFIRMED",
        shift: {
          start: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              1
            ),
          },
        },
      },
    }),
  ]);

  // Calculate friendship stats
  const daysSinceFriendship = differenceInDays(
    new Date(),
    friendship.createdAt
  );
  const friendshipMonths = Math.max(1, Math.floor(daysSinceFriendship / 30));

  // Calculate friend's total hours
  const friendTotalHours = friendCompletedShifts.reduce((total, signup) => {
    const hours = differenceInHours(signup.shift.end, signup.shift.start);
    return total + hours;
  }, 0);

  // Calculate shared stats
  const sharedShiftsCount = sharedShifts.length;

  // Get friend's favorite shift type
  const shiftTypeCounts = friendCompletedShifts.reduce((acc, signup) => {
    const typeName = signup.shift.shiftType.name;
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const favoriteShiftType = Object.entries(shiftTypeCounts).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0]?.[0];

  const displayName =
    friend.name ||
    `${friend.firstName || ""} ${friend.lastName || ""}`.trim() ||
    friend.email;
  const initials = (
    friend.firstName?.[0] ||
    friend.name?.[0] ||
    friend.email[0]
  ).toUpperCase();

  return (
    <PageContainer testId="friend-profile-page">
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/friends" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Friends
            </Link>
          </Button>
        </div>

        {/* Enhanced Friend Profile Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent rounded-2xl"></div>
          <div className="relative p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20 ring-offset-4 ring-offset-background">
                <AvatarImage
                  src={friend.profilePhotoUrl || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-3xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-background flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                {displayName}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Friends for {daysSinceFriendship} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Handshake className="h-4 w-4" />
                  <span>Volunteer companion</span>
                </div>
              </div>
              {daysSinceFriendship <= 30 && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 border-green-200 w-fit"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  New Friend
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Friendship & Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                  <Heart className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {daysSinceFriendship}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Days Connected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center">
                  <Handshake className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {sharedShiftsCount}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Shared Shifts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-600">
                    {friendTotalShifts}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Total Shifts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full flex items-center justify-center">
                  <Clock className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-600">
                    {friendTotalHours}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Hours Volunteered
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Friend's Activity Summary */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xl">{displayName}&apos;s Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/10">
                    <p className="text-3xl font-bold text-primary mb-1">
                      {friendThisMonthShifts}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      This Month
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/10">
                    <p className="text-3xl font-bold text-accent mb-1">
                      {Math.round(friendTotalShifts / friendshipMonths)}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      Avg/Month
                    </p>
                  </div>
                </div>
                {favoriteShiftType && (
                  <div className="text-center p-4 bg-muted/30 rounded-xl border border-muted">
                    <Badge variant="outline" className="mb-3 bg-background">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Favorite Role
                    </Badge>
                    <p className="font-semibold text-lg mb-1">
                      {favoriteShiftType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Completed {shiftTypeCounts[favoriteShiftType]} times
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Shared Volunteering History */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-xl">Shared Volunteering</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sharedShifts.length > 0 ? (
                <div className="space-y-4">
                  {sharedShifts.slice(0, 5).map((shift) => (
                    <div
                      key={shift.id}
                      className="group flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-muted"
                    >
                      <div className="w-3 h-3 bg-gradient-to-br from-primary to-primary/70 rounded-full flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate mb-1">
                          {shift.shiftType.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(shift.start, "MMM d, yyyy")} •{" "}
                          {shift.location}
                        </p>
                      </div>
                      <Badge
                        variant={
                          shift.start >= new Date() ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {shift.start >= new Date() ? "Upcoming" : "Completed"}
                      </Badge>
                    </div>
                  ))}
                  {sharedShifts.length > 5 && (
                    <div className="text-center pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">
                        +{sharedShifts.length - 5} more shared shifts
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-semibold mb-2">No shared shifts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign up for the same shifts to volunteer together!
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="hover:shadow-md transition-shadow"
                  >
                    <Link href="/shifts">
                      <Calendar className="h-3 w-3 mr-2" />
                      Browse Shifts
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Friend's Upcoming Shifts */}
        {(friend.friendVisibility === "PUBLIC" ||
          friend.friendVisibility === "FRIENDS_ONLY") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {displayName}&apos;s Upcoming Shifts
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/shifts">View All Shifts</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {friendUpcomingShifts.length > 0 ? (
                <div className="space-y-3">
                  {friendUpcomingShifts.map((signup) => (
                    <div
                      key={signup.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {signup.shift.shiftType.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {signup.shift.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(signup.shift.start, "MMM d")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(signup.shift.start, "h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming shifts</p>
                  <p className="text-sm mt-1">
                    Check back later to see {displayName}&apos;s schedule
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
