import { prisma } from "@/lib/prisma";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignupActions } from "@/components/signup-actions";
import { FilterControls } from "@/components/filter-controls";
import { DeleteShiftDialog } from "@/components/delete-shift-dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Edit,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const role = (session?.user as { role?: "ADMIN" | "VOLUNTEER" } | undefined)
    ?.role;
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

  const [upcomingCount, pastCount, upcoming, past] = await Promise.all([
    prisma.shift.count({ where: upcomingFilter }),
    prisma.shift.count({ where: pastFilter }),
    prisma.shift.findMany({
      where: upcomingFilter,
      orderBy: { start: "asc" },
      include: { shiftType: true, signups: { include: { user: true } } },
      skip: (uPage - 1) * uSize,
      take: uSize,
    }),
    prisma.shift.findMany({
      where: pastFilter,
      orderBy: { start: "desc" },
      include: { shiftType: true, signups: { include: { user: true } } },
      skip: (pPage - 1) * pSize,
      take: pSize,
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
      if (su.status === "PENDING") pending += 1;
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
  }: {
    name: string | null;
    email: string;
    phone: string | null;
    status: "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELED";
    userId: string;
    signupId: string;
  }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 text-sm py-3 px-1 hover:bg-slate-50 rounded-lg transition-colors">
        <div className="truncate">
          <Link
            href={`/admin/volunteers/${userId}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
          >
            <User className="h-3 w-3" />
            {name ?? "(No name)"}
          </Link>
        </div>
        <div className="truncate text-slate-600">{email}</div>
        <div className="truncate text-slate-600">{phone ?? "—"}</div>
        <div>
          {status === "PENDING" && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
              Pending Approval
            </Badge>
          )}
          {status === "CONFIRMED" && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Confirmed
            </Badge>
          )}
          {status === "WAITLISTED" && (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Waitlisted
            </Badge>
          )}
          {status === "CANCELED" && (
            <Badge className="bg-gray-100 text-gray-800 border-gray-200">
              Canceled
            </Badge>
          )}
        </div>
        <div>
          <SignupActions signupId={signupId} status={status} />
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
      <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <h3 className="font-semibold text-lg text-slate-900 truncate">
                  {s.shiftType.name}
                </h3>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-3 w-3" />
                  {format(s.start, "h:mm a")} - {format(s.end, "h:mm a")}
                </div>
                {s.location && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-100 text-slate-700 border-slate-300"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {s.location}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 ml-8">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(s.start, "EEE dd MMM, yyyy")}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration: {getDurationInHours(s.start, s.end)}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-700 h-8 px-2"
                  >
                    <Link href={`/admin/shifts/${s.id}/edit`}>
                      <Edit className="h-3 w-3 mr-1" />
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
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </DeleteShiftDialog>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    ✓ {confirmed} confirmed
                  </Badge>
                  {pending > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-700 border-orange-200"
                    >
                      ⏳ {pending} pending
                    </Badge>
                  )}
                  {waitlisted > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      📋 {waitlisted} waitlisted
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  {remaining > 0 ? (
                    <span className="text-green-600 font-medium">
                      {remaining} spots remaining
                    </span>
                  ) : (
                    <span className="text-slate-500">Full</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {s.signups.length === 0 ? (
            <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>No signups yet</p>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-4">
              <div className="hidden md:grid md:grid-cols-5 md:gap-4 text-xs uppercase tracking-wide text-slate-500 font-medium pb-2 px-1">
                <div>Volunteer</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              <div className="space-y-1">
                {s.signups
                  .slice()
                  .sort(
                    (
                      a: ShiftWithAll["signups"][number],
                      b: ShiftWithAll["signups"][number]
                    ) => {
                      type Status = ShiftWithAll["signups"][number]["status"];
                      const order: Record<Status, number> = {
                        PENDING: 0,
                        CONFIRMED: 1,
                        WAITLISTED: 2,
                        CANCELED: 3,
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
                    />
                  ))}
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

    return (
      <div className="flex items-center gap-2">
        {isFirst ? (
          <Button variant="outline" size="sm" disabled className="opacity-50">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={{ pathname: basePath, query: query(page - 1) }}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Link>
          </Button>
        )}
        <span className="text-sm text-slate-600 px-3">
          Page {page} of {totalPages}
        </span>
        {isLast ? (
          <Button variant="outline" size="sm" disabled className="opacity-50">
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        <PageHeader
          title="Admin · Shifts"
          description="Manage volunteer shifts and view signup details"
          actions={
            <Button asChild size="sm" className="btn-primary gap-2">
              <Link href="/admin/shifts/new">
                <Plus className="h-4 w-4" />
                Create shift
              </Link>
            </Button>
          }
        />

        {/* Success Messages */}
        {created && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {created === "1"
                ? "Shift created successfully!"
                : `${created} shifts created successfully!`}
            </AlertDescription>
          </Alert>
        )}

        {updated && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Shift updated successfully!
              {isPastEdit && " (Note: This was a past shift)"}
            </AlertDescription>
          </Alert>
        )}

        {deleted && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Shift deleted successfully! All associated signups have been
              removed.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="mb-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5 text-slate-600" />
                  Filters
                </CardTitle>
                {(selectedLocation || dateFrom || dateTo) && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-700 gap-1"
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

        {/* Upcoming Shifts */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                Upcoming Shifts
              </h2>
              <Badge
                variant="outline"
                className="border-blue-200 text-blue-700"
              >
                {upcomingCount}
              </Badge>
            </div>
            <Pagination
              page={uPage}
              totalPages={uTotalPages}
              size={uSize}
              type="u"
            />
          </div>
          {upcoming.length === 0 ? (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="text-center py-12">
                <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No upcoming shifts
                </h3>
                <p className="text-slate-500">
                  {selectedLocation || dateFrom || dateTo
                    ? "No upcoming shifts found matching your filters"
                    : "There are no upcoming shifts scheduled"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {upcoming.map((s: ShiftWithAll) => (
                <ShiftCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </section>

        {/* Historical Shifts */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                Historical Shifts
              </h2>
              <Badge
                variant="outline"
                className="border-slate-300 text-slate-600"
              >
                {pastCount}
              </Badge>
            </div>
            <Pagination
              page={pPage}
              totalPages={pTotalPages}
              size={pSize}
              type="p"
            />
          </div>
          {past.length === 0 ? (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="text-center py-12">
                <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No historical shifts
                </h3>
                <p className="text-slate-500">
                  {selectedLocation || dateFrom || dateTo
                    ? "No past shifts found matching your filters"
                    : "There are no past shifts to display"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {past.map((s: ShiftWithAll) => (
                <ShiftCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
