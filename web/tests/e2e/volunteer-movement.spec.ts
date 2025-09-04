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

test.describe("General Volunteer Movement System", () => {
  const testId = randomUUID().slice(0, 8);
  const adminEmail = `admin-movement-${testId}@example.com`;
  const volunteerEmail = `volunteer-movement-${testId}@example.com`;
  const testEmails = [adminEmail, volunteerEmail];
  const testShiftIds: string[] = [];
  let volunteerUserId: string;
  let sourceShiftId: string;
  let targetShiftId: string;
  let signupId: string;

  test.beforeAll(async () => {
    // Create test users
    await createTestUser(adminEmail, "ADMIN");
    await createTestUser(volunteerEmail, "VOLUNTEER");

    // Get volunteer user ID
    const volunteer = await prisma.user.findUnique({
      where: { email: volunteerEmail }
    });
    volunteerUserId = volunteer!.id;

    // Create shifts for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 30, 0, 0); // 5:30 PM

    // Create source shift (Kitchen Prep & Service)
    const kitchenShiftType = await prisma.shiftType.findFirst({
      where: { name: "Kitchen Prep & Service" }
    });

    const sourceShift = await createShift({
      location: "Wellington",
      start: tomorrow,
      end: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
      capacity: 4,
      shiftTypeId: kitchenShiftType?.id,
      notes: "Source shift for movement testing",
    });
    sourceShiftId = sourceShift.id;
    testShiftIds.push(sourceShiftId);

    // Create target shift (Front of House)
    const fohShiftType = await prisma.shiftType.findFirst({
      where: { name: "FOH Set-Up & Service" }
    });

    const targetShift = await createShift({
      location: "Wellington",
      start: new Date(tomorrow.getTime() - 60 * 60 * 1000), // 1 hour earlier (4:30 PM)
      end: new Date(tomorrow.getTime() + 3.5 * 60 * 60 * 1000),
      capacity: 2,
      shiftTypeId: fohShiftType?.id,
      notes: "Target shift for movement testing",
    });
    targetShiftId = targetShift.id;
    testShiftIds.push(targetShiftId);

    // Create initial signup
    const signup = await prisma.signup.create({
      data: {
        userId: volunteerUserId,
        shiftId: sourceShiftId,
        status: "CONFIRMED"
      }
    });
    signupId = signup.id;
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

    // Cleanup test users and shifts
    await deleteTestUsers(testEmails);
    await deleteTestShifts(testShiftIds);
  });

  test.describe("Admin Volunteer Movement Interface", () => {
    test("admin can see move button for confirmed volunteers", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Select Wellington location
      await page.getByTestId("location-selector").click();
      await page.getByRole("option", { name: "Wellington" }).click();

      // Navigate to tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateSelector = page.getByTestId("date-picker");
      await dateSelector.click();
      await page.getByRole("gridcell", { name: tomorrow.getDate().toString() }).click();

      // Find the shift card with our volunteer
      const shiftCard = page.locator('[data-testid*="shift-card"]').filter({
        hasText: "Test User"
      }).first();

      await expect(shiftCard).toBeVisible();
      
      // Should see confirmed status
      await expect(shiftCard.getByText("Confirmed")).toBeVisible();
      
      // Should see the move button (blue arrow icon)
      const moveButton = shiftCard.getByTestId(/.*-move-button/);
      await expect(moveButton).toBeVisible();
      await expect(moveButton).toHaveAttribute("title", "Move to different shift");
    });

    test("admin can move volunteer to different shift", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Select Wellington and tomorrow's date
      await page.getByTestId("location-selector").click();
      await page.getByRole("option", { name: "Wellington" }).click();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateSelector = page.getByTestId("date-picker");
      await dateSelector.click();
      await page.getByRole("gridcell", { name: tomorrow.getDate().toString() }).click();

      // Find and click the move button
      const shiftCard = page.locator('[data-testid*="shift-card"]').filter({
        hasText: "Test User"
      }).first();
      
      const moveButton = shiftCard.getByTestId(/.*-move-button/);
      await moveButton.click();

      // Dialog should open
      await expect(page.getByText("Move Test User to Different Shift")).toBeVisible();
      await expect(page.getByText("Move this volunteer from")).toBeVisible();

      // Select target shift from dropdown
      const dropdown = page.getByRole("combobox");
      await dropdown.click();
      
      // Should see available shifts with capacity info
      const targetOption = page.getByRole("option").filter({
        hasText: "FOH Set-Up & Service"
      }).first();
      await expect(targetOption).toBeVisible();
      await expect(targetOption).toContainText("spots available");
      await targetOption.click();

      // Add movement notes
      const notesField = page.getByPlaceholder("Add any notes about this movement...");
      await notesField.fill("Moved to FOH due to preference and experience");

      // Click move volunteer button
      const moveVolunteerButton = page.getByRole("button", { name: "Move Volunteer" });
      await expect(moveVolunteerButton).toBeEnabled();
      await moveVolunteerButton.click();

      // Wait for success and dialog to close
      await page.waitForTimeout(2000);
      await expect(page.getByText("Move Test User to Different Shift")).not.toBeVisible();

      // Verify the signup was moved in database
      const movedSignup = await prisma.signup.findUnique({
        where: { id: signupId }
      });

      expect(movedSignup?.shiftId).toBe(targetShiftId);
      expect(movedSignup?.originalShiftId).toBe(sourceShiftId);
      expect(movedSignup?.status).toBe("CONFIRMED");
    });

    test("volunteer now appears in target shift", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Select Wellington and tomorrow's date
      await page.getByTestId("location-selector").click();
      await page.getByRole("option", { name: "Wellington" }).click();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateSelector = page.getByTestId("date-picker");
      await dateSelector.click();
      await page.getByRole("gridcell", { name: tomorrow.getDate().toString() }).click();

      // Find the FOH shift card - volunteer should now be there
      const fohShiftCard = page.locator('[data-testid*="shift-card"]').filter({
        hasText: "FOH Set-Up & Service"
      }).first();

      await expect(fohShiftCard).toBeVisible();
      await expect(fohShiftCard.getByText("Test User")).toBeVisible();
      await expect(fohShiftCard.getByText("Confirmed")).toBeVisible();

      // Original shift should no longer have the volunteer
      const originalShiftCard = page.locator('[data-testid*="shift-card"]').filter({
        hasText: "Kitchen Prep & Service"
      }).first();

      if (await originalShiftCard.isVisible()) {
        await expect(originalShiftCard.getByText("Test User")).not.toBeVisible();
      }
    });

    test("volunteer receives notification about movement", async ({ page }) => {
      await loginAsVolunteer(page, volunteerEmail);
      await page.goto("/dashboard");
      await page.waitForLoadState("load");

      // Check for movement notification
      const notificationBell = page.getByTestId("notifications-button");
      await expect(notificationBell).toBeVisible();
      
      // Click to view notifications
      await notificationBell.click();
      
      // Should see movement notification
      await expect(page.getByText("You've been moved to a different shift")).toBeVisible();
      await expect(page.getByText("FOH Set-Up & Service")).toBeVisible();

      // Verify notification exists in database
      const notification = await prisma.notification.findFirst({
        where: {
          userId: volunteerUserId,
          type: "SHIFT_CONFIRMED",
          title: "You've been moved to a different shift"
        }
      });

      expect(notification).toBeTruthy();
      expect(notification?.message).toContain("FOH Set-Up & Service");
    });

    test("volunteer can see updated shift in My Shifts", async ({ page }) => {
      await loginAsVolunteer(page, volunteerEmail);
      await page.goto("/shifts/mine");
      await page.waitForLoadState("load");

      // Should see the new shift
      await expect(page.getByText("FOH Set-Up & Service")).toBeVisible();
      
      // Should not see the original shift
      await expect(page.getByText("Kitchen Prep & Service")).not.toBeVisible();
    });
  });

  test.describe("Movement Validation", () => {
    test("admin cannot move volunteer to same shift", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Select Wellington and tomorrow's date
      await page.getByTestId("location-selector").click();
      await page.getByRole("option", { name: "Wellington" }).click();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateSelector = page.getByTestId("date-picker");
      await dateSelector.click();
      await page.getByRole("gridcell", { name: tomorrow.getDate().toString() }).click();

      // Find the FOH shift card where volunteer is currently assigned
      const fohShiftCard = page.locator('[data-testid*="shift-card"]').filter({
        hasText: "FOH Set-Up & Service"
      }).first();

      const moveButton = fohShiftCard.getByTestId(/.*-move-button/);
      await moveButton.click();

      // Dialog should open
      await expect(page.getByText("Move Test User to Different Shift")).toBeVisible();

      // Click dropdown to see available options
      const dropdown = page.getByRole("combobox");
      await dropdown.click();

      // Should not see the current shift (FOH) in the dropdown since they're already on it
      const options = page.getByRole("option");
      const optionTexts = await options.allTextContents();
      const hasFOHOption = optionTexts.some(text => text.includes("FOH Set-Up & Service"));
      
      expect(hasFOHOption).toBeFalsy();

      // Close dialog
      await page.getByRole("button", { name: "Cancel" }).click();
    });

    test("admin cannot move volunteer to create double booking", async ({ page }) => {
      // Create another shift on the same day and sign up the volunteer
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0); // 7:00 PM

      const eveningShift = await createShift({
        location: "Wellington",
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        capacity: 1,
        notes: "Evening shift for double booking test"
      });
      testShiftIds.push(eveningShift.id);

      // Create another volunteer and sign them up for evening shift
      const anotherVolunteerEmail = `another-volunteer-${testId}@example.com`;
      await createTestUser(anotherVolunteerEmail, "VOLUNTEER");
      testEmails.push(anotherVolunteerEmail);

      const anotherVolunteer = await prisma.user.findUnique({
        where: { email: anotherVolunteerEmail }
      });

      await prisma.signup.create({
        data: {
          userId: anotherVolunteer!.id,
          shiftId: eveningShift.id,
          status: "CONFIRMED"
        }
      });

      await loginAsAdmin(page);
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Select Wellington and tomorrow's date  
      await page.getByTestId("location-selector").click();
      await page.getByRole("option", { name: "Wellington" }).click();

      const dateSelector = page.getByTestId("date-picker");
      await dateSelector.click();
      await page.getByRole("gridcell", { name: tomorrow.getDate().toString() }).click();

      // Try to move our main test volunteer to the evening shift (would create double booking)
      const fohShiftCard = page.locator('[data-testid*="shift-card"]').filter({
        hasText: "Test User"
      }).first();

      const moveButton = fohShiftCard.getByTestId(/.*-move-button/);
      await moveButton.click();

      await page.getByRole("combobox").click();
      const eveningOption = page.getByRole("option").last();
      await eveningOption.click();

      await page.getByRole("button", { name: "Move Volunteer" }).click();

      // Should see error message
      await page.waitForTimeout(2000);
      
      // The move should fail - volunteer should still be in FOH shift
      const currentSignup = await prisma.signup.findUnique({
        where: { id: signupId }
      });
      
      // Should still be in target shift (FOH), not moved to evening shift
      expect(currentSignup?.shiftId).toBe(targetShiftId);
    });
  });

  test.describe("Movement History Tracking", () => {
    test("system tracks original shift ID when volunteer is moved", async ({ page }) => {
      // Verify the signup has tracking info from the movement
      const signup = await prisma.signup.findUnique({
        where: { id: signupId }
      });

      expect(signup?.originalShiftId).toBe(sourceShiftId);
      expect(signup?.shiftId).toBe(targetShiftId);
    });

    test("system maintains audit trail of movements", async ({ page }) => {
      // Check that notifications were created for movements
      const notifications = await prisma.notification.findMany({
        where: {
          userId: volunteerUserId,
          type: "SHIFT_CONFIRMED"
        },
        orderBy: { createdAt: "desc" }
      });

      expect(notifications.length).toBeGreaterThan(0);
      
      const movementNotification = notifications.find(n => 
        n.title === "You've been moved to a different shift"
      );
      
      expect(movementNotification).toBeTruthy();
    });
  });
});