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

test.describe("Flexible Placement System", () => {
  const testId = randomUUID().slice(0, 8);
  const adminEmail = `admin-flexible-${testId}@example.com`;
  const volunteerEmail = `volunteer-flexible-${testId}@example.com`;
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

    // Get volunteer user ID for notifications
    const volunteer = await prisma.user.findUnique({
      where: { email: volunteerEmail }
    });
    volunteerUserId = volunteer!.id;

    // Ensure the "Anywhere I'm Needed (PM)" shift type exists
    let flexibleShiftType = await prisma.shiftType.findUnique({
      where: { name: "Anywhere I'm Needed (PM)" }
    });

    if (!flexibleShiftType) {
      flexibleShiftType = await prisma.shiftType.create({
        data: {
          name: "Anywhere I'm Needed (PM)",
          description: "Flexible placement for PM shifts starting after 4:00pm - you'll be assigned to where help is most needed",
        }
      });
    }
    flexibleShiftTypeId = flexibleShiftType.id;

    // Create a flexible shift for tomorrow at 4:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0); // 4:00 PM

    const flexibleShift = await createShift({
      location: "Wellington",
      start: tomorrow,
      end: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000), // 5 hours later (9:00 PM)
      capacity: 3,
      shiftTypeId: flexibleShiftTypeId,
    });
    flexibleShiftId = flexibleShift.id;
    testShiftIds.push(flexibleShiftId);

    // Create a target shift for placement (Kitchen Service)
    const targetShift = await createShift({
      location: "Wellington", 
      start: new Date(tomorrow.getTime() + 1.5 * 60 * 60 * 1000), // 5:30 PM
      end: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000), // 9:00 PM
      capacity: 2,
      notes: "Kitchen service target shift",
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

    // Cleanup test users and shifts
    await deleteTestUsers(testEmails);
    await deleteTestShifts(testShiftIds);
  });

  test.describe("Volunteer Flexible Signup Flow", () => {
    test("volunteer can sign up for 'Anywhere I'm Needed' shift", async ({ page }) => {
      await loginAsVolunteer(page, volunteerEmail);
      await page.goto("/shifts");
      await page.waitForLoadState("load");

      // Look for the flexible shift type
      const flexibleShiftCard = page.locator('[data-testid*="shift-card"]').filter({
        hasText: "Anywhere I'm Needed (PM)"
      }).first();

      await expect(flexibleShiftCard).toBeVisible();
      await expect(flexibleShiftCard).toContainText("Flexible placement for PM shifts");

      // Click signup button
      const signupButton = flexibleShiftCard.getByTestId("shift-signup-button");
      await expect(signupButton).toBeVisible();
      await signupButton.click();

      // Wait for success message or redirect
      await page.waitForTimeout(2000);

      // Verify the signup was created as flexible
      const signup = await prisma.signup.findFirst({
        where: {
          shiftId: flexibleShiftId,
          user: { email: volunteerEmail }
        }
      });

      expect(signup).toBeTruthy();
      expect(signup?.isFlexiblePlacement).toBe(true);
      expect(signup?.placedAt).toBeNull();
    });

    test("volunteer can view their flexible shift in My Shifts", async ({ page }) => {
      await loginAsVolunteer(page, volunteerEmail);
      await page.goto("/shifts/mine");
      await page.waitForLoadState("load");

      // Should see the flexible shift
      await expect(page.getByText("Anywhere I'm Needed (PM)")).toBeVisible();
      await expect(page.getByText("Flexible placement")).toBeVisible();
    });
  });

  test.describe("Admin Flexible Placement Management", () => {
    test("admin can see flexible placements needing assignment", async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to shifts page for tomorrow
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

      // Should see the flexible placement section
      await expect(page.getByText("Flexible Placements Needed")).toBeVisible();
      await expect(page.getByText("1 volunteer signed up for \"Anywhere I'm Needed\"")).toBeVisible();

      // Should see the volunteer in the flexible placement list
      await expect(page.getByText("Test User")).toBeVisible();
      await expect(page.getByTestId("volunteer-status-")).toContainText("Standard");
    });

    test("admin can place volunteer from flexible to specific shift", async ({ page }) => {
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

      // Click "Place Volunteer" button
      const placeButton = page.getByText("Place Volunteer");
      await expect(placeButton).toBeVisible();
      await placeButton.click();

      // Dialog should open
      await expect(page.getByText("Place Test User in PM Shift")).toBeVisible();

      // Select target shift
      await page.getByRole("combobox").click();
      await page.getByRole("option").first().click();

      // Add placement notes
      await page.getByPlaceholder("Add any notes about this placement...").fill("Placed in kitchen service due to experience");

      // Click place volunteer button
      await page.getByRole("button", { name: "Place Volunteer" }).click();

      // Wait for success
      await page.waitForTimeout(2000);

      // Verify the signup was updated
      const updatedSignup = await prisma.signup.findFirst({
        where: {
          user: { email: volunteerEmail },
          isFlexiblePlacement: true
        }
      });

      expect(updatedSignup?.shiftId).toBe(targetShiftId);
      expect(updatedSignup?.originalShiftId).toBe(flexibleShiftId);
      expect(updatedSignup?.placedAt).not.toBeNull();
      expect(updatedSignup?.placementNotes).toContain("experience");
    });

    test("volunteer receives notification about placement", async ({ page }) => {
      await loginAsVolunteer(page, volunteerEmail);
      await page.goto("/dashboard");
      await page.waitForLoadState("load");

      // Check for placement notification
      const notificationBell = page.getByTestId("notifications-button");
      await expect(notificationBell).toBeVisible();
      
      // Check if there's an unread notification indicator
      const unreadIndicator = page.getByTestId("unread-notifications-indicator");
      if (await unreadIndicator.isVisible()) {
        await notificationBell.click();
        await expect(page.getByText("You've been placed!")).toBeVisible();
        await expect(page.getByText("Kitchen")).toBeVisible();
      }

      // Verify the notification exists in the database
      const notification = await prisma.notification.findFirst({
        where: {
          userId: volunteerUserId,
          type: "FLEXIBLE_PLACEMENT"
        }
      });

      expect(notification).toBeTruthy();
      expect(notification?.title).toBe("You've been placed!");
    });

    test("flexible placement section disappears after all volunteers are placed", async ({ page }) => {
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

      // Flexible placements section should not be visible (all volunteers placed)
      await expect(page.getByText("Flexible Placements Needed")).not.toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("admin cannot place volunteer in full capacity shift", async ({ page }) => {
      // First fill up the target shift to capacity
      const additionalVolunteers = [];
      for (let i = 0; i < 2; i++) {
        const email = `fill-volunteer-${testId}-${i}@example.com`;
        await createTestUser(email, "VOLUNTEER");
        additionalVolunteers.push(email);
        
        const user = await prisma.user.findUnique({ where: { email } });
        await prisma.signup.create({
          data: {
            userId: user!.id,
            shiftId: targetShiftId,
            status: "CONFIRMED"
          }
        });
      }

      // Try to create another flexible signup
      const newVolunteerEmail = `new-flexible-${testId}@example.com`;
      await createTestUser(newVolunteerEmail, "VOLUNTEER");
      testEmails.push(newVolunteerEmail);
      
      const newUser = await prisma.user.findUnique({ where: { email: newVolunteerEmail } });
      await prisma.signup.create({
        data: {
          userId: newUser!.id,
          shiftId: flexibleShiftId,
          status: "CONFIRMED",
          isFlexiblePlacement: true
        }
      });

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

      // Try to place the new volunteer
      const placeButtons = page.getByText("Place Volunteer");
      await placeButtons.last().click();

      // Select the now-full target shift
      await page.getByRole("combobox").click();
      
      // Should not see any available shifts (all full)
      const options = page.getByRole("option");
      const optionCount = await options.count();
      expect(optionCount).toBe(0);

      // Close the dialog
      await page.getByRole("button", { name: "Cancel" }).click();

      // Cleanup additional test users
      await deleteTestUsers(additionalVolunteers);
      testEmails.push(...additionalVolunteers);
    });
  });
});