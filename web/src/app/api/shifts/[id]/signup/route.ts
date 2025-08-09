import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkAndUnlockAchievements } from "@/lib/achievements";

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

  // Read optional waitlist flag from form body
  let waitlistRequested = false;
  try {
    const form = await req.formData();
    const val = form.get("waitlist");
    waitlistRequested = val === "1" || val === "true" || val === "on";
  } catch {
    // ignore body parse errors for non-form requests
  }

  // Check if user already has a signup for this shift
  const existing = await prisma.signup.findUnique({
    where: { userId_shiftId: { userId: user.id, shiftId: shift.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Already ${existing.status.toLowerCase()}` },
      { status: 400 }
    );
  }

  if (confirmedCount >= shift.capacity) {
    if (!waitlistRequested) {
      return NextResponse.json(
        { error: "Shift is full; waitlist available" },
        { status: 400 }
      );
    }
    const signup = await prisma.signup.create({
      data: { userId: user.id, shiftId: shift.id, status: "WAITLISTED" },
    });

    // Check for new achievements after successful signup
    try {
      await checkAndUnlockAchievements(user.id);
    } catch (achievementError) {
      // Don't fail the signup if achievement checking fails
      console.error("Error checking achievements:", achievementError);
    }

    return NextResponse.json(signup);
  }

  // Spots available → create pending signup that requires admin approval
  try {
    const signup = await prisma.signup.create({
      data: { userId: user.id, shiftId: shift.id, status: "PENDING" },
    });

    // Check for new achievements after successful signup
    try {
      await checkAndUnlockAchievements(user.id);
    } catch (achievementError) {
      // Don't fail the signup if achievement checking fails
      console.error("Error checking achievements:", achievementError);
    }

    return NextResponse.json(signup);
  } catch {
    return NextResponse.json({ error: "Already signed up?" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const shiftId = segments[segments.length - 2];

  // Find the existing signup
  const existingSignup = await prisma.signup.findUnique({
    where: { userId_shiftId: { userId: user.id, shiftId } },
    include: { shift: true },
  });

  if (!existingSignup) {
    return NextResponse.json({ error: "Signup not found" }, { status: 404 });
  }

  // Don't allow canceling past shifts
  const now = new Date();
  if (existingSignup.shift.end < now) {
    return NextResponse.json(
      { error: "Cannot cancel past shifts" },
      { status: 400 }
    );
  }

  // Don't allow canceling already canceled signups
  if (existingSignup.status === "CANCELED") {
    return NextResponse.json(
      { error: "Signup is already canceled" },
      { status: 400 }
    );
  }

  // Update the signup status to CANCELED
  const canceledSignup = await prisma.signup.update({
    where: { id: existingSignup.id },
    data: { status: "CANCELED" },
  });

  return NextResponse.json(canceledSignup);
}
