import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CancelSignupButton } from "./cancel-signup-button";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  History,
  Timer,
  CheckCircle,
  Users,
  UserCheck,
  UserX,
  Mail,
} from "lucide-react";
import { PageContainer } from "@/components/page-container";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;
type LocationOption = (typeof LOCATIONS)[number];

export default async function MyShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/shifts/mine");
  }

  const params = await searchParams;
  const now = new Date();

  // Normalize and validate selected location
  const rawLocation = Array.isArray(params.location)
    ? params.location[0]
    : params.location;
  const selectedLocation: LocationOption | undefined = LOCATIONS.includes(
    (rawLocation as LocationOption) ?? ("" as LocationOption)
  )
    ? (rawLocation as LocationOption)
    : undefined;

  const uPage = Math.max(
    1,
    parseInt(
      Array.isArray(params.uPage)
        ? params.uPage[0] ?? "1"
        : params.uPage ?? "1",
      10
    ) || 1
  );
  const pPage = Math.max(
    1,
    parseInt(
      Array.isArray(params.pPage)
        ? params.pPage[0] ?? "1"
        : params.pPage ?? "1",
      10
    ) || 1
  );
  const uSize = Math.max(
    1,
    parseInt(
      Array.isArray(params.uSize)
        ? params.uSize[0] ?? "10"
        : params.uSize ?? "10",
      10
    ) || 10
  );
  const pSize = Math.max(
    1,
    parseInt(
      Array.isArray(params.pSize)
        ? params.pSize[0] ?? "10"
        : params.pSize ?? "10",
      10
    ) || 10
  );

  // Fetch group bookings where user is the leader
  const groupBookings = await prisma.groupBooking.findMany({
    where: {
      leaderId: userId,
      ...(selectedLocation ? { shift: { location: selectedLocation } } : {}),
    },
    include: {
      shift: {
        include: {
          shiftType: true,
        },
      },
      signups: {
        include: {
          user: true,
        },
      },
      invitations: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get user's friend IDs
  const userFriendIds = await prisma.friendship.findMany({
    where: {
      AND: [
        {
          OR: [
            { userId: userId },
            { friendId: userId },
          ],
        },
        { status: "ACCEPTED" },
      ],
    },
    select: {
      userId: true,
      friendId: true,
    },
  }).then(friendships => 
    friendships.map(friendship => 
      friendship.userId === userId 
        ? friendship.friendId 
        : friendship.userId
    )
  );


  const [upcomingCount, pastCount, upcoming, past] = await Promise.all([
    prisma.signup.count({
      where: {
        userId: userId!,
        shift: {
          end: { gte: now },
          ...(selectedLocation ? { location: selectedLocation } : {}),
        },
        status: { not: "CANCELED" },
      },
    }),
    prisma.signup.count({
      where: {
        userId: userId!,
        shift: {
          end: { lt: now },
          ...(selectedLocation ? { location: selectedLocation } : {}),
        },
        status: { not: "CANCELED" },
      },
    }),
    prisma.signup.findMany({
      where: {
        userId: userId!,
        shift: {
          end: { gte: now },
          ...(selectedLocation ? { location: selectedLocation } : {}),
        },
        status: { not: "CANCELED" },
      },
      include: { 
        shift: { 
          include: { 
            shiftType: true,
            signups: {
              where: userFriendIds.length > 0 ? {
                userId: { in: userFriendIds },
                status: { in: ["CONFIRMED", "PENDING"] }
              } : {
                // Return no results if no friends
                id: { equals: "never-match" }
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
                  }
                }
              }
            }
          } 
        } 
      },
      orderBy: { shift: { start: "asc" } },
      skip: (uPage - 1) * uSize,
      take: uSize,
    }),
    prisma.signup.findMany({
      where: {
        userId: userId!,
        shift: {
          end: { lt: now },
          ...(selectedLocation ? { location: selectedLocation } : {}),
        },
        status: { not: "CANCELED" },
      },
      include: { 
        shift: { 
          include: { 
            shiftType: true,
            signups: {
              where: userFriendIds.length > 0 ? {
                userId: { in: userFriendIds },
                status: { in: ["CONFIRMED", "PENDING"] }
              } : {
                // Return no results if no friends
                id: { equals: "never-match" }
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
                  }
                }
              }
            }
          } 
        } 
      },
      orderBy: { shift: { start: "desc" } },
      skip: (pPage - 1) * pSize,
      take: pSize,
    }),
  ]);

  type SignupWithRelations = (typeof upcoming)[number];

  const uTotalPages = Math.max(1, Math.ceil(upcomingCount / uSize));
  const pTotalPages = Math.max(1, Math.ceil(pastCount / pSize));

  function Pagination({
    page,
    totalPages,
    otherPage,
    size,
    type,
  }: {
    page: number;
    totalPages: number;
    otherPage: number;
    size: number;
    type: "u" | "p";
  }) {
    const isFirst = page <= 1;
    const isLast = page >= totalPages;
    const basePath = "/shifts/mine";
    const query = (nextPage: number) => {
      const baseQuery =
        type === "u"
          ? {
              uPage: String(nextPage),
              pPage: String(otherPage),
              uSize: String(size),
            }
          : {
              uPage: String(otherPage),
              pPage: String(nextPage),
              pSize: String(size),
            };

      // Preserve location filter if set
      if (selectedLocation) {
        return { ...baseQuery, location: selectedLocation };
      }
      return baseQuery;
    };

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {isFirst ? (
          <Button variant="outline" size="sm" disabled className="gap-1 sm:gap-2 px-2 sm:px-3">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
            <Link href={{ pathname: basePath, query: query(page - 1) }}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-1 px-2 sm:px-3 py-2 text-sm text-muted-foreground rounded-md">
          <span className="font-medium text-foreground">{page}</span>
          <span>of</span>
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>
        {isLast ? (
          <Button variant="outline" size="sm" disabled className="gap-1 sm:gap-2 px-2 sm:px-3">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
            <Link href={{ pathname: basePath, query: query(page + 1) }}>
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 gap-1.5"
          >
            <Timer className="h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 gap-1.5">
            <CheckCircle className="h-3 w-3" />
            Confirmed
          </Badge>
        );
      case "WAITLISTED":
        return (
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3 w-3" />
            Waitlisted
          </Badge>
        );
      default:
        return null;
    }
  }

  return (
    <PageContainer testId="my-shifts-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <PageHeader
            title="My Shifts"
            description="View your upcoming and past volunteer shifts."
            className="flex-1"
          />

          {/* Compact location filter using tabs */}
          <div className="flex flex-col gap-2 w-full sm:w-auto" data-testid="location-filter">
            <span className="text-sm font-medium text-muted-foreground">
              Filter by location:
            </span>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Tabs value={selectedLocation || "all"} className="w-fit min-w-0">
                <TabsList className="bg-muted flex-nowrap" data-testid="location-tabs">
                  <TabsTrigger value="all" asChild className="whitespace-nowrap" data-testid="location-tab-all">
                    <Link href={{ pathname: "/shifts/mine", query: {} }}>
                      All
                    </Link>
                  </TabsTrigger>
                  {LOCATIONS.map((loc) => (
                    <TabsTrigger
                      key={loc}
                      value={loc}
                      asChild
                      className="whitespace-nowrap"
                      data-testid={`location-tab-${loc
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      <Link
                        href={{
                          pathname: "/shifts/mine",
                          query: { location: loc },
                        }}
                      >
                        {loc}
                      </Link>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Upcoming Shifts Section */}
        <section className="mb-12" data-testid="upcoming-shifts-section">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                data-testid="upcoming-shifts-title"
              >
                Upcoming Shifts
              </h2>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 px-3 py-1.5 text-sm font-semibold"
                data-testid="upcoming-shifts-count"
              >
                {upcomingCount}
              </Badge>
            </div>
            <div className="flex justify-end" data-testid="upcoming-shifts-pagination">
              <Pagination
                page={uPage}
                totalPages={uTotalPages}
                otherPage={pPage}
                size={uSize}
                type="u"
              />
            </div>
          </div>

          {upcoming.length === 0 ? (
            <Card
              className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800"
              data-testid="upcoming-shifts-empty-state"
            >
              <CardContent className="text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      No upcoming shifts yet
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Ready to make a difference? Browse available volunteer
                      opportunities.
                    </div>
                    <Button
                      asChild
                      className="gap-2"
                      data-testid="browse-shifts-button"
                    >
                      <Link href="/shifts">
                        <Calendar className="h-4 w-4" />
                        Browse Shifts
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4" data-testid="upcoming-shifts-list">
              {upcoming.map((su: SignupWithRelations) => (
                <Card
                  key={su.id}
                  className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-blue-50/50 dark:bg-blue-950/30 backdrop-blur-sm"
                  data-testid={`upcoming-shift-${su.id}`}
                >
                  {/* Gradient accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                  
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg flex items-center justify-center text-white">
                            <CalendarCheck className="h-4 w-4" />
                          </div>
                          <h3
                            className="font-bold text-xl text-gray-900 dark:text-white truncate"
                            data-testid="shift-name"
                          >
                            {su.shift.shiftType.name}
                          </h3>
                          <div data-testid="shift-status">
                            <StatusBadge status={su.status} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {format(su.shift.start, "EEE, dd MMM yyyy")}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {format(su.shift.start, "h:mm a")} – {format(su.shift.end, "h:mm a")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                Location
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {su.shift.location ?? "To be confirmed"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Friends participating */}
                        {su.shift.signups.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-800">
                              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                  {su.shift.signups.length} friend{su.shift.signups.length !== 1 ? "s" : ""} joining:
                                </span>
                                <div className="flex items-center gap-1 overflow-hidden">
                                  <TooltipProvider>
                                    {su.shift.signups.slice(0, 3).map((signup) => {
                                      const displayName = signup.user.name || 
                                        `${signup.user.firstName || ""} ${signup.user.lastName || ""}`.trim() || 
                                        signup.user.email;
                                      const initials = (signup.user.firstName?.[0] || signup.user.name?.[0] || signup.user.email[0]).toUpperCase();
                                      
                                      return (
                                        <Tooltip key={signup.id}>
                                          <TooltipTrigger asChild>
                                            <Link href={`/friends/${signup.user.id}`} className="cursor-pointer">
                                              <Avatar className="h-6 w-6">
                                                <AvatarImage 
                                                  src={signup.user.profilePhotoUrl || undefined} 
                                                  alt={displayName}
                                                />
                                                <AvatarFallback className="bg-green-100 text-green-700 text-xs dark:bg-green-800 dark:text-green-300">
                                                  {initials}
                                                </AvatarFallback>
                                              </Avatar>
                                            </Link>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{displayName} is joining this shift</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                    {su.shift.signups.length > 3 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="text-xs text-green-600 dark:text-green-400 font-medium ml-1 cursor-pointer">
                                            +{su.shift.signups.length - 3}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{su.shift.signups.length - 3} more friend{su.shift.signups.length - 3 !== 1 ? 's' : ''} joining this shift</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </TooltipProvider>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        className="flex-shrink-0 flex flex-col gap-2"
                        data-testid="shift-actions"
                      >
                        <CancelSignupButton
                          shiftId={su.shift.id}
                          shiftName={su.shift.shiftType.name}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Group Bookings Section - Only show if user has group bookings */}
        {groupBookings.length > 0 && (
          <section className="mb-12" data-testid="group-bookings-section">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                data-testid="group-bookings-title"
              >
                My Group Bookings
              </h2>
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 px-3 py-1.5 text-sm font-semibold"
                data-testid="group-bookings-count"
              >
                {groupBookings.length}
              </Badge>
            </div>

            <div className="space-y-4" data-testid="group-bookings-list">
              {groupBookings.map((group) => {
                const acceptedMembers = group.signups.filter(
                  (s) => s.status !== "CANCELED"
                );
                const pendingInvites = group.invitations.filter(
                  (i) => i.status === "PENDING"
                );
                const totalInvited = acceptedMembers.length + pendingInvites.length;

                return (
                  <Card
                    key={group.id}
                    className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-purple-50/50 dark:bg-purple-950/30 backdrop-blur-sm"
                    data-testid={`group-booking-${group.id}`}
                  >
                    {/* Gradient accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                    
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center text-white">
                                <Users className="h-4 w-4" />
                              </div>
                              <h3
                                className="font-bold text-xl text-gray-900 dark:text-white"
                                data-testid="group-name"
                              >
                                {group.name}
                              </h3>
                              <StatusBadge status={group.status} />
                            </div>
                            {group.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {group.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Shift Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {group.shift.shiftType.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {format(group.shift.start, "EEE, dd MMM yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                Time
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {format(group.shift.start, "h:mm a")} – {format(group.shift.end, "h:mm a")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                Location
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {group.shift.location ?? "To be confirmed"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Members Section */}
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Group Members ({totalInvited}/{group.maxMembers})
                            </h4>
                          </div>

                          {/* Accepted Members */}
                          {acceptedMembers.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                Registered Members
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {acceptedMembers.map((signup) => (
                                  <div
                                    key={signup.id}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-sm"
                                  >
                                    <UserCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                                    <span className="text-green-700 dark:text-green-300">
                                      {signup.user.name || signup.user.email}
                                    </span>
                                    {signup.user.id === userId && (
                                      <Badge className="text-xs px-1.5 py-0.5">You</Badge>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      {signup.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pending Invitations */}
                          {pendingInvites.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Pending Invitations
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {pendingInvites.map((invite) => (
                                  <div
                                    key={invite.id}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-sm"
                                  >
                                    <Mail className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                                    <span className="text-yellow-700 dark:text-yellow-300">
                                      {invite.email}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/20"
                                    >
                                      Awaiting Response
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Declined/Expired Invitations */}
                          {group.invitations.filter(
                            (i) => i.status === "DECLINED" || i.status === "EXPIRED"
                          ).length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <UserX className="h-3 w-3" />
                                Unable to Join
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {group.invitations
                                  .filter(
                                    (i) => i.status === "DECLINED" || i.status === "EXPIRED"
                                  )
                                  .map((invite) => (
                                    <div
                                      key={invite.id}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-900/30 rounded-lg text-sm"
                                    >
                                      <UserX className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                      <span className="text-gray-600 dark:text-gray-400 line-through">
                                        {invite.email}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs px-1.5 py-0.5 bg-gray-50 dark:bg-gray-900/20"
                                      >
                                        {invite.status === "DECLINED" ? "Declined" : "Expired"}
                                      </Badge>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            asChild
                          >
                            <Link href={`/group-bookings/${group.id}`}>
                              <Users className="h-3 w-3" />
                              Manage Group
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Past Shifts Section */}
        <section data-testid="past-shifts-section">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <History className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                data-testid="past-shifts-title"
              >
                Shift History
              </h2>
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold"
                data-testid="past-shifts-count"
              >
                {pastCount}
              </Badge>
            </div>
            <div className="flex justify-end" data-testid="past-shifts-pagination">
              <Pagination
                page={pPage}
                totalPages={pTotalPages}
                otherPage={uPage}
                size={pSize}
                type="p"
              />
            </div>
          </div>

          {past.length === 0 ? (
            <Card
              className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700"
              data-testid="past-shifts-empty-state"
            >
              <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <History className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-lg font-medium text-slate-600 dark:text-slate-400">
                    No shift history yet
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-500">
                    Your completed shifts will appear here.
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4" data-testid="past-shifts-list">
              {past.map((su: SignupWithRelations) => (
                <Card
                  key={su.id}
                  className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm opacity-90"
                  data-testid={`past-shift-${su.id}`}
                >
                  {/* Gradient accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-gray-500" />
                  
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 shadow-lg flex items-center justify-center text-white">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <h3
                            className="font-bold text-xl text-gray-900 dark:text-white truncate"
                            data-testid="shift-name"
                          >
                            {su.shift.shiftType.name}
                          </h3>
                          <div data-testid="shift-status">
                            <StatusBadge status={su.status} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {format(su.shift.start, "EEE, dd MMM yyyy")}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {format(su.shift.start, "h:mm a")} – {format(su.shift.end, "h:mm a")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                Location
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {su.shift.location ?? "Not specified"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </section>
    </PageContainer>
  );
}
