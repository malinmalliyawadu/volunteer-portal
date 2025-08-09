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
        shift: { end: { gte: now } },
        status: { not: "CANCELED" },
      },
    }),
    prisma.signup.count({
      where: {
        userId: userId!,
        shift: { end: { lt: now } },
        status: { not: "CANCELED" },
      },
    }),
    prisma.signup.findMany({
      where: {
        userId: userId!,
        shift: { end: { gte: now } },
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
        shift: { end: { lt: now } },
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
    const query = (nextPage: number) =>
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

    return (
      <div className="flex items-center gap-2">
        {isFirst ? (
          <Button variant="secondary" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link href={{ pathname: basePath, query: query(page - 1) }}>
              Previous
            </Link>
          </Button>
        )}
        <span className="text-sm muted-text">
          Page {page} of {totalPages}
        </span>
        {isLast ? (
          <Button variant="secondary" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link href={{ pathname: basePath, query: query(page + 1) }}>
              Next
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4">
      <PageHeader
        title="My Shifts"
        description="View your upcoming and past volunteer shifts."
      />

      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xl font-semibold">Upcoming</h2>
          <Badge variant="outline">{upcomingCount}</Badge>
          <div className="ml-auto">
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
          <div className="text-center py-8">
            <div className="muted-text mb-4">No upcoming shifts yet.</div>
            <div className="text-sm muted-text">
              Visit the{" "}
              <Link href="/shifts" className="text-blue-600 hover:underline">
                shifts page
              </Link>{" "}
              to sign up for available volunteer opportunities.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((su: SignupWithRelations) => (
              <Card key={su.id}>
                <CardContent className="p-4 flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium truncate">
                        {su.shift.shiftType.name}
                      </div>
                      {su.status === "PENDING" && (
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200"
                        >
                          Pending Approval
                        </Badge>
                      )}
                      {su.status === "CONFIRMED" && <Badge>Confirmed</Badge>}
                      {su.status === "WAITLISTED" && (
                        <Badge variant="secondary">Waitlisted</Badge>
                      )}
                    </div>
                    <div className="text-sm muted-text">
                      {format(su.shift.start, "EEE dd MMM, h:mma")} –{" "}
                      {format(su.shift.end, "h:mma")} ·{" "}
                      {su.shift.location ?? "TBC"}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <CancelSignupButton
                      shiftId={su.shift.id}
                      shiftName={su.shift.shiftType.name}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xl font-semibold">History</h2>
          <Badge variant="outline">{pastCount}</Badge>
          <div className="ml-auto">
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
          <div className="text-center py-8">
            <div className="muted-text">No historical shifts.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {past.map((su: SignupWithRelations) => (
              <Card key={su.id}>
                <CardContent className="p-4 flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium truncate">
                        {su.shift.shiftType.name}
                      </div>
                      {su.status === "PENDING" && (
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200"
                        >
                          Pending Approval
                        </Badge>
                      )}
                      {su.status === "CONFIRMED" && <Badge>Confirmed</Badge>}
                      {su.status === "WAITLISTED" && (
                        <Badge variant="secondary">Waitlisted</Badge>
                      )}
                    </div>
                    <div className="text-sm muted-text">
                      {format(su.shift.start, "EEE dd MMM, h:mma")} –{" "}
                      {format(su.shift.end, "h:mma")} ·{" "}
                      {su.shift.location ?? "TBC"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
