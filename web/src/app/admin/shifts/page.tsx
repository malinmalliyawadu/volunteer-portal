import { prisma } from "@/lib/prisma";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  addHours,
} from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Star,
  Award,
  MoreVertical,
  Edit,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageContainer } from "@/components/page-container";
import { AdminPageWrapper } from "@/components/admin-page-wrapper";
import { ShiftLocationSelector } from "@/components/shift-location-selector";
import { VolunteerActions } from "@/components/volunteer-actions";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;
type LocationOption = (typeof LOCATIONS)[number];

function getStaffingStatus(confirmed: number, capacity: number) {
  const percentage = (confirmed / capacity) * 100;
  if (percentage >= 100)
    return { color: "bg-green-500", text: "Fully Staffed", icon: CheckCircle2 };
  if (percentage >= 75)
    return { color: "bg-green-400", text: "Well Staffed", icon: CheckCircle2 };
  if (percentage >= 50)
    return { color: "bg-yellow-500", text: "Needs More", icon: AlertCircle };
  if (percentage >= 25)
    return {
      color: "bg-orange-500",
      text: "Understaffed",
      icon: AlertTriangle,
    };
  return { color: "bg-red-500", text: "Critical", icon: AlertTriangle };
}

export default async function AdminShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/shifts");
  }
  if (role !== "ADMIN") {
    redirect("/shifts");
  }

  const params = await searchParams;

  // Handle success messages
  const created = params.created;
  const updated = params.updated;
  const deleted = params.deleted;

  // Get date from params or default to today
  const dateParam = Array.isArray(params.date) ? params.date[0] : params.date;
  let selectedDate: Date;
  try {
    selectedDate = dateParam ? parseISO(dateParam) : new Date();
  } catch {
    selectedDate = new Date();
  }
  const dateString = format(selectedDate, "yyyy-MM-dd");

  // Get location from params or default to first location
  const locationParam = Array.isArray(params.location)
    ? params.location[0]
    : params.location;
  const selectedLocation: LocationOption = LOCATIONS.includes(
    locationParam as LocationOption
  )
    ? (locationParam as LocationOption)
    : LOCATIONS[0];

  // Calculate previous and next dates
  const prevDate = format(subDays(selectedDate, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(selectedDate, 1), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = dateString === today;
  const isPast = selectedDate < new Date() && !isToday;

  // Fetch shifts for the selected date and location
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  const shifts = await prisma.shift.findMany({
    where: {
      location: selectedLocation,
      start: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: { start: "asc" },
    include: {
      shiftType: true,
      signups: {
        where: {
          status: {
            in: ["CONFIRMED", "PENDING", "REGULAR_PENDING"],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              volunteerGrade: true,
            },
          },
        },
      },
      groupBookings: {
        include: {
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

  type ShiftWithAll = (typeof shifts)[number];

  // Calculate total stats
  const totalCapacity = shifts.reduce((sum, s) => sum + s.capacity, 0);
  const totalConfirmed = shifts.reduce((sum, s) => {
    const individualConfirmed = s.signups.filter(
      (su) => su.status === "CONFIRMED"
    ).length;
    const groupConfirmed = s.groupBookings.reduce(
      (gSum, gb) =>
        gSum + gb.signups.filter((gsu) => gsu.status === "CONFIRMED").length,
      0
    );
    return sum + individualConfirmed + groupConfirmed;
  }, 0);
  const totalPending = shifts.reduce((sum, s) => {
    const individualPending = s.signups.filter(
      (su) => su.status === "PENDING" || su.status === "REGULAR_PENDING"
    ).length;
    const groupPending = s.groupBookings.reduce(
      (gSum, gb) =>
        gSum + gb.signups.filter((gsu) => gsu.status === "PENDING").length,
      0
    );
    return sum + individualPending + groupPending;
  }, 0);

  // Helper function to get volunteer grade color and icon
  function getGradeInfo(grade: string | null | undefined) {
    switch (grade) {
      case "PINK":
        return {
          color: "bg-pink-100 text-pink-700",
          icon: Award,
          label: "Pink",
        };
      case "YELLOW":
        return {
          color: "bg-yellow-100 text-yellow-700",
          icon: Star,
          label: "Yellow",
        };
      case "GREEN":
        return {
          color: "bg-green-100 text-green-700",
          icon: Shield,
          label: "Green",
        };
      default:
        return { color: "bg-gray-100 text-gray-600", icon: null, label: "New" };
    }
  }

  return (
    <AdminPageWrapper
      title="Restaurant Schedule"
      description={`${format(
        selectedDate,
        "EEEE, MMMM d, yyyy"
      )} - ${selectedLocation}`}
      actions={
        <Button
          asChild
          size="sm"
          className="btn-primary gap-2"
          data-testid="create-shift-button"
        >
          <Link href="/admin/shifts/new">
            <Plus className="h-4 w-4" />
            Add Shift
          </Link>
        </Button>
      }
    >
      <PageContainer testid="admin-shifts-page">
        {/* Success Messages */}
        {created && (
          <Alert
            className="mb-6 border-green-200 bg-green-50"
            data-testid="shift-created-message"
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {created === "1"
                ? "Shift created successfully!"
                : `${created} shifts created successfully!`}
            </AlertDescription>
          </Alert>
        )}

        {updated && (
          <Alert
            className="mb-6 border-green-200 bg-green-50"
            data-testid="shift-updated-message"
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Shift updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {deleted && (
          <Alert
            className="mb-6 border-green-200 bg-green-50"
            data-testid="shift-deleted-message"
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Shift deleted successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation Controls */}
        <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Date Navigation */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Date:</span>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  data-testid="prev-date-button"
                >
                  <Link
                    href={`/admin/shifts?date=${prevDate}&location=${selectedLocation}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="px-3 py-2 bg-slate-50 rounded border text-center min-w-[160px]">
                  <div className="text-sm text-slate-900 font-medium">
                    {format(selectedDate, "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-slate-600">
                    {format(selectedDate, "EEEE")}
                    {isToday && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Today
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  data-testid="next-date-button"
                >
                  <Link
                    href={`/admin/shifts?date=${nextDate}&location=${selectedLocation}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Location Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Location:</span>
              <ShiftLocationSelector
                selectedLocation={selectedLocation}
                dateString={dateString}
                locations={LOCATIONS}
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                asChild
                variant={isToday ? "default" : "outline"}
                size="sm"
                data-testid="today-button"
              >
                <Link
                  href={`/admin/shifts?date=${today}&location=${selectedLocation}`}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Today
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* All Shifts */}
        {shifts.length === 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
            <p className="text-base font-medium text-orange-800 mb-1">
              No shifts scheduled
            </p>
            <p className="text-sm text-orange-700 mb-4">
              There are no shifts for this day and location
            </p>
            <Button asChild size="sm" className="btn-primary">
              <Link href="/admin/shifts/new">
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Shift
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {shifts.map((shift) => {
                  const confirmed = shift.signups.filter(
                    (s) => s.status === "CONFIRMED"
                  ).length;
                  const pending = shift.signups.filter(
                    (s) =>
                      s.status === "PENDING" || s.status === "REGULAR_PENDING"
                  ).length;
                  const staffingStatus = getStaffingStatus(
                    confirmed,
                    shift.capacity
                  );

                  // Count volunteer grades
                  const gradeCount = {
                    pink: shift.signups.filter(
                      (s) => s.user.volunteerGrade === "PINK"
                    ).length,
                    yellow: shift.signups.filter(
                      (s) => s.user.volunteerGrade === "YELLOW"
                    ).length,
                    green: shift.signups.filter(
                      (s) => s.user.volunteerGrade === "GREEN"
                    ).length,
                    new: shift.signups.filter(
                      (s) => !s.user.volunteerGrade
                    ).length,
                  };

                  return (
                    <Card
                      key={shift.id}
                      className={`hover:shadow-lg transition-all duration-200 border-2 ${
                          staffingStatus.color === "bg-green-500"
                            ? "border-green-300 hover:border-green-400"
                            : staffingStatus.color === "bg-green-400"
                            ? "border-green-200 hover:border-green-300"
                            : staffingStatus.color === "bg-yellow-500"
                            ? "border-yellow-200 hover:border-yellow-300"
                            : staffingStatus.color === "bg-orange-500"
                            ? "border-orange-200 hover:border-orange-300"
                            : "border-red-200 hover:border-red-300"
                        } h-full`}
                      >
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-slate-900 mb-1">
                                {shift.shiftType.name}
                              </h3>
                              <p className="text-sm text-slate-700 font-medium flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {format(shift.start, "h:mm a")} -{" "}
                                {format(shift.end, "h:mm a")}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                className={`${staffingStatus.color} text-white text-sm px-3 py-1.5 font-bold`}
                              >
                                {confirmed}/{shift.capacity}
                              </Badge>
                              <p className="text-xs text-slate-600 mt-1">
                                {staffingStatus.text}
                              </p>
                            </div>
                          </div>

                          {/* Grade Summary Bar */}
                          {shift.signups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {gradeCount.pink > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium">
                                  <Award className="h-3 w-3" />
                                  {gradeCount.pink}
                                </div>
                              )}
                              {gradeCount.yellow > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                  <Star className="h-3 w-3" />
                                  {gradeCount.yellow}
                                </div>
                              )}
                              {gradeCount.green > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  <Shield className="h-3 w-3" />
                                  {gradeCount.green}
                                </div>
                              )}
                              {gradeCount.new > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  <Users className="h-3 w-3" />
                                  {gradeCount.new} new
                                </div>
                              )}
                              {pending > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium ml-auto">
                                  <Clock className="h-3 w-3" />
                                  {pending} pending
                                </div>
                              )}
                            </div>
                          )}

                          {/* Volunteer Avatars */}
                          <div className="space-y-2">
                            {shift.signups.length === 0 ? (
                              <div className="py-6 text-center">
                                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">
                                  No volunteers yet
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Click to manage this shift
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {shift.signups.slice(0, 4).map((signup) => {
                                  const gradeInfo = getGradeInfo(
                                    signup.user.volunteerGrade
                                  );
                                  const GradeIcon = gradeInfo.icon;
                                  return (
                                    <Link
                                      key={signup.id}
                                      href={`/admin/volunteers/${signup.user.id}`}
                                      className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors min-w-0"
                                    >
                                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center shadow-md flex-shrink-0">
                                        <span className="text-xs font-bold text-white">
                                          {(signup.user.name ||
                                            signup.user
                                              .firstName)?.[0]?.toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate hover:text-blue-600 mb-1">
                                          {signup.user.name ||
                                            `${signup.user.firstName} ${signup.user.lastName}`.trim() ||
                                            "Volunteer"}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                          <div
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${gradeInfo.color} flex-shrink-0`}
                                          >
                                            {GradeIcon && (
                                              <GradeIcon className="h-3 w-3" />
                                            )}
                                            {gradeInfo.label}
                                          </div>
                                          <div className="flex-shrink-0">
                                            <VolunteerActions
                                              signupId={signup.id}
                                              currentStatus={signup.status}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}
                                {shift.signups.length > 4 && (
                                  <div className="flex items-center justify-center p-3 bg-slate-100 rounded-lg">
                                    <span className="text-sm font-medium text-slate-600">
                                      +{shift.signups.length - 4} more volunteers
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                  );
            })}
          </div>
        )}
      </PageContainer>
    </AdminPageWrapper>
  );
}
