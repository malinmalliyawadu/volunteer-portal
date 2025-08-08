import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 2];

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { signups: true },
  });
  if (!shift)
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  let confirmedCount = 0;
  for (const signup of shift.signups) {
    if (signup.status === "CONFIRMED") confirmedCount += 1;
  }
  if (confirmedCount >= shift.capacity) {
    return NextResponse.json({ error: "Shift is full" }, { status: 400 });
  }

  try {
    const signup = await prisma.signup.create({
      data: { userId: user.id, shiftId: shift.id, status: "CONFIRMED" },
    });
    return NextResponse.json(signup);
  } catch {
    return NextResponse.json({ error: "Already signed up?" }, { status: 400 });
  }
}
