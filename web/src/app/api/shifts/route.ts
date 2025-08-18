import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const shifts = await prisma.shift.findMany({
    orderBy: { start: "asc" },
    include: { shiftType: true, signups: true },
  });

  type ShiftItem = {
    id: string;
    start: Date;
    end: Date;
    location: string | null;
    notes: string | null;
    capacity: number;
    remaining: number;
    shiftType: { id: string; name: string };
  };

  const result: ShiftItem[] = [];
  for (const s of shifts) {
    let confirmedCount = 0;
    for (const signup of s.signups) {
      if (signup.status === "CONFIRMED") confirmedCount += 1;
    }

    result.push({
      id: s.id,
      start: s.start,
      end: s.end,
      location: s.location,
      notes: s.notes,
      capacity: s.capacity,
      remaining: Math.max(0, s.capacity - confirmedCount),
      shiftType: { id: s.shiftType.id, name: s.shiftType.name },
    });
  }

  return NextResponse.json(result);
}
