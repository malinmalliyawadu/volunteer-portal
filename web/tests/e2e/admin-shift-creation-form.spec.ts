import { test, expect } from "./base";
import { loginAsAdmin } from "./helpers/auth";
import { 
  createTestUser, 
  deleteTestUsers, 
  deleteTestShifts 
} from "./helpers/test-helpers";
import { randomUUID } from "crypto";

test.describe("Admin Shift Creation Form", () => {
  const testId = randomUUID().slice(0, 8);
  const testEmails = [`admin-shift-creation-${testId}@example.com`];
  const testShiftIds: string[] = [];

  test.beforeAll(async () => {
    await createTestUser(testEmails[0], "ADMIN");
  });

  test.afterAll(async () => {
    await deleteTestUsers(testEmails);
    await deleteTestShifts(testShiftIds);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Shift Template Management", () => {
    test("should display shift templates section with default templates", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check templates section is visible
      await expect(page.getByTestId("shift-templates-section")).toBeVisible();
      
      // Check some default templates exist (using actual template names)
      await expect(page.getByTestId("template-kitchen-prep")).toBeVisible();
      await expect(page.getByTestId("template-front-of-house")).toBeVisible();
      
      // Check add template button
      await expect(page.getByTestId("add-template-button")).toBeVisible();
    });

    test("should allow creating a new shift template", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Open add template dialog
      await page.getByTestId("add-template-button").click();
      
      // Fill template form
      await page.getByTestId("template-name-input").fill("Test Evening Shift");
      await page.getByTestId("template-start-time-input").fill("18:00");
      await page.getByTestId("template-end-time-input").fill("22:00");
      await page.getByTestId("template-capacity-input").fill("5");
      
      // Select shift type
      await page.getByTestId("template-shift-type-select").click();
      await page.getByRole("option").first().click();
      
      await page.getByTestId("template-notes-textarea").fill("Evening service shift");
      
      // Save template
      await page.getByTestId("save-template-button").click();
      
      // Verify template appears in the list
      await expect(page.getByTestId("template-test-evening-shift")).toBeVisible();
      await expect(page.getByText("18:00-22:00 • 5 volunteers")).toBeVisible();
    });

    test("should allow editing an existing template", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Hover over a template to reveal edit button
      const templateButton = page.getByTestId("template-kitchen-prep");
      await templateButton.hover();
      
      // Click edit button
      await page.getByTestId("edit-template-kitchen-prep").click();
      
      // Modify template
      await page.getByTestId("edit-template-name-input").fill("Modified Kitchen Prep");
      await page.getByTestId("edit-template-capacity-input").fill("4");
      
      // Save changes
      await page.getByTestId("save-edit-template-button").click();
      
      // Verify changes
      await expect(page.getByTestId("template-modified-kitchen-prep")).toBeVisible();
      await expect(page.getByText("• 4 volunteers")).toBeVisible();
    });

    test("should allow deleting a template with confirmation", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Create a template to delete first
      await page.getByTestId("add-template-button").click();
      await page.getByTestId("template-name-input").fill("Delete Me");
      await page.getByTestId("template-start-time-input").fill("10:00");
      await page.getByTestId("template-end-time-input").fill("14:00");
      await page.getByTestId("template-capacity-input").fill("2");
      await page.getByTestId("template-shift-type-select").click();
      await page.getByRole("option").first().click();
      await page.getByTestId("save-template-button").click();

      // Hover and delete
      await page.getByTestId("template-delete-me").hover();
      await page.getByTestId("delete-template-delete-me").click();
      
      // Confirm deletion
      await page.getByRole("button", { name: "Delete Template" }).click();
      
      // Verify template is removed
      await expect(page.getByTestId("template-delete-me")).not.toBeVisible();
    });

    test("should apply template values to form when clicked", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Click on a template
      await page.getByTestId("template-kitchen-prep").click();

      // Verify form fields are populated
      await expect(page.getByTestId("shift-start-time-input")).toHaveValue("12:00");
      await expect(page.getByTestId("shift-end-time-input")).toHaveValue("17:30");
      await expect(page.getByTestId("shift-capacity-input")).toHaveValue("3");
      
      // Verify template indicator is shown
      await expect(page.getByText("Using: Kitchen Prep")).toBeVisible();
    });
  });

  test.describe("Shift Type Management", () => {
    test("should allow creating a new shift type from the form", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Open create shift type dialog
      await page.getByTestId("create-shift-type-button").click();
      
      // Fill shift type form
      await page.getByTestId("shift-type-name-input").fill("Test Cleaning");
      await page.getByTestId("shift-type-description-textarea").fill("Deep cleaning duties");
      
      // Submit
      await page.getByTestId("create-shift-type-submit").click();
      
      // Verify redirect and success (would check for success message if implemented)
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
    });

    test("should validate shift type creation form", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Open create shift type dialog
      await page.getByTestId("create-shift-type-button").click();
      
      // Try to submit without name
      await page.getByTestId("create-shift-type-submit").click();
      
      // Form should not submit (browser validation)
      await expect(page.getByTestId("shift-type-name-input")).toBeVisible();
    });
  });

  test.describe("Enhanced Date/Time Selection", () => {
    test("should open calendar picker for date selection", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Click date picker button
      await page.getByTestId("shift-date-input").click();
      
      // Calendar should be visible
      await expect(page.getByRole("dialog")).toBeVisible();
      // Check for calendar grid with date buttons
      await expect(page.locator('[role="gridcell"] button')).toHaveCount.toBeGreaterThan(0);
    });

    test("should update form when template is selected", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Initially form should be empty
      await expect(page.getByTestId("shift-start-time-input")).toHaveValue("");
      
      // Click template
      await page.getByTestId("template-kitchen-prep").click();
      
      // Form should update with template values
      await expect(page.getByTestId("shift-start-time-input")).toHaveValue("12:00");
      await expect(page.getByTestId("shift-end-time-input")).toHaveValue("17:30");
    });
  });

  test.describe("Form Integration", () => {
    test("should coordinate between template selection and manual input", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Select template
      await page.getByTestId("template-kitchen-prep").click();
      await expect(page.getByTestId("shift-capacity-input")).toHaveValue("3");
      
      // Manually change capacity
      await page.getByTestId("shift-capacity-input").fill("5");
      
      // Template indicator should disappear when form is manually modified
      await expect(page.getByText("Using: Kitchen Prep")).not.toBeVisible();
    });

    test("should require all required fields for single shift creation", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Try to submit without filling required fields
      await page.getByTestId("create-shift-button").click();
      
      // Should stay on form (browser validation will prevent submission)
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
    });

    test("should create single shift with complete form data", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Select shift type
      await page.getByTestId("shift-type-select").click();
      await page.getByRole("option").first().click();

      // Fill date
      await page.getByTestId("shift-date-input").click();
      // Select the first available date in the calendar
      await page.getByRole("button", { name: /^\d+$/ }).first().click();

      // Fill times
      await page.getByTestId("shift-start-time-input").fill("14:00");
      await page.getByTestId("shift-end-time-input").fill("18:00");

      // Select location
      await page.getByTestId("shift-location-select").click();
      await page.getByRole("option", { name: "Wellington" }).click();

      // Set capacity
      await page.getByTestId("shift-capacity-input").fill("4");

      // Add notes
      await page.getByTestId("shift-notes-textarea").fill("Test shift notes");

      // Submit form
      await page.getByTestId("create-shift-button").click();

      // Should redirect to shifts list
      await expect(page).toHaveURL(/\/admin\/shifts/);
    });
  });

  test.describe("Bulk Shift Creation", () => {
    test("should show enhanced bulk creation form in second tab", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Switch to bulk creation tab
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
      
      // Check bulk-specific elements
      await expect(page.getByTestId("bulk-start-date-input")).toBeVisible();
      await expect(page.getByTestId("bulk-end-date-input")).toBeVisible();
      
      // Check template checkboxes for bulk creation
      await expect(page.getByTestId("template-kitchen-prep-checkbox")).toBeVisible();
      await expect(page.getByTestId("template-front-of-house-checkbox")).toBeVisible();
    });

    test("should open calendar picker for bulk date range", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Switch to bulk creation
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
      
      // Click start date picker
      await page.getByTestId("bulk-start-date-input").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      
      // Close and try end date
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100); // Small delay to ensure dialog closes
      await page.getByTestId("bulk-end-date-input").click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("should display template information with shift type names", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Switch to bulk creation
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
      
      // Check that templates show shift type information
      await expect(page.getByText("Shift Type:")).toBeVisible();
      await expect(page.getByText("12:00 - 17:30 • 3 volunteers")).toBeVisible();
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test("should be responsive on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check that main elements are still visible
      await expect(page.getByTestId("shift-templates-section")).toBeVisible();
      await expect(page.getByTestId("shift-type-select")).toBeVisible();
      await expect(page.getByTestId("shift-date-input")).toBeVisible();
    });
  });
});