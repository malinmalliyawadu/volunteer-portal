import { test, expect } from "@playwright/test";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

test.describe("Group Booking Feature - Database Operations", () => {
  test.describe.configure({ mode: 'serial' }); // Run tests in series to avoid conflicts

  const uniqueId = Date.now().toString();
  const volunteerEmail = `test-volunteer-${uniqueId}@example.com`;
  const volunteer2Email = `test-volunteer2-${uniqueId}@example.com`;
  const adminEmail = `test-admin-${uniqueId}@example.com`;

  let volunteerId: string;
  let volunteer2Id: string;
  let adminId: string;
  let shiftId: string;
  let groupBookingId: string;
  let invitationToken: string;

  test("setup: create test data", async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash("password123", 10);

    const volunteer = await prisma.user.create({
      data: {
        email: volunteerEmail,
        name: "Test Volunteer",
        role: "VOLUNTEER",
        hashedPassword: hashedPassword,
      }
    });
    volunteerId = volunteer.id;

    const volunteer2 = await prisma.user.create({
      data: {
        email: volunteer2Email,
        name: "Test Volunteer 2",
        role: "VOLUNTEER",
        hashedPassword: hashedPassword,
      }
    });
    volunteer2Id = volunteer2.id;

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Test Admin",
        role: "ADMIN",
        hashedPassword: hashedPassword,
      }
    });
    adminId = admin.id;

    // Create test shift
    const shiftType = await prisma.shiftType.findFirst() || await prisma.shiftType.create({
      data: {
        name: "Kitchen Prep",
        description: "Help prepare meals"
      }
    });

    const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(13, 0, 0, 0);

    const shift = await prisma.shift.create({
      data: {
        start: startDate,
        end: endDate,
        capacity: 10,
        shiftTypeId: shiftType.id,
      }
    });
    
    shiftId = shift.id;

    expect(volunteerId).toBeTruthy();
    expect(volunteer2Id).toBeTruthy();
    expect(adminId).toBeTruthy();
    expect(shiftId).toBeTruthy();
  });

  test("create group booking", async () => {
    // Create group booking
    const groupBooking = await prisma.groupBooking.create({
      data: {
        name: `Test Group ${uniqueId}`,
        description: "Testing group booking functionality",
        shiftId: shiftId,
        leaderId: volunteerId,
        status: "PENDING",
        maxMembers: 10,
      }
    });

    groupBookingId = groupBooking.id;

    // Create leader's signup
    await prisma.signup.create({
      data: {
        userId: volunteerId,
        shiftId: shiftId,
        groupBookingId: groupBookingId,
        status: "PENDING",
      }
    });

    // Verify group was created
    expect(groupBooking).toBeTruthy();
    expect(groupBooking.status).toBe("PENDING");
    expect(groupBooking.leaderId).toBe(volunteerId);
  });

  test("create invitation", async () => {
    // Create invitation
    invitationToken = `test-token-${uniqueId}`;
    
    const invitation = await prisma.groupInvitation.create({
      data: {
        groupBookingId: groupBookingId,
        email: volunteer2Email,
        invitedById: volunteerId,
        status: "PENDING",
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    });

    expect(invitation).toBeTruthy();
    expect(invitation.status).toBe("PENDING");
    expect(invitation.email).toBe(volunteer2Email);
  });

  test("accept invitation", async () => {
    // Accept the invitation by creating a signup
    const signup = await prisma.signup.create({
      data: {
        userId: volunteer2Id,
        shiftId: shiftId,
        groupBookingId: groupBookingId,
        status: "PENDING",
      }
    });

    // Update invitation status
    await prisma.groupInvitation.update({
      where: { token: invitationToken },
      data: { status: "ACCEPTED" }
    });

    // Verify
    const updatedInvitation = await prisma.groupInvitation.findUnique({
      where: { token: invitationToken }
    });

    expect(updatedInvitation?.status).toBe("ACCEPTED");
    expect(signup.groupBookingId).toBe(groupBookingId);
    expect(signup.userId).toBe(volunteer2Id);
  });

  test("admin approve group booking", async () => {
    // Admin approves the group
    const approvedGroup = await prisma.groupBooking.update({
      where: { id: groupBookingId },
      data: { status: "CONFIRMED" }
    });

    // Also approve all signups in the group
    await prisma.signup.updateMany({
      where: { groupBookingId: groupBookingId },
      data: { status: "CONFIRMED" }
    });

    // Verify
    expect(approvedGroup.status).toBe("CONFIRMED");

    const signups = await prisma.signup.findMany({
      where: { groupBookingId: groupBookingId }
    });

    signups.forEach(signup => {
      expect(signup.status).toBe("CONFIRMED");
    });

    // Verify we have 2 signups (leader + invited member)
    expect(signups.length).toBe(2);
  });

  test("member can leave group", async () => {
    // Get volunteer2's signup
    const signup = await prisma.signup.findFirst({
      where: {
        userId: volunteer2Id,
        groupBookingId: groupBookingId
      }
    });

    expect(signup).toBeTruthy();

    // Leave the group by canceling the signup
    const canceledSignup = await prisma.signup.update({
      where: { id: signup!.id },
      data: { status: "CANCELED" }
    });

    expect(canceledSignup.status).toBe("CANCELED");

    // Verify only 1 active signup remains
    const activeSignups = await prisma.signup.findMany({
      where: {
        groupBookingId: groupBookingId,
        status: "CONFIRMED"
      }
    });

    expect(activeSignups.length).toBe(1);
    expect(activeSignups[0].userId).toBe(volunteerId); // Only leader remains
  });

  test("admin can reject group booking", async () => {
    // Create a new shift for this test (since leader can only have one group per shift)
    const rejectTestStartDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    rejectTestStartDate.setHours(15, 0, 0, 0);
    const rejectTestEndDate = new Date(rejectTestStartDate);
    rejectTestEndDate.setHours(18, 0, 0, 0);

    const rejectTestShift = await prisma.shift.create({
      data: {
        start: rejectTestStartDate,
        end: rejectTestEndDate,
        capacity: 8,
        shiftTypeId: (await prisma.shiftType.findFirst())!.id,
      }
    });

    // Create a new group to reject
    const groupToReject = await prisma.groupBooking.create({
      data: {
        name: `Group to Reject ${uniqueId}`,
        shiftId: rejectTestShift.id,
        leaderId: volunteerId,
        status: "PENDING",
        maxMembers: 5
      }
    });

    // Reject the group
    const rejectedGroup = await prisma.groupBooking.update({
      where: { id: groupToReject.id },
      data: { 
        status: "CANCELED",
        notes: "Rejected for testing purposes"
      }
    });

    expect(rejectedGroup.status).toBe("CANCELED");
    expect(rejectedGroup.notes).toContain("Rejected for testing");

    // Clean up the test shift
    await prisma.shift.delete({ where: { id: rejectTestShift.id } });
  });

  test("expired invitation validation", async () => {
    // Create an expired invitation
    const expiredToken = `expired-token-${uniqueId}`;
    const expiredInvitation = await prisma.groupInvitation.create({
      data: {
        groupBookingId: groupBookingId,
        email: "expired@test.com",
        invitedById: volunteerId,
        status: "PENDING",
        token: expiredToken,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
      }
    });

    // Check if invitation is expired
    const now = new Date();
    const isExpired = expiredInvitation.expiresAt < now;

    expect(isExpired).toBe(true);
    expect(expiredInvitation.status).toBe("PENDING");

    // In a real API, this would be rejected
    // We can simulate the validation logic
    if (isExpired) {
      await prisma.groupInvitation.update({
        where: { token: expiredToken },
        data: { status: "EXPIRED" }
      });
    }

    const updatedInvitation = await prisma.groupInvitation.findUnique({
      where: { token: expiredToken }
    });

    expect(updatedInvitation?.status).toBe("EXPIRED");
  });

  test("capacity management", async () => {
    // Create a shift with limited capacity
    const limitedStartDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    limitedStartDate.setHours(10, 0, 0, 0);
    const limitedEndDate = new Date(limitedStartDate);
    limitedEndDate.setHours(14, 0, 0, 0);

    const limitedShift = await prisma.shift.create({
      data: {
        start: limitedStartDate,
        end: limitedEndDate,
        capacity: 3,
        shiftTypeId: (await prisma.shiftType.findFirst())!.id,
      }
    });

    // Create signups to fill some capacity
    const existingSignup = await prisma.signup.create({
      data: {
        userId: adminId,
        shiftId: limitedShift.id,
        status: "CONFIRMED"
      }
    });

    // Check remaining capacity
    const signups = await prisma.signup.findMany({
      where: {
        shiftId: limitedShift.id,
        status: { in: ["CONFIRMED", "PENDING"] }
      }
    });

    const remainingCapacity = limitedShift.capacity - signups.length;
    expect(remainingCapacity).toBe(2);

    // Create a group for the limited shift
    const limitedGroup = await prisma.groupBooking.create({
      data: {
        name: `Limited Group ${uniqueId}`,
        shiftId: limitedShift.id,
        leaderId: volunteer2Id, // Use different leader to avoid unique constraint
        status: "PENDING",
        maxMembers: 2 // This fits within capacity
      }
    });

    expect(limitedGroup.maxMembers).toBeLessThanOrEqual(remainingCapacity);

    // Clean up the limited shift (delete related records first)
    await prisma.signup.delete({ where: { id: existingSignup.id } });
    await prisma.groupBooking.delete({ where: { id: limitedGroup.id } });
    await prisma.shift.delete({ where: { id: limitedShift.id } });
  });

  test("group statistics", async () => {
    // Get group booking statistics
    const totalGroups = await prisma.groupBooking.count({
      where: {
        name: { contains: uniqueId }
      }
    });

    const confirmedGroups = await prisma.groupBooking.count({
      where: {
        name: { contains: uniqueId },
        status: "CONFIRMED"
      }
    });

    const totalInvitations = await prisma.groupInvitation.count({
      where: {
        token: { contains: uniqueId }
      }
    });

    const acceptedInvitations = await prisma.groupInvitation.count({
      where: {
        token: { contains: uniqueId },
        status: "ACCEPTED"
      }
    });

    // Verify we have the expected numbers
    expect(totalGroups).toBeGreaterThanOrEqual(1); // At least 1 group created
    expect(confirmedGroups).toBeGreaterThanOrEqual(1); // At least 1 confirmed
    expect(totalInvitations).toBeGreaterThanOrEqual(1); // At least 1 invitation
    expect(acceptedInvitations).toBeGreaterThanOrEqual(1); // At least 1 accepted

    // Group member statistics
    const groupWithMembers = await prisma.groupBooking.findFirst({
      where: { 
        id: groupBookingId,
        status: "CONFIRMED"
      },
      include: {
        signups: {
          where: {
            status: { in: ["CONFIRMED", "PENDING"] }
          }
        }
      }
    });

    expect(groupWithMembers).toBeTruthy();
    expect(groupWithMembers!.signups.length).toBeGreaterThan(0);
  });

  test("cleanup: remove test data", async () => {
    // Clean up all test data in correct order
    
    // 1. Delete invitations
    await prisma.groupInvitation.deleteMany({
      where: {
        OR: [
          { email: { in: [volunteerEmail, volunteer2Email, "expired@test.com"] } },
          { token: { contains: uniqueId } }
        ]
      }
    });

    // 2. Delete signups
    await prisma.signup.deleteMany({
      where: {
        user: {
          email: { in: [volunteerEmail, volunteer2Email, adminEmail] }
        }
      }
    });

    // 3. Delete group bookings
    await prisma.groupBooking.deleteMany({
      where: {
        name: { contains: uniqueId }
      }
    });

    // 4. Delete user achievements (if any)
    await prisma.userAchievement.deleteMany({
      where: {
        user: {
          email: { in: [volunteerEmail, volunteer2Email, adminEmail] }
        }
      }
    });

    // 5. Delete shifts (but only test ones)
    await prisma.shift.deleteMany({
      where: {
        id: shiftId
      }
    });

    // 6. Finally delete users
    await prisma.user.deleteMany({
      where: {
        email: { in: [volunteerEmail, volunteer2Email, adminEmail] }
      }
    });

    // Verify cleanup
    const remainingUsers = await prisma.user.findMany({
      where: {
        email: { in: [volunteerEmail, volunteer2Email, adminEmail] }
      }
    });

    const remainingGroups = await prisma.groupBooking.findMany({
      where: {
        name: { contains: uniqueId }
      }
    });

    expect(remainingUsers.length).toBe(0);
    expect(remainingGroups.length).toBe(0);
  });
});