import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { getNotificationService } from "@/lib/notification-service";

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

  // Check if user already has a confirmed signup for the same day
  const shiftDate = new Date(shift.start);
  const startOfDay = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  
  const existingDailySignup = await prisma.signup.findFirst({
    where: {
      userId: user.id,
      status: "CONFIRMED",
      shift: {
        start: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    },
    include: {
      shift: {
        include: {
          shiftType: true,
        },
      },
    },
  });
  
  if (existingDailySignup) {
    const existingShiftTime = new Intl.DateTimeFormat('en-NZ', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(existingDailySignup.shift.start);
    
    return NextResponse.json(
      { 
        error: `You already have a confirmed shift on this day: ${existingDailySignup.shift.shiftType.name} at ${existingShiftTime}. You can only sign up for one shift per day.`
      },
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

  // Find the existing signup with full shift details for notifications
  const existingSignup = await prisma.signup.findUnique({
    where: { userId_shiftId: { userId: user.id, shiftId } },
    include: { 
      shift: {
        include: {
          shiftType: true,
          signups: true,
        },
      },
    },
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

  // Notify restaurant managers of the cancellation (async - don't await)
  // This won't block the cancellation response even if notifications fail
  const notificationService = getNotificationService();
  notificationService.notifyManagersOfShiftCancellation({
    shift: existingSignup.shift,
    volunteer: user,
    canceledSignup,
  }).catch((error) => {
    console.error("Failed to send manager notifications:", error);
    // Continue - don't fail the cancellation due to notification errors
  });

  return NextResponse.json(canceledSignup);
}
