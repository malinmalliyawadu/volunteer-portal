import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createShiftConfirmedNotification, createShiftWaitlistedNotification } from "@/lib/notifications";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const signupId = segments[segments.length - 2];

  try {
    const body = await req.json();
    const { action } = body; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Find the signup
    const signup = await prisma.signup.findUnique({
      where: { id: signupId },
      include: {
        shift: {
          include: {
            shiftType: true,
          },
        },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!signup) {
      console.error(`Signup not found: signupId=${signupId}`);
      
      return NextResponse.json({ 
        error: "Signup not found", 
        signupId,
        debug: "The signup may have been deleted, canceled, or the ID is incorrect. Please refresh the page to see the current status."
      }, { status: 404 });
    }

    if (signup.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending signups can be approved or rejected" },
        { status: 400 }
      );
    }

    // For approval, check if there's capacity
    if (action === "approve") {
      const confirmedCount = await prisma.signup.count({
        where: {
          shiftId: signup.shiftId,
          status: "CONFIRMED",
        },
      });

      if (confirmedCount >= signup.shift.capacity) {
        // Move to waitlist instead of confirming
        const updatedSignup = await prisma.signup.update({
          where: { id: signupId },
          data: { status: "WAITLISTED" },
        });

        // Create waitlist notification
        try {
          const shiftDate = new Intl.DateTimeFormat('en-NZ', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(signup.shift.start);

          await createShiftWaitlistedNotification(
            signup.user.id,
            signup.shift.shiftType.name,
            shiftDate,
            signup.shift.id
          );
        } catch (notificationError) {
          console.error("Error creating waitlist notification:", notificationError);
        }

        return NextResponse.json({
          ...updatedSignup,
          message: "Shift was full, moved to waitlist",
        });
      }

      // Approve the signup
      const updatedSignup = await prisma.signup.update({
        where: { id: signupId },
        data: { status: "CONFIRMED" },
      });

      // Create confirmation notification
      try {
        const shiftDate = new Intl.DateTimeFormat('en-NZ', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(signup.shift.start);

        await createShiftConfirmedNotification(
          signup.user.id,
          signup.shift.shiftType.name,
          shiftDate,
          signup.shift.id
        );
      } catch (notificationError) {
        console.error("Error creating confirmation notification:", notificationError);
      }

      return NextResponse.json({
        ...updatedSignup,
        message: "Signup approved and confirmed",
      });
    } else {
      // Reject the signup
      const updatedSignup = await prisma.signup.update({
        where: { id: signupId },
        data: { status: "CANCELED" },
      });

      return NextResponse.json({
        ...updatedSignup,
        message: "Signup rejected",
      });
    }
  } catch (error) {
    console.error("Admin signup action error:", error);
    return NextResponse.json(
      { error: "Failed to process signup action" },
      { status: 500 }
    );
  }
}
