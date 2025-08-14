import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

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
      include: { shift: { include: { shiftType: true } } },
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
      include: { shift: { include: { shiftType: true } } },
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
    <div className="min-h-screen" data-testid="my-shifts-page">
      <div className="max-w-6xl mx-auto py-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
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
                  className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  data-testid={`upcoming-shift-${su.id}`}
                >
                  <CardContent className="">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <CalendarCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3
                            className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate"
                            data-testid="shift-name"
                          >
                            {su.shift.shiftType.name}
                          </h3>
                          <div data-testid="shift-status">
                            <StatusBadge status={su.status} />
                          </div>
                        </div>

                        <div className="space-y-2 ml-11">
                          <div
                            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                            data-testid="shift-datetime"
                          >
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">
                              {format(su.shift.start, "EEE, dd MMM yyyy")}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span>
                              {format(su.shift.start, "h:mm a")} –{" "}
                              {format(su.shift.end, "h:mm a")}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                            data-testid="shift-location"
                          >
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>
                              {su.shift.location ?? "Location to be confirmed"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex-shrink-0"
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
                  className="hover:shadow-md transition-all duration-200 border-l-4 border-l-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm opacity-90"
                  data-testid={`past-shift-${su.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          </div>
                          <h3
                            className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate"
                            data-testid="shift-name"
                          >
                            {su.shift.shiftType.name}
                          </h3>
                          <div data-testid="shift-status">
                            <StatusBadge status={su.status} />
                          </div>
                        </div>

                        <div className="space-y-2 ml-11">
                          <div
                            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                            data-testid="shift-datetime"
                          >
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">
                              {format(su.shift.start, "EEE, dd MMM yyyy")}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span>
                              {format(su.shift.start, "h:mm a")} –{" "}
                              {format(su.shift.end, "h:mm a")}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                            data-testid="shift-location"
                          >
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>
                              {su.shift.location ??
                                "Location was not specified"}
                            </span>
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
      </div>
    </div>
  );
}
