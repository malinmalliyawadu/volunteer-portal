import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="max-w-6xl mx-auto p-4 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-700 bg-clip-text text-transparent">
          Volunteer Shifts
        </h1>
        <p className="text-lg text-muted-foreground">
          Find and sign up for upcoming shifts
          {selectedLocation ? ` in ${selectedLocation}` : ""}.
        </p>
      </div>

      {/* Location filter */}
      <div className="mb-8 p-6 bg-card-bg rounded-xl border border-border">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-foreground mr-2">
            Filter by location:
          </span>
          <Button
            asChild
            variant={!selectedLocation ? "default" : "secondary"}
            size="sm"
            className={!selectedLocation ? "btn-primary" : ""}
          >
            <Link href={{ pathname: "/shifts", query: {} }}>All locations</Link>
          </Button>
          {LOCATIONS.map((loc) => (
            <Button
              asChild
              key={loc}
              variant={selectedLocation === loc ? "default" : "secondary"}
              size="sm"
              className={selectedLocation === loc ? "btn-primary" : ""}
            >
              <Link href={{ pathname: "/shifts", query: { location: loc } }}>
                {loc}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {shifts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-primary/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No shifts available</h3>
          <p className="text-muted-foreground">
            No upcoming shifts
            {selectedLocation ? ` in ${selectedLocation}` : ""}. Check back
            later for new opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedKeys.map((key, dayIndex) => {
            const dayShifts = groups.get(key)!;
            const heading = format(new Date(key), "EEEE, dd MMMM yyyy");
            return (
              <section
                key={key}
                className="animate-slide-up"
                style={{ animationDelay: `${dayIndex * 0.1}s` }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-2xl font-bold">{heading}</h2>
                  <Badge variant="outline" className="badge-primary">
                    {dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {dayShifts.map((s: ShiftWithRelations, shiftIndex) => {
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
                      <Card
                        key={s.id}
                        className="group hover:shadow-xl transition-all duration-300 overflow-hidden animate-slide-up"
                        style={{
                          animationDelay: `${
                            dayIndex * 0.1 + shiftIndex * 0.05
                          }s`,
                        }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                                {s.shiftType.name}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>
                                  {format(s.start, "h:mm a")} -{" "}
                                  {format(s.end, "h:mm a")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                <span>{s.location}</span>
                              </div>
                            </div>
                            {mySignup ? (
                              <Badge
                                variant="outline"
                                className={
                                  mySignup.status === "CONFIRMED"
                                    ? "badge-primary"
                                    : "badge-accent"
                                }
                              >
                                {mySignup.status === "CONFIRMED"
                                  ? "Confirmed"
                                  : "Waitlisted"}
                              </Badge>
                            ) : null}
                          </div>

                          {/* Capacity indicator */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">
                                Capacity
                              </span>
                              <span className="font-medium">
                                {confirmedCount}/{s.capacity}
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {isFull && waitlistCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {waitlistCount} on waitlist
                              </p>
                            )}
                          </div>

                          {s.shiftType.description && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {s.shiftType.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            {isFull ? (
                              <Badge
                                variant="secondary"
                                className="badge-outline"
                              >
                                Waitlist open
                              </Badge>
                            ) : (
                              <Badge className="badge-accent">
                                {remaining} spot{remaining !== 1 ? "s" : ""}{" "}
                                left
                              </Badge>
                            )}

                            {mySignup ? (
                              <span className="text-sm text-muted-foreground">
                                You&apos;re signed up
                              </span>
                            ) : isFull ? (
                              session ? (
                                <form
                                  action={`/api/shifts/${s.id}/signup`}
                                  method="post"
                                >
                                  <input
                                    type="hidden"
                                    name="waitlist"
                                    value="1"
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    className="btn-outline"
                                  >
                                    Join waitlist
                                  </Button>
                                </form>
                              ) : (
                                <Button
                                  asChild
                                  size="sm"
                                  className="btn-primary"
                                >
                                  <Link
                                    href={{
                                      pathname: "/login",
                                      query: { callbackUrl: "/shifts" },
                                    }}
                                  >
                                    Join waitlist
                                  </Link>
                                </Button>
                              )
                            ) : session ? (
                              <form
                                action={`/api/shifts/${s.id}/signup`}
                                method="post"
                              >
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="btn-primary"
                                >
                                  Sign up
                                </Button>
                              </form>
                            ) : (
                              <Button asChild size="sm" className="btn-primary">
                                <Link
                                  href={{
                                    pathname: "/login",
                                    query: { callbackUrl: "/shifts" },
                                  }}
                                >
                                  Sign up
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
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
