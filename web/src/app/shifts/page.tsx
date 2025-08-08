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
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Volunteer Shifts</h1>
      <div className="space-y-4">
        {shifts.map((s: ShiftWithRelations) => {
          let confirmedCount = 0;
          for (const signup of s.signups) {
            if (signup.status === "CONFIRMED") confirmedCount += 1;
          }
          const remaining = Math.max(0, s.capacity - confirmedCount);
          return (
            <div
              key={s.id}
              className="border rounded p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{s.shiftType.name}</div>
                <div className="text-sm text-gray-600">
                  {format(s.start, "EEE dd MMM, h:mma")} –{" "}
                  {format(s.end, "h:mma")} · {s.location}
                </div>
                <div className="text-sm">
                  Capacity: {s.capacity} · Remaining: {remaining}
                </div>
              </div>
              <form action={`/api/shifts/${s.id}/signup`} method="post">
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
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
