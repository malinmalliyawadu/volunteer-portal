import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const updateGroupBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "WAITLISTED", "CANCELED", "PARTIAL"]),
  notes: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Extract group booking ID from URL
    const url = new URL(req.url);
    const segments = url.pathname.split("/");
    const groupBookingId = segments[segments.indexOf("group-bookings") + 1];

    // Validate request body
    const body = await req.json();
    const validation = updateGroupBookingStatusSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, notes } = validation.data;

    // Check if group booking exists
    const groupBooking = await prisma.groupBooking.findUnique({
      where: { id: groupBookingId },
      include: { 
        shift: true,
        signups: { include: { user: true } },
        invitations: true,
      },
    });

    if (!groupBooking) {
      return NextResponse.json({ error: "Group booking not found" }, { status: 404 });
    }

    // Update group booking and related signups in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update group booking status
      const updatedGroupBooking = await tx.groupBooking.update({
        where: { id: groupBookingId },
        data: { 
          status,
          notes,
          updatedAt: new Date(),
        },
        include: {
          shift: {
            include: { shiftType: true },
          },
          leader: {
            select: { id: true, name: true, email: true },
          },
          signups: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          invitations: true,
        },
      });

      // Update all related signups to match group status
      let signupStatus: "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELED";
      
      switch (status) {
        case "CONFIRMED":
          signupStatus = "CONFIRMED";
          break;
        case "WAITLISTED":
          signupStatus = "WAITLISTED";
          break;
        case "CANCELED":
          signupStatus = "CANCELED";
          // Also cancel pending invitations
          await tx.groupInvitation.updateMany({
            where: { 
              groupBookingId,
              status: "PENDING",
            },
            data: { status: "CANCELED" },
          });
          break;
        case "PENDING":
        case "PARTIAL":
        default:
          signupStatus = "PENDING";
          break;
      }

      // Update all signups in the group (unless it's PARTIAL status)
      if (status !== "PARTIAL") {
        await tx.signup.updateMany({
          where: { groupBookingId },
          data: { status: signupStatus },
        });
      }

      return updatedGroupBooking;
    });

    // TODO: Send notification emails to group members about status change

    return NextResponse.json({
      success: true,
      groupBooking: result,
      message: `Group booking ${status.toLowerCase()} successfully`,
    });

  } catch (error) {
    console.error("Error updating group booking status:", error);
    return NextResponse.json(
      { error: "Failed to update group booking status" },
      { status: 500 }
    );
  }
}