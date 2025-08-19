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
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";
import { ArrowLeft, Users, Calendar, Clock, TrendingUp, Heart, UserCheck, Handshake } from "lucide-react";

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
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      },
    }),
  ]);

  // Calculate friendship stats
  const daysSinceFriendship = differenceInDays(new Date(), friendship.createdAt);
  const friendshipMonths = Math.max(1, Math.floor(daysSinceFriendship / 30));

  // Calculate friend's total hours
  const friendTotalHours = friendCompletedShifts.reduce((total, signup) => {
    const hours = differenceInHours(signup.shift.end, signup.shift.start);
    return total + hours;
  }, 0);

  // Calculate shared stats
  const sharedShiftsCount = sharedShifts.length;

  // Get friend's favorite shift type
  const shiftTypeCounts = friendCompletedShifts.reduce(
    (acc, signup) => {
      const typeName = signup.shift.shiftType.name;
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const favoriteShiftType = Object.entries(shiftTypeCounts).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0]?.[0];

  const displayName = friend.name || 
    `${friend.firstName || ""} ${friend.lastName || ""}`.trim() || 
    friend.email;
  const initials = (friend.firstName?.[0] || friend.name?.[0] || friend.email[0]).toUpperCase();

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

        {/* Friend Profile Header */}
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage 
              src={friend.profilePhotoUrl || undefined} 
              alt={displayName}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <PageHeader
              title={displayName}
              description={`Friends for ${daysSinceFriendship} days • Volunteer companion`}
              className="mb-0"
            />
          </div>
        </div>

        {/* Friendship & Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{daysSinceFriendship}</p>
                  <p className="text-sm text-muted-foreground">Days Connected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Handshake className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sharedShiftsCount}</p>
                  <p className="text-sm text-muted-foreground">Shared Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{friendTotalShifts}</p>
                  <p className="text-sm text-muted-foreground">Total Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{friendTotalHours}</p>
                  <p className="text-sm text-muted-foreground">Hours Volunteered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Friend's Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {displayName}&apos;s Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{friendThisMonthShifts}</p>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-accent">{Math.round(friendTotalShifts / friendshipMonths)}</p>
                    <p className="text-sm text-muted-foreground">Avg/Month</p>
                  </div>
                </div>
                {favoriteShiftType && (
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">Favorite Role</Badge>
                    <p className="font-medium">{favoriteShiftType}</p>
                    <p className="text-sm text-muted-foreground">
                      {shiftTypeCounts[favoriteShiftType]} times
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shared Volunteering History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Shared Volunteering
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sharedShifts.length > 0 ? (
                <div className="space-y-3">
                  {sharedShifts.slice(0, 5).map((shift) => (
                    <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {shift.shiftType.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(shift.start, "MMM d, yyyy")} • {shift.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {shift.start >= new Date() ? "Upcoming" : "Completed"}
                      </Badge>
                    </div>
                  ))}
                  {sharedShifts.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{sharedShifts.length - 5} more shared shifts
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No shared shifts yet</p>
                  <p className="text-sm mt-1">Sign up for the same shifts to volunteer together!</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/shifts">Browse Shifts</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Friend's Upcoming Shifts */}
        {(friend.friendVisibility === "PUBLIC" || friend.friendVisibility === "FRIENDS_ONLY") && (
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
                    <div key={signup.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{signup.shift.shiftType.name}</p>
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
                  <p className="text-sm mt-1">Check back later to see {displayName}&apos;s schedule</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}