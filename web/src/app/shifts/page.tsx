import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;

type LocationOption = (typeof LOCATIONS)[number];

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  const params = await searchParams;

  // Normalize and validate selected location
  const rawLocation = Array.isArray(params.location)
    ? params.location[0]
    : params.location;
  const selectedLocation: LocationOption | undefined = LOCATIONS.includes(
    (rawLocation as LocationOption) ?? ("" as LocationOption)
  )
    ? (rawLocation as LocationOption)
    : undefined;

  const shifts = await prisma.shift.findMany({
    orderBy: { start: "asc" },
    include: { shiftType: true, signups: true },
    where: {
      start: { gte: new Date() },
      ...(selectedLocation ? { location: selectedLocation } : {}),
    },
  });

  type ShiftWithRelations = (typeof shifts)[number];

  // Group shifts by calendar date (yyyy-MM-dd)
  const groups = new Map<string, ShiftWithRelations[]>();
  for (const s of shifts) {
    const key = format(s.start, "yyyy-MM-dd");
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  // Sort group keys by date ascending
  const sortedKeys = Array.from(groups.keys()).sort();

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Volunteer Shifts</h1>
        <p className="muted-text mt-1">
          Find and sign up for upcoming shifts
          {selectedLocation ? ` in ${selectedLocation}` : ""}.
        </p>
      </div>

      {/* Location filter */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm muted-text mr-2">Filter by location:</span>
        <Link
          href={{ pathname: "/shifts", query: {} }}
          className={`btn btn-sm ${
            !selectedLocation ? "btn-primary" : "btn-secondary"
          }`}
        >
          All locations
        </Link>
        {LOCATIONS.map((loc) => (
          <Link
            key={loc}
            href={{ pathname: "/shifts", query: { location: loc } }}
            className={`btn btn-sm ${
              selectedLocation === loc ? "btn-primary" : "btn-secondary"
            }`}
          >
            {loc}
          </Link>
        ))}
      </div>

      {shifts.length === 0 ? (
        <div className="muted-text">
          No upcoming shifts{selectedLocation ? ` in ${selectedLocation}` : ""}.
        </div>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((key) => {
            const dayShifts = groups.get(key)!;
            const heading = format(new Date(key), "EEEE, dd MMMM yyyy");
            return (
              <section key={key}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xl font-semibold">{heading}</h2>
                  <span className="badge badge-outline">
                    {dayShifts.length} shifts
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {dayShifts.map((s: ShiftWithRelations) => {
                    let confirmedCount = 0;
                    let waitlistCount = 0;
                    for (const signup of s.signups) {
                      if (signup.status === "CONFIRMED") confirmedCount += 1;
                      if (signup.status === "WAITLISTED") waitlistCount += 1;
                    }
                    const remaining = Math.max(0, s.capacity - confirmedCount);
                    const isFull = remaining === 0;
                    const pct = Math.min(
                      100,
                      Math.round((confirmedCount / s.capacity) * 100)
                    );

                    // Determine if the current user is already signed up for this shift
                    const currentUserId = (
                      session?.user as { id?: string } | undefined
                    )?.id;
                    const mySignup = currentUserId
                      ? s.signups.find(
                          (su: (typeof s.signups)[number]) =>
                            su.userId === currentUserId
                        )
                      : undefined;

                    return (
                      <div
                        key={s.id}
                        className="card p-4 flex items-center justify-between gap-6 hover:shadow-md transition-shadow"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium truncate">
                              {s.shiftType.name}
                            </div>
                            {isFull ? (
                              <span className="badge badge-muted">
                                Waitlist open
                                {waitlistCount
                                  ? ` · ${waitlistCount} waiting`
                                  : ""}
                              </span>
                            ) : (
                              <span className="badge badge-accent">
                                {remaining} spots left
                              </span>
                            )}
                          </div>
                          <div className="text-sm muted-text">
                            {format(s.start, "EEE dd MMM, h:mma")} –{" "}
                            {format(s.end, "h:mma")} · {s.location ?? "TBC"}
                          </div>
                          <div className="mt-2 h-1.5 bg-[color:var(--ee-border)] rounded">
                            <div
                              className="h-1.5 rounded"
                              style={{
                                width: `${pct}%`,
                                background: "var(--ee-primary)",
                              }}
                            />
                          </div>
                          <div className="text-xs muted-text mt-1">
                            {confirmedCount}/{s.capacity} filled
                          </div>
                        </div>

                        {mySignup ? (
                          <button className="btn btn-secondary" disabled>
                            {mySignup.status === "CONFIRMED"
                              ? "You're signed up"
                              : mySignup.status === "WAITLISTED"
                              ? "You're on the waitlist"
                              : "Signup recorded"}
                          </button>
                        ) : isFull ? (
                          session ? (
                            <form
                              action={`/api/shifts/${s.id}/signup`}
                              method="post"
                            >
                              <input type="hidden" name="waitlist" value="1" />
                              <button type="submit" className="btn btn-primary">
                                Join waitlist
                              </button>
                            </form>
                          ) : (
                            <Link
                              href={{
                                pathname: "/login",
                                query: { callbackUrl: "/shifts" },
                              }}
                              className="btn btn-primary"
                            >
                              Join waitlist
                            </Link>
                          )
                        ) : session ? (
                          <form
                            action={`/api/shifts/${s.id}/signup`}
                            method="post"
                          >
                            <button type="submit" className="btn btn-primary">
                              Sign up
                            </button>
                          </form>
                        ) : (
                          <Link
                            href={{
                              pathname: "/login",
                              query: { callbackUrl: "/shifts" },
                            }}
                            className="btn btn-primary"
                          >
                            Sign up
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
