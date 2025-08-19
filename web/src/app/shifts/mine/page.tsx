import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInHours } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CancelSignupButton } from "./cancel-signup-button";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from "recharts";
import {
  Clock,
  MapPin,
  Calendar,
  CalendarCheck,
  History,
  Timer,
  CheckCircle,
  Users,
  UserCheck,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
} from "lucide-react";
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

function generateCalendarUrls(shift: any) {
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
END:VCALENDAR`.replace(/\n/g, '%0A')
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
  const viewMonth = params.month ? 
    new Date(parseInt(params.month as string)) : 
    currentMonth;
  
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  

  // Get current user's profile for preferences
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      availableLocations: true 
    },
  });

  const userPreferredLocations = currentUser?.availableLocations
    ? JSON.parse(currentUser.availableLocations)
    : [];

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

  // Fetch all user's shifts for stats and calendar
  const [allShifts, monthShifts, totalStats, availableShifts] = await Promise.all([
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
              where: userFriendIds.length > 0 ? {
                userId: { in: userFriendIds },
                status: { in: ["CONFIRMED", "PENDING"] }
              } : {
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
              where: userFriendIds.length > 0 ? {
                userId: { in: userFriendIds },
                status: { in: ["CONFIRMED", "PENDING"] }
              } : {
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
                status: { not: "CANCELED" }
              }
            }
          },
          include: {
            signups: {
              where: {
                status: { in: ["CONFIRMED", "PENDING"] }
              }
            },
            shiftType: true
          }
        })
      : Promise.resolve([])
  ]);

  const [completedShifts, upcomingShifts] = totalStats;
  
  // Calculate statistics
  const completedSignups = allShifts.filter(s => s.shift.end < now && s.status === "CONFIRMED");
  const totalHours = completedSignups.reduce((total, signup) => {
    return total + differenceInHours(signup.shift.end, signup.shift.start);
  }, 0);

  // Get favorite shift type
  const shiftTypeCounts = completedSignups.reduce(
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

  // Prepare data for charts
  const shiftTypeData = Object.entries(shiftTypeCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([type, count], index) => {
      const theme = getShiftTheme(type);
      const colors = [
        'hsl(221, 83%, 53%)', // Blue
        'hsl(262, 83%, 58%)', // Purple  
        'hsl(142, 76%, 36%)', // Green
        'hsl(31, 100%, 50%)', // Orange
        'hsl(0, 84%, 60%)',   // Red
      ];
      return {
        type,
        count,
        emoji: theme.emoji,
        fill: colors[index] || colors[0]
      };
    });

  // Monthly activity for the past 6 months
  const monthsData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    const monthShifts = completedSignups.filter(signup => {
      const shiftDate = signup.shift.start;
      return shiftDate >= monthStart && shiftDate <= monthEnd;
    }).length;
    
    monthsData.push({
      month: format(monthDate, 'MMM'),
      shifts: monthShifts,
      hours: completedSignups.filter(signup => {
        const shiftDate = signup.shift.start;
        return shiftDate >= monthStart && shiftDate <= monthEnd;
      }).reduce((total, signup) => {
        return total + differenceInHours(signup.shift.end, signup.shift.start);
      }, 0)
    });
  }

  // Chart config
  const chartConfig = {
    shifts: {
      label: "Shifts",
      color: "hsl(var(--primary))",
    },
  };

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
  const availableShiftsByDate = new Map<string, typeof availableShifts>();
  for (const shift of availableShifts) {
    const dateKey = format(shift.start, "yyyy-MM-dd");
    if (!availableShiftsByDate.has(dateKey)) {
      availableShiftsByDate.set(dateKey, []);
    }
    // Only include if shift has available spots
    const confirmedSignups = shift.signups.filter(s => s.status === "CONFIRMED").length;
    const pendingSignups = shift.signups.filter(s => s.status === "PENDING").length;
    const hasAvailableSpots = (confirmedSignups + pendingSignups) < shift.capacity;
    
    if (hasAvailableSpots) {
      availableShiftsByDate.get(dateKey)!.push(shift);
    }
  }

  function ShiftDetailsDialog({ shift, children }: { 
    shift: typeof monthShifts[0], 
    children: React.ReactNode 
  }) {
    const theme = getShiftTheme(shift.shift.shiftType.name);
    const isPastShift = shift.shift.end < now;
    
    return (
      <Dialog>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg flex items-center justify-center text-white text-lg`}>
                {theme.emoji}
              </div>
              <div>
                <div className="font-semibold">{shift.shift.shiftType.name}</div>
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
                <div>{format(shift.shift.start, "h:mm a")} - {format(shift.shift.end, "h:mm a")}</div>
                <div className="text-xs text-muted-foreground">
                  {differenceInHours(shift.shift.end, shift.shift.start)} hours
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Location</span>
              <span className="text-sm">{shift.shift.location || "To be confirmed"}</span>
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
                    const displayName = signup.user.name || 
                      `${signup.user.firstName || ""} ${signup.user.lastName || ""}`.trim() || 
                      signup.user.email;
                    const initials = (signup.user.firstName?.[0] || signup.user.name?.[0] || signup.user.email[0]).toUpperCase();
                    
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
                          <div className="text-sm font-medium">{displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {signup.status === "CONFIRMED" ? "Confirmed" : "Pending"}
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
                  <div className="text-sm font-medium mb-2">Add to Calendar</div>
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
                            <a href={urls.google} target="_blank" rel="noopener noreferrer">
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
                            <a href={urls.outlook} target="_blank" rel="noopener noreferrer">
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
                            <a href={urls.ics} download={`shift-${shift.shift.id}.ics`}>
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


  function StatusBadge({ status, isPast = false }: { status: string, isPast?: boolean }) {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
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

  const prevMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
  const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              6-Month Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{completedShifts}</div>
                  <div className="text-sm text-muted-foreground">Total Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">{totalHours}</div>
                  <div className="text-sm text-muted-foreground">Hours Contributed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{upcomingShifts}</div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Monthly Shifts</div>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <RechartsBarChart data={monthsData}>
                    <XAxis 
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="shifts" fill="var(--color-shifts)" radius={4} />
                  </RechartsBarChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Shift Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shiftTypeData.length > 0 ? (
              <div className="space-y-4">
                <ChartContainer 
                  config={{
                    count: {
                      label: "Count",
                    }
                  }} 
                  className="h-[200px]"
                >
                  <RechartsPieChart>
                    <Pie
                      data={shiftTypeData}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {shiftTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPieChart>
                </ChartContainer>
                
                {/* Legend */}
                <div className="space-y-2">
                  {shiftTypeData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm font-medium">{item.emoji}</span>
                      <span className="text-sm truncate flex-1">{item.type}</span>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No completed shifts yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(viewMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link href={{
                  pathname: "/shifts/mine",
                  query: { 
                    month: prevMonth.getTime().toString()
                  }
                }}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              
              {/* Current Month Button - only show if not already viewing current month */}
              {viewMonth.getMonth() !== currentMonth.getMonth() || viewMonth.getFullYear() !== currentMonth.getFullYear() ? (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href="/shifts/mine">
                    Today
                  </Link>
                </Button>
              ) : null}
              
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link href={{
                  pathname: "/shifts/mine",
                  query: {
                    month: nextMonth.getTime().toString()
                  }
                }}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayShifts = shiftsByDate.get(dateKey) || [];
              const availableShifts = availableShiftsByDate.get(dateKey) || [];
              const isToday = isSameDay(day, now);
              const isPast = day < now && !isToday;
              const shift = dayShifts[0]; // Since only 1 shift per day is allowed
              
              return (
                <div
                  key={dateKey}
                  className={`h-[130px] p-2 border rounded-lg relative flex flex-col ${
                    isPast 
                      ? "bg-muted/30 border-muted"
                      : isToday 
                      ? "bg-primary/10 border-primary ring-2 ring-primary/20" 
                      : "bg-card border-border"
                  }`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isPast 
                      ? "text-muted-foreground"
                      : isToday 
                      ? "text-primary" 
                      : "text-foreground"
                  }`}>
                    <div className="flex flex-col items-center">
                      <span>{format(day, "d")}</span>
                      {isToday && (
                        <span className="text-xs font-medium">Today</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    {shift ? (
                      <ShiftDetailsDialog shift={shift}>
                        <div className="w-full">
                          {(() => {
                            const theme = getShiftTheme(shift.shift.shiftType.name);
                            return (
                              <div
                                className={`text-xs p-2 rounded cursor-pointer text-white ${
                                  isPast 
                                    ? `bg-gradient-to-r ${theme.gradient} opacity-60`
                                    : `bg-gradient-to-r ${theme.gradient}`
                                }`}
                              >
                                <div className="text-center space-y-1">
                                  <div className="text-base">{theme.emoji}</div>
                                  <div className="font-medium">
                                    {format(shift.shift.start, "HH:mm")}
                                  </div>
                                  <div className="text-xs opacity-90 truncate">
                                    {shift.shift.shiftType.name}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </ShiftDetailsDialog>
                    ) : (
                      <div className="text-center text-xs">
                        {isPast ? (
                          <span className="text-muted-foreground">Past</span>
                        ) : availableShifts.length > 0 ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            className="h-6 px-2 text-xs"
                          >
                            <Link href="/shifts">
                              {availableShifts.length} available
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">No shifts</span>
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/shifts">
            <Calendar className="h-4 w-4 mr-2" />
            Browse Available Shifts
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/profile">
            <UserCheck className="h-4 w-4 mr-2" />
            Update Profile
          </Link>
        </Button>
      </div>
    </PageContainer>
  );
}