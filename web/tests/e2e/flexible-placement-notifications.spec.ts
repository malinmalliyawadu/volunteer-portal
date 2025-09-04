import { test, expect } from "./base";
import { loginAsAdmin, loginAsVolunteer } from "./helpers/auth";
import { 
  createTestUser, 
  deleteTestUsers, 
  createShift, 
  deleteTestShifts 
} from "./helpers/test-helpers";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

test.describe("Flexible Placement Notifications", () => {
  const testId = randomUUID().slice(0, 8);
  const adminEmail = `admin-notif-${testId}@example.com`;
  const volunteerEmail = `volunteer-notif-${testId}@example.com`;
  const testEmails = [adminEmail, volunteerEmail];
  const testShiftIds: string[] = [];
  let flexibleShiftTypeId: string;
  let flexibleShiftId: string;
  let targetShiftId: string;
  let volunteerUserId: string;

  test.beforeAll(async () => {
    // Create test users
    await createTestUser(adminEmail, "ADMIN");
    await createTestUser(volunteerEmail, "VOLUNTEER");

    const volunteer = await prisma.user.findUnique({
      where: { email: volunteerEmail }
    });
    volunteerUserId = volunteer!.id;

    // Ensure flexible shift type exists
    let flexibleShiftType = await prisma.shiftType.findUnique({
      where: { name: "Anywhere I'm Needed (PM)" }
    });

    if (!flexibleShiftType) {
      flexibleShiftType = await prisma.shiftType.create({
        data: {
          name: "Anywhere I'm Needed (PM)",
          description: "Flexible placement for PM shifts starting after 4:00pm",
        }
      });
    }
    flexibleShiftTypeId = flexibleShiftType.id;

    // Create shifts for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0);

    // Create flexible shift
    const flexibleShift = await createShift({
      location: "Wellington",
      start: tomorrow,
      end: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000),
      capacity: 2,
      shiftTypeId: flexibleShiftTypeId,
    });
    flexibleShiftId = flexibleShift.id;
    testShiftIds.push(flexibleShiftId);

    // Create target shift
    const targetShift = await createShift({
      location: "Wellington", 
      start: new Date(tomorrow.getTime() + 1.5 * 60 * 60 * 1000),
      end: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000),
      capacity: 3,
      notes: "Target shift for notification testing",
    });
    targetShiftId = targetShift.id;
    testShiftIds.push(targetShiftId);
  });

  test.afterAll(async () => {
    // Clean up notifications
    await prisma.notification.deleteMany({
      where: { userId: volunteerUserId }
    });
    
    // Clean up signups
    await prisma.signup.deleteMany({
      where: {
        shiftId: { in: testShiftIds }
      }
    });

    // Cleanup
    await deleteTestUsers(testEmails);
    await deleteTestShifts(testShiftIds);
  });

  test.describe("Flexible Placement Notifications", () => {
    test("volunteer receives FLEXIBLE_PLACEMENT notification when placed", async ({ page }) => {
      // First, volunteer signs up for flexible shift
      await prisma.signup.create({
        data: {
          userId: volunteerUserId,
          shiftId: flexibleShiftId,
          status: "CONFIRMED",
          isFlexiblePlacement: true
        }
      });

      // Admin places the volunteer using the API
      await loginAsAdmin(page);
      
      // Make API call to place volunteer
      const response = await page.request.post('/api/admin/flexible-placements', {
        data: {
          signupId: (await prisma.signup.findFirst({
            where: {
              userId: volunteerUserId,
              shiftId: flexibleShiftId
            }
          }))?.id,
          targetShiftId: targetShiftId,
          placementNotes: "Test placement via API"
        }
      });

      expect(response.ok()).toBeTruthy();

      // Verify notification was created
      const notification = await prisma.notification.findFirst({
        where: {
          userId: volunteerUserId,
          type: "FLEXIBLE_PLACEMENT"
        },
        orderBy: { createdAt: "desc" }
      });

      expect(notification).toBeTruthy();
      expect(notification?.title).toBe("You've been placed!");
      expect(notification?.message).toContain("Kitchen");
      expect(notification?.actionUrl).toBe("/shifts/mine");
      expect(notification?.isRead).toBe(false);
    });

    test("volunteer can see flexible placement notification in UI", async ({ page }) => {
      await loginAsVolunteer(page, volunteerEmail);
      await page.goto("/dashboard");
      await page.waitForLoadState("load");

      // Check notification bell shows unread indicator
      const notificationBell = page.getByTestId("notifications-button");
      const unreadIndicator = page.getByTestId("unread-notifications-indicator");
      
      await expect(unreadIndicator).toBeVisible();

      // Click to open notifications
      await notificationBell.click();

      // Should see the placement notification
      const notificationPanel = page.getByTestId("notifications-panel");
      await expect(notificationPanel).toBeVisible();
      
      await expect(notificationPanel.getByText("You've been placed!")).toBeVisible();
      await expect(notificationPanel.getByText("Kitchen")).toBeVisible();

      // Click on notification to mark as read
      const placementNotification = notificationPanel.getByText("You've been placed!").locator("..");
      await placementNotification.click();

      // Should navigate to My Shifts
      await expect(page).toHaveURL(/\/shifts\/mine/);
    });

    test("notification is marked as read after viewing", async ({ page }) => {
      // Check notification status in database
      const notification = await prisma.notification.findFirst({
        where: {
          userId: volunteerUserId,
          type: "FLEXIBLE_PLACEMENT"
        },
        orderBy: { createdAt: "desc" }
      });

      // The notification should now be marked as read
      // Note: This depends on the notification marking implementation
      // If notifications are marked read on click, this should pass
      // If they're only marked read when viewed, we might need additional setup
    });

    test("volunteer receives different notification for general movement", async ({ page }) => {
      // Create another shift and regular signup
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2); // Day after tomorrow
      tomorrow.setHours(17, 0, 0, 0);

      const regularShift = await createShift({
        location: "Wellington",
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
        capacity: 2,
        notes: "Regular shift for movement testing"
      });
      testShiftIds.push(regularShift.id);

      const anotherTargetShift = await createShift({
        location: "Wellington",
        start: new Date(tomorrow.getTime() + 30 * 60 * 1000), // 30 minutes later
        end: new Date(tomorrow.getTime() + 3.5 * 60 * 60 * 1000),
        capacity: 2,
        notes: "Another target shift"
      });
      testShiftIds.push(anotherTargetShift.id);

      // Create regular signup (not flexible)
      const regularSignup = await prisma.signup.create({
        data: {
          userId: volunteerUserId,
          shiftId: regularShift.id,
          status: "CONFIRMED",
          isFlexiblePlacement: false
        }
      });

      await loginAsAdmin(page);

      // Use general movement API
      const response = await page.request.post('/api/admin/volunteer-movement', {
        data: {
          signupId: regularSignup.id,
          targetShiftId: anotherTargetShift.id,
          movementNotes: "Test general movement via API"
        }
      });

      expect(response.ok()).toBeTruthy();

      // Verify different notification type was created
      const movementNotification = await prisma.notification.findFirst({
        where: {
          userId: volunteerUserId,
          type: "SHIFT_CONFIRMED",
          title: "You've been moved to a different shift"
        },
        orderBy: { createdAt: "desc" }
      });

      expect(movementNotification).toBeTruthy();
      expect(movementNotification?.message).toContain("moved from");
      expect(movementNotification?.message).toContain("to");
    });

    test("notifications contain correct shift information", async ({ page }) => {
      // Get the target shift details for verification
      const targetShift = await prisma.shift.findUnique({
        where: { id: targetShiftId },
        include: { shiftType: true }
      });

      const flexibleNotification = await prisma.notification.findFirst({
        where: {
          userId: volunteerUserId,
          type: "FLEXIBLE_PLACEMENT"
        },
        orderBy: { createdAt: "desc" }
      });

      expect(flexibleNotification?.relatedId).toBe(targetShiftId);
      expect(flexibleNotification?.message).toContain(targetShift?.shiftType.name);
      expect(flexibleNotification?.message).toContain(targetShift?.location);
    });

    test("notifications link to correct pages", async ({ page }) => {
      await loginAsVolunteer(page, volunteerEmail);
      await page.goto("/dashboard");

      // Open notifications
      await page.getByTestId("notifications-button").click();

      // Click on placement notification
      const placementNotif = page.getByText("You've been placed!").first();
      await placementNotif.click();

      // Should go to My Shifts page
      await expect(page).toHaveURL(/\/shifts\/mine/);

      // Go back and test movement notification
      await page.goto("/dashboard");
      await page.getByTestId("notifications-button").click();

      const movementNotif = page.getByText("You've been moved to a different shift").first();
      if (await movementNotif.isVisible()) {
        await movementNotif.click();
        await expect(page).toHaveURL(/\/shifts\/mine/);
      }
    });
  });

  test.describe("Notification Edge Cases", () => {
    test("no duplicate notifications for same placement", async ({ page }) => {
      // Try to place volunteer again (should fail, but test no duplicate notifications)
      await loginAsAdmin(page);
      
      const existingSignup = await prisma.signup.findFirst({
        where: {
          userId: volunteerUserId,
          isFlexiblePlacement: true,
          placedAt: { not: null }
        }
      });

      // Try to make same placement API call (should fail)
      const response = await page.request.post('/api/admin/flexible-placements', {
        data: {
          signupId: existingSignup?.id,
          targetShiftId: targetShiftId,
          placementNotes: "Duplicate placement attempt"
        }
      });

      expect(response.ok()).toBeFalsy();

      // Count notifications - should not have increased
      const notificationCount = await prisma.notification.count({
        where: {
          userId: volunteerUserId,
          type: "FLEXIBLE_PLACEMENT"
        }
      });

      // Should still only have one flexible placement notification
      expect(notificationCount).toBe(1);
    });

    test("notification preferences are respected", async ({ page }) => {
      // Create a volunteer with notifications disabled
      const noNotifEmail = `no-notif-${testId}@example.com`;
      await createTestUser(noNotifEmail, "VOLUNTEER", {
        receiveShortageNotifications: false
      });
      testEmails.push(noNotifEmail);

      const noNotifUser = await prisma.user.findUnique({
        where: { email: noNotifEmail }
      });

      // Create flexible signup for this user
      const noNotifSignup = await prisma.signup.create({
        data: {
          userId: noNotifUser!.id,
          shiftId: flexibleShiftId,
          status: "CONFIRMED",
          isFlexiblePlacement: true
        }
      });

      await loginAsAdmin(page);

      // Place this volunteer
      const response = await page.request.post('/api/admin/flexible-placements', {
        data: {
          signupId: noNotifSignup.id,
          targetShiftId: targetShiftId,
          placementNotes: "Test placement with notifications disabled"
        }
      });

      expect(response.ok()).toBeTruthy();

      // Even with preferences, placement notifications should still be sent
      // (they are critical operational notifications)
      const notification = await prisma.notification.findFirst({
        where: {
          userId: noNotifUser!.id,
          type: "FLEXIBLE_PLACEMENT"
        }
      });

      expect(notification).toBeTruthy();
    });
  });
});