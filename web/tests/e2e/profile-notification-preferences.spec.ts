import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUsers, login } from "./helpers/test-helpers";
import { randomUUID } from "node:crypto";

test.describe("User Notification Preferences", () => {
  let volunteerEmail: string;

  test.beforeEach(async () => {
    // Create a test volunteer
    volunteerEmail = `volunteer-prefs-${randomUUID()}@test.com`;
    await createTestUser(volunteerEmail, "VOLUNTEER", {
      availableLocations: JSON.stringify(["Wellington"]),
      availableDays: JSON.stringify(["Monday", "Wednesday"]),
      receiveShortageNotifications: true,
      excludedShortageNotificationTypes: [],
    });
  });

  test.afterEach(async () => {
    // Clean up test data
    if (volunteerEmail) {
      await deleteTestUsers([volunteerEmail]);
    }
  });

  test("should display notification preferences in profile", async ({
    page,
  }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile");

    // Check that notification section exists
    await expect(
      page.getByTestId("notification-preferences-section")
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Shift Shortage Notifications/i })
    ).toBeVisible();

    // Check current preferences are displayed
    const notificationToggle = page.getByTestId("receive-notifications-toggle");
    await expect(notificationToggle).toBeVisible();
    await expect(notificationToggle).toBeChecked();

    // Check that shift type preferences are available
    await expect(
      page.getByText("Shift types you'd like notifications for")
    ).toBeVisible();
  });

  test("should edit notification preferences", async ({ page }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile");

    // Click edit button
    await page.getByTestId("edit-notification-preferences").click();

    // Check edit form is visible
    await expect(
      page.getByTestId("notification-preferences-form")
    ).toBeVisible();

    // Toggle off notifications
    await page.getByTestId("receive-notifications-toggle").click();

    // Toggle some shift type preferences
    const kitchenCheckbox = page.getByLabel("Kitchen");
    if (await kitchenCheckbox.isVisible()) {
      await kitchenCheckbox.click();
    }

    // Save changes
    await page.getByTestId("save-notification-preferences").click();

    // Check success message
    await expect(page.getByTestId("success-message")).toContainText(
      "Notification preferences updated"
    );

    // Verify changes persisted
    await page.reload();
    const notificationToggle = page.getByTestId("receive-notifications-toggle");
    await expect(notificationToggle).not.toBeChecked();
  });

  test("should load and display shift types", async ({ page }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile/edit");

    // Navigate to communication step
    await page.getByText("Communication & Agreements").click();

    // Enable shortage notifications
    const notificationToggle = page.getByTestId("receive-notifications-toggle");
    if (!(await notificationToggle.isChecked())) {
      await notificationToggle.click();
    }

    // Wait for shift types to load
    await page.waitForTimeout(2000);

    // Check that shift types are loaded and not showing "Loading..."
    const shiftTypesSection = page
      .locator('[data-testid="shift-type-preferences"]')
      .or(
        page
          .locator('text="Shift types you\'d like notifications for"')
          .locator("..")
      );

    // Should not show loading text
    await expect(page.getByText("Loading shift types...")).not.toBeVisible({
      timeout: 5000,
    });

    // Should have actual shift type checkboxes
    const shiftTypeCheckboxes = page
      .locator('input[type="checkbox"]')
      .and(page.locator("text=/Kitchen|Service|Cleanup/").locator(".."));
    await expect(shiftTypeCheckboxes.first()).toBeVisible();
  });

  test("should manage shift type preferences", async ({ page }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile");

    // Click edit button
    await page.getByTestId("edit-notification-preferences").click();

    // Open shift type preferences
    await page.getByTestId("shift-type-preferences-button").click();

    // Check that shift types are listed
    await expect(page.getByTestId("shift-type-list")).toBeVisible();

    // Select specific shift types
    await page.getByLabel("Kitchen").check();
    await page.getByLabel("Service").check();

    // Verify "All shift types" is unchecked when specific types selected
    const allTypesCheckbox = page.getByLabel("All shift types");
    await expect(allTypesCheckbox).not.toBeChecked();

    // Save changes
    await page.getByTestId("save-notification-preferences").click();

    // Check success message
    await expect(page.getByTestId("success-message")).toContainText(
      "Notification preferences updated"
    );

    // Verify changes persisted
    await page.reload();
    await page.getByTestId("edit-notification-preferences").click();
    await page.getByTestId("shift-type-preferences-button").click();

    await expect(page.getByLabel("Kitchen")).toBeChecked();
    await expect(page.getByLabel("Service")).toBeChecked();
    await expect(page.getByLabel("All shift types")).not.toBeChecked();
  });

  test('should select all shift types when "All" is selected', async ({
    page,
  }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile");

    // Click edit button
    await page.getByTestId("edit-notification-preferences").click();

    // Open shift type preferences
    await page.getByTestId("shift-type-preferences-button").click();

    // First select some specific types
    await page.getByLabel("Kitchen").check();
    await page.getByLabel("Service").check();

    // Now select "All shift types"
    await page.getByLabel("All shift types").check();

    // Verify individual checkboxes are unchecked
    await expect(page.getByLabel("Kitchen")).not.toBeChecked();
    await expect(page.getByLabel("Service")).not.toBeChecked();

    // Save changes
    await page.getByTestId("save-notification-preferences").click();

    // Verify empty array saved (meaning all types)
    await page.reload();
    await page.getByTestId("edit-notification-preferences").click();
    await page.getByTestId("shift-type-preferences-button").click();

    await expect(page.getByLabel("All shift types")).toBeChecked();
  });

  test("should disable all fields when notifications are turned off", async ({
    page,
  }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile");

    // Click edit button
    await page.getByTestId("edit-notification-preferences").click();

    // Toggle off notifications
    await page.getByTestId("receive-notifications-toggle").click();

    // Check that shift type preferences are disabled
    await expect(
      page.getByTestId("shift-type-preferences-button")
    ).toBeDisabled();

    // Save changes
    await page.getByTestId("save-notification-preferences").click();

    // Verify state persisted
    await page.reload();
    await page.getByTestId("edit-notification-preferences").click();

    await expect(
      page.getByTestId("receive-notifications-toggle")
    ).not.toBeChecked();
    await expect(
      page.getByTestId("shift-type-preferences-button")
    ).toBeDisabled();
  });

  test("should display warning when opting out of notifications", async ({
    page,
  }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile");

    // Click edit button
    await page.getByTestId("edit-notification-preferences").click();

    // Toggle off notifications
    await page.getByTestId("receive-notifications-toggle").click();

    // Check warning message appears
    await expect(page.getByTestId("opt-out-warning")).toBeVisible();
    await expect(page.getByTestId("opt-out-warning")).toContainText(
      "You will not receive shortage notifications"
    );

    // Toggle back on
    await page.getByTestId("receive-notifications-toggle").click();

    // Warning should disappear
    await expect(page.getByTestId("opt-out-warning")).not.toBeVisible();
  });

  test("should handle concurrent edits gracefully", async ({
    page,
    context,
  }) => {
    await login(page, volunteerEmail, "Test123456");
    await page.goto("/profile");

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto("/profile");

    // Start editing in both tabs
    await page.getByTestId("edit-notification-preferences").click();
    await page2.getByTestId("edit-notification-preferences").click();

    // Make different changes in each tab
    await page.getByTestId("receive-notifications-toggle").click(); // Turn off in first tab

    await page2.getByLabel("Kitchen").click(); // Toggle kitchen notifications in second tab

    // Save first tab
    await page.getByTestId("save-notification-preferences").click();
    await expect(page.getByTestId("success-message")).toContainText(
      "Notification preferences updated"
    );

    // Try to save second tab
    await page2.getByTestId("save-notification-preferences").click();

    // Should either succeed (last write wins) or show conflict message
    const success = page2.getByTestId("success-message");
    const conflict = page2.getByTestId("conflict-message");

    // One of these should be visible
    await expect(success.or(conflict)).toBeVisible();

    // Close second tab
    await page2.close();
  });
});
