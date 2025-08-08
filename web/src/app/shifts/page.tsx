import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function ShiftsPage() {
  const shifts = await prisma.shift.findMany({
    orderBy: { start: "asc" },
    include: { shiftType: true, signups: true },
    where: { start: { gte: new Date() } },
  });

  type ShiftWithRelations = (typeof shifts)[number];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-semibold mb-6">Volunteer Shifts</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {shifts.map((s: ShiftWithRelations) => {
          let confirmedCount = 0;
          for (const signup of s.signups) {
            if (signup.status === "CONFIRMED") confirmedCount += 1;
          }
          const remaining = Math.max(0, s.capacity - confirmedCount);
          return (
            <div
              key={s.id}
              className="card p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{s.shiftType.name}</div>
                <div className="text-sm text-[color:var(--ee-muted)]">
                  {format(s.start, "EEE dd MMM, h:mma")} –{" "}
                  {format(s.end, "h:mma")} · {s.location}
                </div>
                <div className="text-sm mt-1">
                  Capacity: {s.capacity} · Remaining: {remaining}
                </div>
              </div>
              <form action={`/api/shifts/${s.id}/signup`} method="post">
                <button
                  type="submit"
                  className="btn btn-primary disabled:opacity-50"
                  disabled={remaining === 0}
                >
                  Sign up
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
