import { prisma } from "@/lib/prisma";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  differenceInHours,
} from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CancelSignupButton } from "./cancel-signup-button";
import { PageHeader } from "@/components/page-header";
import {
  Calendar,
  Timer,
  CheckCircle,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
} from "lucide-react";
import { PageContainer } from "@/components/page-container";

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

function generateCalendarUrls(shift: {
  id: string;
  start: Date;
  end: Date;
  location: string | null;
  shiftType: {
    name: string;
    description: string | null;
  };
}) {
  const startDate = format(shift.start, "yyyyMMdd'T'HHmmss");
  const endDate = format(shift.end, "yyyyMMdd'T'HHmmss");
  const title = encodeURIComponent(`Volunteer Shift: ${shift.shiftType.name}`);
  const description = encodeURIComponent(
    `${shift.shiftType.description || ""}\nLocation: ${shift.location || "TBD"}`
  );
  const location = encodeURIComponent(shift.location || "");

  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${description}&location=${location}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${description}&location=${location}`,
    ics: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Volunteer Portal//EN
BEGIN:VEVENT
UID:${shift.id}@volunteerportal.com
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${decodeURIComponent(title)}
DESCRIPTION:${decodeURIComponent(description)}
LOCATION:${decodeURIComponent(location)}
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "%0A"),
  };
}

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

  // Parse month/year for calendar navigation
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const viewMonth = params.month
    ? new Date(parseInt(params.month as string))
    : currentMonth;

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  // Get current user's profile for preferences
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      availableLocations: true,
    },
  });

  const userPreferredLocations = currentUser?.availableLocations
    ? JSON.parse(currentUser.availableLocations)
    : [];

  // Get user's friend IDs
  const userFriendIds = await prisma.friendship
    .findMany({
      where: {
        AND: [
          {
            OR: [{ userId: userId }, { friendId: userId }],
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
        friendship.userId === userId ? friendship.friendId : friendship.userId
      )
    );

  // Fetch all user's shifts for stats and calendar
  const [allShifts, monthShifts, totalStats, availableShifts] =
    await Promise.all([
      // All shifts for overall stats
      prisma.signup.findMany({
        where: {
          userId: userId!,
          status: { not: "CANCELED" },
        },
        include: {
          shift: {
            include: {
              shiftType: true,
              signups: {
                where:
                  userFriendIds.length > 0
                    ? {
                        userId: { in: userFriendIds },
                        status: { in: ["CONFIRMED", "PENDING"] },
                      }
                    : {
                        id: { equals: "never-match" },
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
              },
            },
          },
        },
        orderBy: { shift: { start: "asc" } },
      }),
      // Shifts for the current view month
      prisma.signup.findMany({
        where: {
          userId: userId!,
          status: { not: "CANCELED" },
          shift: {
            start: { gte: monthStart, lte: monthEnd },
          },
        },
        include: {
          shift: {
            include: {
              shiftType: true,
              signups: {
                where:
                  userFriendIds.length > 0
                    ? {
                        userId: { in: userFriendIds },
                        status: { in: ["CONFIRMED", "PENDING"] },
                      }
                    : {
                        id: { equals: "never-match" },
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
              },
            },
          },
        },
      }),
      // Count stats
      Promise.all([
        prisma.signup.count({
          where: {
            userId: userId!,
            shift: { end: { lt: now } },
            status: "CONFIRMED",
          },
        }),
        prisma.signup.count({
          where: {
            userId: userId!,
            shift: { start: { gte: now } },
            status: { in: ["CONFIRMED", "PENDING"] },
          },
        }),
      ]),
      // Available shifts in user's preferred locations for the month
      userPreferredLocations.length > 0
        ? prisma.shift.findMany({
            where: {
              start: { gte: monthStart, lte: monthEnd },
              location: { in: userPreferredLocations },
              // Only shifts that aren't full and user hasn't signed up for
              signups: {
                none: {
                  userId: userId,
                  status: { not: "CANCELED" },
                },
              },
            },
            include: {
              signups: {
                where: {
                  status: { in: ["CONFIRMED", "PENDING"] },
                },
              },
              shiftType: true,
            },
          })
        : Promise.resolve([]),
    ]);

  const [completedShifts, upcomingShifts] = totalStats;

  // Generate calendar days
  const calendarDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  // Group shifts by date
  const shiftsByDate = new Map<string, typeof monthShifts>();
  for (const shift of monthShifts) {
    const dateKey = format(shift.shift.start, "yyyy-MM-dd");
    if (!shiftsByDate.has(dateKey)) {
      shiftsByDate.set(dateKey, []);
    }
    shiftsByDate.get(dateKey)!.push(shift);
  }

  // Group available shifts by date (for showing browse links)
  type AvailableShift = typeof availableShifts extends readonly (infer T)[]
    ? T
    : never;
  const availableShiftsByDate = new Map<string, AvailableShift[]>();
  for (const shift of availableShifts) {
    const dateKey = format(shift.start, "yyyy-MM-dd");
    if (!availableShiftsByDate.has(dateKey)) {
      availableShiftsByDate.set(dateKey, []);
    }
    // Only include if shift has available spots
    const confirmedSignups = shift.signups.filter(
      (s) => s.status === "CONFIRMED"
    ).length;
    const pendingSignups = shift.signups.filter(
      (s) => s.status === "PENDING"
    ).length;
    const hasAvailableSpots =
      confirmedSignups + pendingSignups < shift.capacity;

    if (hasAvailableSpots) {
      availableShiftsByDate.get(dateKey)!.push(shift);
    }
  }

  function ShiftDetailsDialog({
    shift,
    children,
  }: {
    shift: (typeof monthShifts)[0];
    children: React.ReactNode;
  }) {
    const theme = getShiftTheme(shift.shift.shiftType.name);
    const isPastShift = shift.shift.end < now;

    return (
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg flex items-center justify-center text-white text-lg`}
              >
                {theme.emoji}
              </div>
              <div>
                <div className="font-semibold">
                  {shift.shift.shiftType.name}
                </div>
                <div className="text-sm font-normal text-muted-foreground">
                  {format(shift.shift.start, "EEEE, MMMM d, yyyy")}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <StatusBadge status={shift.status} isPast={isPastShift} />
            </div>

            {/* Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time</span>
              <div className="text-sm text-right">
                <div>
                  {format(shift.shift.start, "h:mm a")} -{" "}
                  {format(shift.shift.end, "h:mm a")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {differenceInHours(shift.shift.end, shift.shift.start)} hours
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Location</span>
              <span className="text-sm">
                {shift.shift.location || "To be confirmed"}
              </span>
            </div>

            {/* Description */}
            {shift.shift.shiftType.description && (
              <div>
                <div className="text-sm font-medium mb-2">Description</div>
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {shift.shift.shiftType.description}
                </div>
              </div>
            )}

            {/* Notes */}
            {shift.shift.notes && (
              <div>
                <div className="text-sm font-medium mb-2">Notes</div>
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {shift.shift.notes}
                </div>
              </div>
            )}

            {/* Friends joining */}
            {shift.shift.signups.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Friends Joining</div>
                <div className="space-y-2">
                  {shift.shift.signups.map((signup) => {
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
                      <div key={signup.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={signup.user.profilePhotoUrl || undefined}
                            alt={displayName}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {signup.status === "CONFIRMED"
                              ? "Confirmed"
                              : "Pending"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            {!isPastShift && (
              <div className="pt-4 border-t space-y-3">
                {/* Add to Calendar */}
                <div>
                  <div className="text-sm font-medium mb-2">
                    Add to Calendar
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(() => {
                      const urls = generateCalendarUrls(shift.shift);
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            asChild
                          >
                            <a
                              href={urls.google}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <CalendarPlus className="h-3 w-3" />
                              Google
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            asChild
                          >
                            <a
                              href={urls.outlook}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <CalendarPlus className="h-3 w-3" />
                              Outlook
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            asChild
                          >
                            <a
                              href={urls.ics}
                              download={`shift-${shift.shift.id}.ics`}
                            >
                              <CalendarPlus className="h-3 w-3" />
                              .ics File
                            </a>
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Cancel Shift */}
                <CancelSignupButton
                  shiftId={shift.shift.id}
                  shiftName={shift.shift.shiftType.name}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  function StatusBadge({
    status,
    isPast = false,
  }: {
    status: string;
    isPast?: boolean;
  }) {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            <Timer className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {isPast ? "Completed" : "Confirmed"}
          </Badge>
        );
      case "WAITLISTED":
        return (
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            Waitlisted
          </Badge>
        );
      default:
        return null;
    }
  }

  const prevMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() - 1,
    1
  );
  const nextMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    1
  );

  return (
    <PageContainer testId="my-shifts-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="My Shifts"
          description="Your volunteer schedule and shift history."
          className="flex-1"
        />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-700">
                {completedShifts}
              </div>
              <div className="text-sm text-green-600 font-medium">
                Completed
              </div>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-700">
                {upcomingShifts}
              </div>
              <div className="text-sm text-blue-600 font-medium">Upcoming</div>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-700">
                {monthShifts.length}
              </div>
              <div className="text-sm text-purple-600 font-medium">
                This Month
              </div>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Timer className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-amber-700">
                {Math.round(
                  allShifts
                    .filter(
                      (s) => s.shift.end < now && s.status === "CONFIRMED"
                    )
                    .reduce(
                      (total, s) =>
                        total + differenceInHours(s.shift.end, s.shift.start),
                      0
                    )
                )}
              </div>
              <div className="text-sm text-amber-600 font-medium">
                Total Hours
              </div>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Timer className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {format(viewMonth, "MMMM yyyy")}
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  Your volunteer schedule
                </div>
              </div>
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Link
                  href={{
                    pathname: "/shifts/mine",
                    query: {
                      month: prevMonth.getTime().toString(),
                    },
                  }}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Link>
              </Button>

              {/* Current Month Button - only show if not already viewing current month */}
              {viewMonth.getMonth() !== currentMonth.getMonth() ||
              viewMonth.getFullYear() !== currentMonth.getFullYear() ? (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                >
                  <Link href="/shifts/mine">Today</Link>
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                asChild
                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Link
                  href={{
                    pathname: "/shifts/mine",
                    query: {
                      month: nextMonth.getTime().toString(),
                    },
                  }}
                  className="flex items-center"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-3">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day, index) => (
                <div
                  key={day}
                  className={`py-3 px-2 text-center text-sm font-semibold tracking-wide ${
                    index === 0 || index === 6
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  <div className="hidden sm:block">{day}</div>
                  <div className="sm:hidden">{day.slice(0, 1)}</div>
                </div>
              )
            )}

            {/* Calendar days */}
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayShifts = shiftsByDate.get(dateKey) || [];
              const availableShifts = availableShiftsByDate.get(dateKey) || [];
              const isToday = isSameDay(day, now);
              const isPast = day < now && !isToday;
              const shift = dayShifts[0]; // Since only 1 shift per day is allowed
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={dateKey}
                  className={`
                    min-h-[120px] sm:min-h-[140px] p-2 sm:p-3 rounded-xl relative flex flex-col
                    transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-lg
                    ${
                      isPast
                        ? "bg-gray-50/70 border border-gray-200/60 shadow-sm"
                        : isToday
                        ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-md ring-2 ring-blue-200/40"
                        : isWeekend
                        ? "bg-gray-50/50 border border-gray-200 shadow-sm hover:shadow-md"
                        : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                    }
                  `}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`
                        text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center
                        ${
                          isPast
                            ? "text-gray-400"
                            : isToday
                            ? "text-white bg-blue-500 shadow-md"
                            : "text-gray-700"
                        }
                      `}
                    >
                      {format(day, "d")}
                    </div>
                    {isToday && (
                      <div className="text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        Today
                      </div>
                    )}
                  </div>

                  {/* Shift content */}
                  <div className="flex-1 flex flex-col justify-center">
                    {shift ? (
                      <ShiftDetailsDialog shift={shift}>
                        <div className="w-full group cursor-pointer">
                          {(() => {
                            const theme = getShiftTheme(
                              shift.shift.shiftType.name
                            );
                            return (
                              <div
                                className={`
                                  relative p-3 rounded-lg text-white shadow-md 
                                  transition-all duration-200 ease-in-out
                                  group-hover:shadow-lg group-hover:scale-105
                                  ${
                                    isPast
                                      ? `bg-gradient-to-br ${theme.gradient} opacity-50`
                                      : `bg-gradient-to-br ${theme.gradient} hover:shadow-xl`
                                  }
                                `}
                              >
                                <div className="text-center space-y-1">
                                  <div className="text-lg sm:text-xl">
                                    {theme.emoji}
                                  </div>
                                  <div className="font-bold text-xs sm:text-sm">
                                    {format(shift.shift.start, "HH:mm")}
                                  </div>
                                  <div className="text-xs opacity-90 font-medium line-clamp-2">
                                    {shift.shift.shiftType.name}
                                  </div>
                                  {shift.shift.signups.length > 0 && (
                                    <div className="flex justify-center mt-1">
                                      <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                                        <UserCheck className="h-3 w-3" />
                                        <span className="text-xs font-medium">
                                          +{shift.shift.signups.length}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Subtle gradient overlay for better readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg pointer-events-none" />
                              </div>
                            );
                          })()}
                        </div>
                      </ShiftDetailsDialog>
                    ) : (
                      <div className="text-center">
                        {isPast ? (
                          <div className="text-gray-400 text-xs font-medium">
                            No shifts
                          </div>
                        ) : availableShifts.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 px-3 text-xs font-medium border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
                          >
                            <Link
                              href="/shifts"
                              className="flex items-center gap-1"
                            >
                              <CalendarPlus className="h-3 w-3" />
                              <span className="hidden sm:inline">
                                {availableShifts.length} available
                              </span>
                              <span className="sm:hidden">
                                {availableShifts.length}
                              </span>
                            </Link>
                          </Button>
                        ) : (
                          <div className="text-gray-400 text-xs font-medium">
                            No shifts
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
