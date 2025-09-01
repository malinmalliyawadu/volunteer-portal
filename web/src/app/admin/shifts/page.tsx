import { prisma } from "@/lib/prisma";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignupActionsWrapper } from "@/components/signup-actions-wrapper";
import { FilterControls } from "@/components/filter-controls";
import { DeleteShiftDialog } from "@/components/delete-shift-dialog";
import { GroupBookingAdminActions } from "@/components/group-booking-admin-actions";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Edit,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageContainer } from "@/components/page-container";
import { VolunteerGradeBadge } from "@/components/volunteer-grade-badge";
import { type VolunteerGrade } from "@prisma/client";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;

type LocationOption = (typeof LOCATIONS)[number];

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
  const now = new Date();

  // Handle success messages
  const created = params.created;
  const updated = params.updated;
  const deleted = params.deleted;
  const isPastEdit = params.past;

  // Get location filter from search params
  const rawLocation = Array.isArray(params.location)
    ? params.location[0]
    : params.location;
  const selectedLocation: LocationOption | undefined = LOCATIONS.includes(
    (rawLocation as LocationOption) ?? ("" as LocationOption)
  )
    ? (rawLocation as LocationOption)
    : undefined;

  // Get date filters from search params
  const rawDateFrom = Array.isArray(params.dateFrom)
    ? params.dateFrom[0]
    : params.dateFrom;
  const rawDateTo = Array.isArray(params.dateTo)
    ? params.dateTo[0]
    : params.dateTo;

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  try {
    if (rawDateFrom) {
      dateFrom = startOfDay(parseISO(rawDateFrom));
    }
    if (rawDateTo) {
      dateTo = endOfDay(parseISO(rawDateTo));
    }
  } catch (error) {
    // Invalid date format, ignore
    console.warn("Invalid date format in search params:", error);
  }

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

  // Create filters for queries
  const locationFilter = selectedLocation ? { location: selectedLocation } : {};
  const dateFilter: {
    start?: {
      gte?: Date;
      lte?: Date;
      lt?: Date;
    };
  } = {};

  if (dateFrom && dateTo) {
    dateFilter.start = {
      gte: dateFrom,
      lte: dateTo,
    };
  } else if (dateFrom) {
    dateFilter.start = {
      gte: dateFrom,
    };
  } else if (dateTo) {
    dateFilter.start = {
      lte: dateTo,
    };
  }

  const upcomingFilter = {
    start: { gte: now },
    ...locationFilter,
    ...dateFilter,
  };
  const pastFilter = { start: { lt: now }, ...locationFilter, ...dateFilter };

  // Create filter for group bookings
  const groupBookingFilter: {
    shift?: {
      start?: {
        gte?: Date;
        lte?: Date;
        lt?: Date;
      };
      location?: string;
    };
  } = {};

  if (selectedLocation || dateFrom || dateTo) {
    groupBookingFilter.shift = {
      ...(selectedLocation && { location: selectedLocation }),
      ...dateFilter,
    };
  }

  const [upcomingCount, pastCount, upcoming, past, allGroupBookings] =
    await Promise.all([
      prisma.shift.count({ where: upcomingFilter }),
      prisma.shift.count({ where: pastFilter }),
      prisma.shift.findMany({
        where: upcomingFilter,
        orderBy: { start: "asc" },
        include: {
          shiftType: true,
          signups: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  volunteerGrade: true,
                },
              },
              regularSignup: true,
            },
          },
          groupBookings: {
            include: {
              leader: { select: { id: true, name: true, email: true } },
              signups: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                      volunteerGrade: true,
                    },
                  },
                },
              },
              invitations: true,
            },
          },
        },
        skip: (uPage - 1) * uSize,
        take: uSize,
      }),
      prisma.shift.findMany({
        where: pastFilter,
        orderBy: { start: "desc" },
        include: {
          shiftType: true,
          signups: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  volunteerGrade: true,
                },
              },
              regularSignup: true,
            },
          },
          groupBookings: {
            include: {
              leader: { select: { id: true, name: true, email: true } },
              signups: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                      volunteerGrade: true,
                    },
                  },
                },
              },
              invitations: true,
            },
          },
        },
        skip: (pPage - 1) * pSize,
        take: pSize,
      }),
      // Fetch all group bookings separately for the dedicated section
      prisma.groupBooking.findMany({
        where: groupBookingFilter,
        include: {
          shift: {
            include: { shiftType: true },
          },
          leader: { select: { id: true, name: true, email: true } },
          signups: {
            include: { user: true },
          },
          invitations: true,
        },
        orderBy: [
          { status: "asc" }, // PENDING first, then CONFIRMED, etc.
          { createdAt: "desc" },
        ],
      }),
    ]);

  type ShiftWithAll = (typeof upcoming)[number];

  const uTotalPages = Math.max(1, Math.ceil(upcomingCount / uSize));
  const pTotalPages = Math.max(1, Math.ceil(pastCount / pSize));

  function counts(s: ShiftWithAll) {
    let confirmed = 0;
    let pending = 0;
    let waitlisted = 0;
    for (const su of s.signups) {
      if (su.status === "CONFIRMED") confirmed += 1;
      if (su.status === "PENDING" || su.status === "REGULAR_PENDING")
        pending += 1;
      if (su.status === "WAITLISTED") waitlisted += 1;
      // Note: CANCELED signups are excluded from all counts
    }
    return {
      confirmed,
      pending,
      waitlisted,
      remaining: Math.max(0, s.capacity - confirmed - pending),
    };
  }

  function SignupRow({
    name,
    email,
    phone,
    status,
    userId,
    signupId,
    isAutoSignup,
    volunteerGrade,
  }: {
    name: string | null;
    email: string;
    phone: string | null;
    status:
      | "PENDING"
      | "CONFIRMED"
      | "WAITLISTED"
      | "CANCELED"
      | "NO_SHOW"
      | "REGULAR_PENDING";
    userId: string;
    signupId: string;
    isAutoSignup?: boolean;
    volunteerGrade?: VolunteerGrade;
  }) {
    return (
      <div
        className="group grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5 md:gap-4 text-sm py-4 px-3 sm:px-4 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100"
        data-testid={`signup-row-${signupId}`}
      >
        <div className="flex items-center gap-2 sm:col-span-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
            {(name ?? email)?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Link
              href={`/admin/volunteers/${userId}`}
              className="font-medium text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1 min-w-0"
            >
              <span className="truncate">{name ?? "(No name)"}</span>
            </Link>
            {volunteerGrade && (
              <VolunteerGradeBadge grade={volunteerGrade} size="sm" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-600 min-w-0">
          <span className="sm:hidden text-xs text-slate-500">Email:</span>
          <span className="truncate">{email}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 min-w-0">
          <span className="sm:hidden text-xs text-slate-500">Phone:</span>
          <span className="truncate">{phone ?? "—"}</span>
        </div>
        <div className="md:col-span-2">
          <SignupActionsWrapper
            signupId={signupId}
            initialStatus={status}
            isAutoSignup={isAutoSignup}
          />
        </div>
      </div>
    );
  }

  function ShiftCard({ s }: { s: ShiftWithAll }) {
    const { confirmed, pending, waitlisted, remaining } = counts(s);

    async function deleteShift() {
      "use server";

      try {
        // First delete all signups for this shift
        await prisma.signup.deleteMany({
          where: { shiftId: s.id },
        });

        // Then delete the shift
        await prisma.shift.delete({
          where: { id: s.id },
        });
      } catch {
        // Handle error - could redirect to error page or show toast
        console.error("Failed to delete shift");
      }

      redirect("/admin/shifts?deleted=1");
    }

    return (
      <Card
        className="group shadow-sm border-slate-200 hover:shadow-lg transition-all duration-300 hover:border-slate-300"
        data-testid={`shift-card-${s.id}`}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-bold text-lg sm:text-xl text-slate-900 mb-1"
                    data-testid={`shift-name-${s.id}`}
                  >
                    {s.shiftType.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                    <div
                      className="flex items-center gap-1.5 text-slate-600"
                      data-testid={`shift-date-${s.id}`}
                    >
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium">
                        {format(s.start, "EEE, MMM d, yyyy")}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-slate-600"
                      data-testid={`shift-time-${s.id}`}
                    >
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {format(s.start, "h:mm a")} - {format(s.end, "h:mm a")}
                      </span>
                      <span className="text-slate-400">
                        ({getDurationInHours(s.start, s.end)})
                      </span>
                    </div>
                  </div>
                  {s.location && (
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className="bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-200 font-medium"
                        data-testid={`shift-location-${s.id}`}
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        {s.location}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-row sm:flex-col gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                  data-testid={`edit-shift-${s.id}`}
                >
                  <Link href={`/admin/shifts/${s.id}/edit`}>
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Link>
                </Button>
                <DeleteShiftDialog
                  shiftId={s.id}
                  shiftName={s.shiftType.name}
                  shiftDate={format(s.start, "EEEE, MMMM d, yyyy")}
                  hasSignups={
                    s.signups.filter(
                      (signup: ShiftWithAll["signups"][number]) =>
                        signup.status !== "CANCELED"
                    ).length > 0
                  }
                  signupCount={
                    s.signups.filter(
                      (signup: ShiftWithAll["signups"][number]) =>
                        signup.status !== "CANCELED"
                    ).length
                  }
                  onDelete={deleteShift}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                    data-testid={`delete-shift-${s.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </DeleteShiftDialog>
              </div>
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                <Badge
                  variant="outline"
                  className="bg-gradient-to-r from-emerald-50 to-green-50 text-green-700 border-green-200 font-medium px-2.5 py-1"
                  data-testid={`confirmed-signups-${s.id}`}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  {confirmed} confirmed
                </Badge>
                {pending > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700 border-orange-200 font-medium px-2.5 py-1"
                    data-testid={`pending-signups-${s.id}`}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {pending} pending
                  </Badge>
                )}
                {waitlisted > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 font-medium px-2.5 py-1"
                    data-testid={`waitlisted-signups-${s.id}`}
                  >
                    <Users className="h-3.5 w-3.5 mr-1" />
                    {waitlisted} waitlist
                  </Badge>
                )}
              </div>
              <div
                className="text-sm font-medium text-center sm:text-right"
                data-testid={`shift-capacity-${s.id}`}
              >
                {remaining > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {remaining} spots available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                    Fully booked
                  </span>
                )}
              </div>
            </div>
          </div>

          {s.signups.filter((signup) => !signup.groupBookingId).length === 0 ? (
            <div
              className="text-center py-8 sm:py-10 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-100"
              data-testid={`no-signups-${s.id}`}
            >
              <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-white shadow-sm flex items-center justify-center">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">
                No individual signups yet
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Individual volunteers will appear here once they sign up
              </p>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-4">
              {/* Individual Signups Section */}
              <div data-testid={`individual-signups-${s.id}`}>
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Individual Signups
                    <span className="text-xs font-normal text-slate-500">
                      (
                      {
                        s.signups.filter((signup) => !signup.groupBookingId)
                          .length
                      }{" "}
                      individuals)
                    </span>
                  </h4>
                </div>
                <div className="hidden md:grid md:grid-cols-5 md:gap-4 text-xs uppercase tracking-wider text-slate-500 font-semibold pb-3 px-4 border-b border-slate-100">
                  <div>Volunteer</div>
                  <div>Email</div>
                  <div>Phone</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                <div className="space-y-1.5 mt-2">
                  {s.signups
                    .filter((signup) => !signup.groupBookingId)
                    .slice()
                    .sort(
                      (
                        a: ShiftWithAll["signups"][number],
                        b: ShiftWithAll["signups"][number]
                      ) => {
                        type Status = ShiftWithAll["signups"][number]["status"];
                        const order: Record<Status, number> = {
                          PENDING: 0,
                          REGULAR_PENDING: 0,
                          CONFIRMED: 1,
                          WAITLISTED: 2,
                          CANCELED: 3,
                          NO_SHOW: 4,
                        };
                        const ao = order[a.status];
                        const bo = order[b.status];
                        if (ao !== bo) return ao - bo;
                        return (a.user.name ?? a.user.email).localeCompare(
                          b.user.name ?? b.user.email
                        );
                      }
                    )
                    .map((su: ShiftWithAll["signups"][number]) => (
                      <SignupRow
                        key={su.id}
                        name={su.user.name}
                        email={su.user.email}
                        phone={su.user.phone}
                        status={su.status}
                        userId={su.user.id}
                        signupId={su.id}
                        isAutoSignup={!!su.regularSignup}
                        volunteerGrade={su.user.volunteerGrade}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function Pagination({
    page,
    totalPages,
    size,
    type,
  }: {
    page: number;
    totalPages: number;
    size: number;
    type: "u" | "p";
  }) {
    const isFirst = page <= 1;
    const isLast = page >= totalPages;
    const basePath = "/admin/shifts";
    const query = (nextPage: number) => {
      const baseQuery =
        type === "u"
          ? {
              uPage: String(nextPage),
              uSize: String(size),
              pPage: String(pPage),
              pSize: String(pSize),
            }
          : {
              pPage: String(nextPage),
              pSize: String(size),
              uPage: String(uPage),
              uSize: String(uSize),
            };

      return {
        ...baseQuery,
        ...(selectedLocation && { location: selectedLocation }),
        ...(rawDateFrom && { dateFrom: rawDateFrom }),
        ...(rawDateTo && { dateTo: rawDateTo }),
      };
    };

    const typePrefix = type === "u" ? "upcoming" : "historical";

    return (
      <div className="flex items-center gap-2">
        {isFirst ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="opacity-50"
            data-testid={`${typePrefix}-prev-button`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            size="sm"
            data-testid={`${typePrefix}-prev-button`}
          >
            <Link href={{ pathname: basePath, query: query(page - 1) }}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Link>
          </Button>
        )}
        <span
          className="text-sm text-slate-600 px-3"
          data-testid={`${typePrefix}-page-info`}
        >
          Page {page} of {totalPages}
        </span>
        {isLast ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="opacity-50"
            data-testid={`${typePrefix}-next-button`}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            size="sm"
            data-testid={`${typePrefix}-next-button`}
          >
            <Link href={{ pathname: basePath, query: query(page + 1) }}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <PageContainer testid="admin-shifts-page">
      <PageHeader
        title="Admin · Shifts"
        description="Manage volunteer shifts and view signup details"
        actions={
          <Button
            asChild
            size="sm"
            className="btn-primary gap-2"
            data-testid="create-shift-button"
          >
            <Link href="/admin/shifts/new">
              <Plus className="h-4 w-4" />
              Create shift
            </Link>
          </Button>
        }
      />

      {/* Success Messages */}
      {created && (
        <Alert
          className="mb-6 border-green-200 bg-green-50"
          data-testid="shift-created-message"
        >
          <CheckCircle className="h-4 w-4 text-green-600" />
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
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Shift updated successfully!
            {isPastEdit && " (Note: This was a past shift)"}
          </AlertDescription>
        </Alert>
      )}

      {deleted && (
        <Alert
          className="mb-6 border-green-200 bg-green-50"
          data-testid="shift-deleted-message"
        >
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Shift deleted successfully! All associated signups have been
            removed.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="mb-8" data-testid="filters-section">
        <Card className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Filter className="h-4 w-4 text-white" />
                </div>
                <span className="text-slate-800">Filters</span>
              </CardTitle>
              {(selectedLocation || dateFrom || dateTo) && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-700 gap-1"
                  data-testid="clear-filters-button"
                >
                  <Link href="/admin/shifts">
                    <X className="h-3 w-3" />
                    Clear all filters
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FilterControls
              selectedLocation={selectedLocation}
              rawDateFrom={rawDateFrom}
              rawDateTo={rawDateTo}
              locations={LOCATIONS}
            />
          </CardContent>
        </Card>
      </div>

      {/* Group Bookings Section */}
      {allGroupBookings.length > 0 && (
        <section className="mb-12" data-testid="group-bookings-section">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
              Group Bookings
            </h2>
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200 font-semibold px-2.5 py-1"
            >
              {allGroupBookings.length}
            </Badge>
          </div>

          <div className="grid gap-4" data-testid="group-bookings-list">
            {allGroupBookings.map((groupBooking) => {
              const pendingInvites = groupBooking.invitations.filter(
                (inv) => inv.status === "PENDING"
              ).length;
              const hasPendingInvitations = pendingInvites > 0;
              const hasIncompleteMembers = groupBooking.signups.some(
                (signup) => {
                  const user = signup.user;
                  const hasBasicInfo =
                    user.firstName && user.lastName && user.phone;
                  const hasEmergencyContact =
                    user.emergencyContactName && user.emergencyContactPhone;
                  const hasAgreements =
                    user.volunteerAgreementAccepted &&
                    user.healthSafetyPolicyAccepted;
                  const isProfileComplete =
                    user.profileCompleted ||
                    (hasBasicInfo && hasEmergencyContact && hasAgreements);
                  return !isProfileComplete;
                }
              );

              return (
                <Card
                  key={groupBooking.id}
                  className="group shadow-sm border-purple-200 hover:shadow-lg transition-all duration-300 hover:border-purple-300 bg-gradient-to-r from-purple-50/30 to-pink-50/30"
                  data-testid={`group-booking-card-${groupBooking.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-xl text-slate-900 truncate">
                                {groupBooking.name}
                              </h3>
                              <Badge
                                className={`${
                                  groupBooking.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : groupBooking.status === "CONFIRMED"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : groupBooking.status === "PARTIAL"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : groupBooking.status === "WAITLISTED"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }`}
                              >
                                {groupBooking.status.toLowerCase()}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-500" />
                                <span className="text-slate-600">
                                  Leader:{" "}
                                  <span className="font-medium text-slate-900">
                                    {groupBooking.leader.name ||
                                      groupBooking.leader.email}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                <span className="text-slate-600">
                                  <span className="font-medium text-slate-900">
                                    {groupBooking.shift.shiftType.name}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-500" />
                                <span className="text-slate-600">
                                  <span className="font-medium text-slate-900">
                                    {format(
                                      groupBooking.shift.start,
                                      "MMM d, h:mm a"
                                    )}
                                  </span>
                                </span>
                              </div>

                              {groupBooking.shift.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-slate-500" />
                                  <span className="text-slate-600">
                                    <span className="font-medium text-slate-900">
                                      {groupBooking.shift.location}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>

                            {groupBooking.description && (
                              <p className="text-sm text-slate-600 italic mt-3 max-w-md">
                                &quot;{groupBooking.description}&quot;
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2 mt-4">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {groupBooking.signups.length} members
                              </Badge>
                              {pendingInvites > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-50 text-yellow-700 border-yellow-200"
                                >
                                  {pendingInvites} pending invites
                                </Badge>
                              )}
                              {hasIncompleteMembers && (
                                <Badge
                                  variant="outline"
                                  className="bg-orange-50 text-orange-700 border-orange-200"
                                >
                                  Incomplete profiles
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <GroupBookingAdminActions
                          groupBookingId={groupBooking.id}
                          status={groupBooking.status}
                          groupName={groupBooking.name}
                          hasIncompleteMembers={hasIncompleteMembers}
                          hasPendingInvitations={hasPendingInvitations}
                        />
                      </div>
                    </div>

                    {/* Group Members Preview */}
                    <div className="border-t border-purple-100 pt-4 mt-6">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Members ({groupBooking.signups.length}){" "}
                        {pendingInvites > 0 && (
                          <span className="text-amber-600">
                            + {pendingInvites} pending
                          </span>
                        )}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {/* Current Members (Signups) */}
                        {groupBooking.signups
                          .slice()
                          .sort((a, b) => {
                            // Leader first, then by status, then by name
                            if (a.userId === groupBooking.leaderId) return -1;
                            if (b.userId === groupBooking.leaderId) return 1;

                            const statusOrder = {
                              PENDING: 0,
                              CONFIRMED: 1,
                              WAITLISTED: 2,
                              CANCELED: 3,
                            };
                            const aOrder =
                              statusOrder[a.status as keyof typeof statusOrder];
                            const bOrder =
                              statusOrder[b.status as keyof typeof statusOrder];
                            if (aOrder !== bOrder) return aOrder - bOrder;

                            return (a.user.name ?? a.user.email).localeCompare(
                              b.user.name ?? b.user.email
                            );
                          })
                          .map((signup) => (
                            <div
                              key={signup.id}
                              className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                            >
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {(signup.user.name ??
                                  signup.user.email)?.[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <Link
                                    href={`/admin/volunteers/${signup.user.id}`}
                                    className="text-sm font-medium text-slate-900 hover:text-purple-600 transition-colors truncate"
                                  >
                                    {signup.user.name ?? "(No name)"}
                                  </Link>
                                  {signup.userId === groupBooking.leaderId && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      Leader
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {signup.user.email}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  signup.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : signup.status === "CONFIRMED"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : signup.status === "WAITLISTED"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }`}
                              >
                                {signup.status.toLowerCase()}
                              </Badge>
                            </div>
                          ))}

                        {/* Pending Invitations */}
                        {groupBooking.invitations
                          .filter(
                            (invitation) => invitation.status === "PENDING"
                          )
                          .map((invitation) => (
                            <div
                              key={invitation.id}
                              className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-300 transition-colors"
                            >
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {invitation.email[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-slate-900 truncate">
                                    {invitation.email}
                                  </span>
                                </div>
                                <div className="text-xs text-amber-600">
                                  Invitation sent{" "}
                                  {new Date(
                                    invitation.createdAt
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs bg-amber-100 text-amber-700 border-amber-300"
                              >
                                awaiting response
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Shifts */}
      <section className="mb-12" data-testid="upcoming-shifts-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Upcoming Shifts
            </h2>
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-1"
            >
              {upcomingCount}
            </Badge>
          </div>
          <div data-testid="upcoming-pagination">
            <Pagination
              page={uPage}
              totalPages={uTotalPages}
              size={uSize}
              type="u"
            />
          </div>
        </div>
        {upcoming.length === 0 ? (
          <Card className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm">
            <CardContent
              className="text-center py-16"
              data-testid="no-upcoming-shifts-message"
            >
              <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center shadow-inner">
                <Calendar className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                No upcoming shifts
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                {selectedLocation || dateFrom || dateTo
                  ? "No upcoming shifts found matching your filters. Try adjusting your search criteria."
                  : "There are no upcoming shifts scheduled at the moment"}
              </p>
              <Button asChild className="mt-6" size="sm">
                <Link href="/admin/shifts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create a shift
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6" data-testid="upcoming-shifts-list">
            {upcoming.map((s: ShiftWithAll) => (
              <ShiftCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>

      {/* Historical Shifts */}
      <section data-testid="historical-shifts-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Historical Shifts
            </h2>
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-300 font-semibold px-2.5 py-1"
            >
              {pastCount}
            </Badge>
          </div>
          <div data-testid="historical-pagination">
            <Pagination
              page={pPage}
              totalPages={pTotalPages}
              size={pSize}
              type="p"
            />
          </div>
        </div>
        {past.length === 0 ? (
          <Card className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm">
            <CardContent
              className="text-center py-16"
              data-testid="no-historical-shifts-message"
            >
              <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center shadow-inner">
                <Clock className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                No historical shifts
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                {selectedLocation || dateFrom || dateTo
                  ? "No past shifts found matching your filters. Try adjusting your search criteria."
                  : "There are no past shifts to display yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6" data-testid="historical-shifts-list">
            {past.map((s: ShiftWithAll) => (
              <ShiftCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
