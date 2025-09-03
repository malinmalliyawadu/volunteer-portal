import { test, expect } from "./base";
import { loginAsAdmin, loginAsVolunteer } from "./helpers/auth";
import { 
  createTestUser, 
  deleteTestUsers, 
  createShift, 
  deleteTestShifts 
} from "./helpers/test-helpers";
import { randomUUID } from "crypto";

test.describe("Admin Shifts Page", () => {
  const testId = randomUUID().slice(0, 8);
  const testEmails = [`admin-shifts-test-${testId}@example.com`, `volunteer-shifts-test-${testId}@example.com`];
  const testShiftIds: string[] = [];

  test.beforeAll(async () => {
    // Create test users with unique emails
    await createTestUser(testEmails[0], "ADMIN");
    await createTestUser(testEmails[1], "VOLUNTEER");
  });

  test.afterAll(async () => {
    // Cleanup test users and shifts
    await deleteTestUsers(testEmails);
    await deleteTestShifts(testShiftIds);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display admin shifts page with correct title and elements", async ({ page }) => {
    await page.goto("/admin/shifts");
    await page.waitForLoadState("load");

    // Check page title and description
    await expect(page.getByTestId("admin-page-header")).toContainText("Restaurant Schedule");
    
    // Check navigation controls are present
    await expect(page.getByText("Location:")).toBeVisible();
    await expect(page.getByTestId("today-button")).toBeVisible();
    await expect(page.getByTestId("create-shift-button")).toBeVisible();
  });

  test("should show calendar date picker instead of prev/next buttons", async ({ page }) => {
    await page.goto("/admin/shifts");
    await page.waitForLoadState("load");

    // Check that old navigation buttons are not present
    await expect(page.getByTestId("prev-date-button")).not.toBeVisible();
    await expect(page.getByTestId("next-date-button")).not.toBeVisible();

    // Check that calendar button is present
    const calendarButton = page.locator('button').filter({ hasText: /\d{4}/ }); // Button with year
    await expect(calendarButton).toBeVisible();
  });

  test("should open calendar popup when clicking date button", async ({ page }) => {
    await page.goto("/admin/shifts");
    await page.waitForLoadState("load");

    // Click the calendar button
    const calendarButton = page.locator('button').filter({ hasText: /\d{4}/ });
    await calendarButton.click();

    // Check that calendar popup is visible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Legend:")).toBeVisible();
    await expect(page.getByText("Fully Staffed")).toBeVisible();
    await expect(page.getByText("Critical")).toBeVisible();
  });

  test("should change location using location selector", async ({ page }) => {
    await page.goto("/admin/shifts");
    await page.waitForLoadState("load");

    // Check current location
    const locationSelector = page.getByTestId("location-selector");
    await expect(locationSelector).toBeVisible();

    // Change to a different location
    await locationSelector.click();
    await page.getByText("Glenn Innes").click();

    // Check URL updated with new location
    await expect(page).toHaveURL(/location=Glenn%20Innes/);
  });

  test("should navigate to today when clicking today button", async ({ page }) => {
    // Go to a specific date first
    await page.goto("/admin/shifts?date=2024-01-01");
    await page.waitForLoadState("load");

    // Click today button
    await page.getByTestId("today-button").click();

    // Check that we're now on today's date
    const today = new Date().toISOString().split('T')[0];
    await expect(page).toHaveURL(new RegExp(`date=${today}`));
  });

  test("should navigate to create shift page when clicking Add Shift", async ({ page }) => {
    await page.goto("/admin/shifts");
    await page.waitForLoadState("load");

    await page.getByTestId("create-shift-button").click();
    await expect(page).toHaveURL("/admin/shifts/new");
  });

  test("should display no shifts message when no shifts exist", async ({ page }) => {
    // Navigate to a date with no shifts
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.goto(`/admin/shifts?date=${futureDateStr}`);
    await page.waitForLoadState("load");

    // Check no shifts message
    await expect(page.getByText("No shifts scheduled")).toBeVisible();
    await expect(page.getByText("Create First Shift")).toBeVisible();
  });

  test("should restrict access to volunteers", async ({ page }) => {
    await loginAsVolunteer(page);
    
    await page.goto("/admin/shifts");
    
    // Should be redirected to volunteer dashboard page
    await expect(page).toHaveURL("/dashboard");
  });

  test.describe("With Test Shifts", () => {
    test.beforeEach(async () => {
      // Create test shifts for different scenarios
      const today = new Date();
      const shiftDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const shift1 = await createShift({
        location: "Wellington",
        start: new Date(shiftDate.setHours(10, 0)),
        capacity: 4
      });
      testShiftIds.push(shift1.id);

      const shift2 = await createShift({
        location: "Wellington", 
        start: new Date(shiftDate.setHours(14, 0)),
        capacity: 2
      });
      testShiftIds.push(shift2.id);
    });

    test("should display shift cards with correct information", async ({ page }) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      await page.goto(`/admin/shifts?date=${tomorrowStr}&location=Wellington`);
      await page.waitForLoadState("load");

      // Check that shift cards are displayed
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      await expect(shiftCards).toHaveCount(2);

      // Check shift details are visible
      await expect(page.getByText("Kitchen")).toBeVisible();
      await expect(page.getByText("10:00 AM")).toBeVisible();
      await expect(page.getByText("2:00 PM")).toBeVisible();
    });

    test("should show volunteer grade information", async ({ page }) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      await page.goto(`/admin/shifts?date=${tomorrowStr}&location=Wellington`);
      await page.waitForLoadState("load");

      // Check for "No volunteers yet" message in empty shift using testid
      await expect(page.locator('[data-testid^="no-volunteers-"]').first()).toBeVisible();
    });

    test("should display staffing status correctly", async ({ page }) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      await page.goto(`/admin/shifts?date=${tomorrowStr}&location=Wellington`);
      await page.waitForLoadState("load");

      // Check staffing badges
      const staffingBadges = page.locator('.bg-red-500, .bg-orange-500, .bg-yellow-500, .bg-green-400, .bg-green-500');
      await expect(staffingBadges.first()).toBeVisible();

      // Check capacity display (0/4, 0/2, etc.)
      await expect(page.getByText("0/4")).toBeVisible();
      await expect(page.getByText("0/2")).toBeVisible();
    });

    test("should show status indicators for different volunteer statuses", async ({ page }) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      await page.goto(`/admin/shifts?date=${tomorrowStr}&location=Wellington`);
      await page.waitForLoadState("load");

      // Should show "Critical" status for unstaffed shifts
      await expect(page.getByText("Critical")).toBeVisible();
    });
  });

  test.describe("Calendar Functionality", () => {
    test("should show shift indicators in calendar", async ({ page }) => {
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Open calendar
      const calendarButton = page.locator('button').filter({ hasText: /\d{4}/ });
      await calendarButton.click();

      // Check calendar is visible
      await expect(page.getByRole("dialog")).toBeVisible();
      
      // Days without shifts should be disabled
      const disabledDays = page.locator('[disabled]').filter({ hasText: /^\d+$/ });
      await expect(disabledDays.first()).toBeVisible();
    });

    test("should close calendar when selecting a date with shifts", async ({ page }) => {
      // First create a shift for today
      const today = new Date();
      const shift = await createShift({
        location: "Wellington",
        start: new Date(today.setHours(15, 0)),
        capacity: 3
      });
      testShiftIds.push(shift.id);

      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Open calendar
      const calendarButton = page.locator('button').filter({ hasText: /\d{4}/ });
      await calendarButton.click();

      // Click on today (which should have a shift)
      const todayButton = page.locator('[role="button"]').filter({ hasText: new RegExp(`^${today.getDate()}$`) });
      await todayButton.click();

      // Calendar should close
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("should display legend in calendar popup", async ({ page }) => {
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Open calendar
      const calendarButton = page.locator('button').filter({ hasText: /\d{4}/ });
      await calendarButton.click();

      // Check legend items
      await expect(page.getByText("Legend:")).toBeVisible();
      await expect(page.getByText("Fully Staffed (100%+)")).toBeVisible();
      await expect(page.getByText("Needs More (50-74%)")).toBeVisible();
      await expect(page.getByText("Critical (<25%)")).toBeVisible();
    });
  });

  test.describe("Success Messages", () => {
    test("should show success message when shift created", async ({ page }) => {
      await page.goto("/admin/shifts?created=1");
      await page.waitForLoadState("load");

      await expect(page.getByTestId("shift-created-message")).toBeVisible();
      await expect(page.getByText("Shift created successfully!")).toBeVisible();
    });

    test("should show success message when shift updated", async ({ page }) => {
      await page.goto("/admin/shifts?updated=1");
      await page.waitForLoadState("load");

      await expect(page.getByTestId("shift-updated-message")).toBeVisible();
      await expect(page.getByText("Shift updated successfully!")).toBeVisible();
    });

    test("should show success message when shift deleted", async ({ page }) => {
      await page.goto("/admin/shifts?deleted=1");
      await page.waitForLoadState("load");

      await expect(page.getByTestId("shift-deleted-message")).toBeVisible();
      await expect(page.getByText("Shift deleted successfully!")).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Check that key elements are still visible on mobile
      await expect(page.getByTestId("create-shift-button")).toBeVisible();
      await expect(page.getByText("Location:")).toBeVisible();
      
      // Calendar button should still be clickable
      const calendarButton = page.locator('button').filter({ hasText: /\d{4}/ });
      await expect(calendarButton).toBeVisible();
    });

    test("should stack elements properly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/admin/shifts");
      await page.waitForLoadState("load");

      // Navigation should stack vertically on tablet
      const navigationControls = page.locator('.flex-col');
      await expect(navigationControls.first()).toBeVisible();
    });
  });
});