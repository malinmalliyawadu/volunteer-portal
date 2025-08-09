import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    prisma.shift.count({ where: { start: { gte: now } } }),
    prisma.shift.count({ where: { start: { lt: now } } }),
    prisma.shift.findMany({
      where: { start: { gte: now } },
      orderBy: { start: "asc" },
      include: { shiftType: true, signups: { include: { user: true } } },
      skip: (uPage - 1) * uSize,
      take: uSize,
    }),
    prisma.shift.findMany({
      where: { start: { lt: now } },
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
    let waitlisted = 0;
    for (const su of s.signups) {
      if (su.status === "CONFIRMED") confirmed += 1;
      if (su.status === "WAITLISTED") waitlisted += 1;
    }
    return {
      confirmed,
      waitlisted,
      remaining: Math.max(0, s.capacity - confirmed),
    };
  }

  function SignupRow({
    name,
    email,
    phone,
    status,
    userId,
  }: {
    name: string | null;
    email: string;
    phone: string | null;
    status: "CONFIRMED" | "WAITLISTED" | "CANCELED";
    userId: string;
  }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 text-sm py-1">
        <div className="truncate">
          <Link
            href={`/admin/volunteers/${userId}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {name ?? "(No name)"}
          </Link>
        </div>
        <div className="truncate text-[color:var(--ee-muted)]">{email}</div>
        <div className="truncate text-[color:var(--ee-muted)]">
          {phone ?? "—"}
        </div>
        <div>
          {status === "CONFIRMED" && <Badge>Confirmed</Badge>}
          {status === "WAITLISTED" && (
            <Badge variant="secondary">Waitlisted</Badge>
          )}
          {status === "CANCELED" && <Badge variant="secondary">Canceled</Badge>}
        </div>
      </div>
    );
  }

  function ShiftCard({ s }: { s: ShiftWithAll }) {
    const { confirmed, waitlisted, remaining } = counts(s);
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate flex items-center gap-2">
                <span>{s.shiftType.name}</span>
                <Badge variant="outline">{s.location ?? "TBC"}</Badge>
              </div>
              <div className="text-sm muted-text">
                {format(s.start, "EEE dd MMM, h:mma")} –{" "}
                {format(s.end, "h:mma")}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge>
                {confirmed}/{s.capacity} confirmed
              </Badge>
              {waitlisted > 0 && (
                <Badge variant="secondary">{waitlisted} waitlisted</Badge>
              )}
              {remaining === 0 ? (
                <Badge variant="secondary">Full</Badge>
              ) : (
                <Badge variant="outline">{remaining} spots left</Badge>
              )}
            </div>
          </div>

          {s.signups.length === 0 ? (
            <div className="text-sm muted-text">No signups yet.</div>
          ) : (
            <div
              className="border-t pt-3"
              style={{ borderColor: "var(--ee-border)" }}
            >
              <div className="hidden md:grid md:grid-cols-4 md:gap-4 text-xs uppercase tracking-wide text-[color:var(--ee-muted)] pb-1">
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Status</div>
              </div>
              <div
                className="divide-y"
                style={{ borderColor: "var(--ee-border)" }}
              >
                {s.signups
                  .slice()
                  .sort(
                    (
                      a: ShiftWithAll["signups"][number],
                      b: ShiftWithAll["signups"][number]
                    ) => {
                      type Status = ShiftWithAll["signups"][number]["status"];
                      const order: Record<Status, number> = {
                        CONFIRMED: 0,
                        WAITLISTED: 1,
                        CANCELED: 2,
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
    const query = (nextPage: number) =>
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
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin · Shifts</h1>
            <p className="muted-text mt-1">
              Review upcoming and past shifts and see all volunteer signups.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/shifts/new">Create shift</Link>
          </Button>
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xl font-semibold">Upcoming shifts</h2>
          <Badge variant="outline">{upcomingCount}</Badge>
          <div className="ml-auto">
            <Pagination
              page={uPage}
              totalPages={uTotalPages}
              size={uSize}
              type="u"
            />
          </div>
        </div>
        {upcoming.length === 0 ? (
          <div className="muted-text">No upcoming shifts.</div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((s: ShiftWithAll) => (
              <ShiftCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xl font-semibold">Historical shifts</h2>
          <Badge variant="outline">{pastCount}</Badge>
          <div className="ml-auto">
            <Pagination
              page={pPage}
              totalPages={pTotalPages}
              size={pSize}
              type="p"
            />
          </div>
        </div>
        {past.length === 0 ? (
          <div className="muted-text">No past shifts.</div>
        ) : (
          <div className="space-y-4">
            {past.map((s: ShiftWithAll) => (
              <ShiftCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
