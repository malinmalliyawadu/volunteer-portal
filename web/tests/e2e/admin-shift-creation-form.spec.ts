import { test, expect } from "./base";
import { loginAsAdmin } from "./helpers/auth";

/**
 * Tests for the enhanced admin shift creation form components.
 * 
 * NOTE: These tests require a running database with admin user setup.
 * The tests will fail if:
 * - Database is not running on localhost:5432
 * - Admin user is not properly seeded in the database
 * - Authentication system is not functional
 * 
 * Tests focus on UI component functionality including:
 * - Template management system
 * - Form field interactions
 * - Calendar date pickers
 * - Bulk creation workflow
 * - Form validation
 * - Accessibility features
 */
test.describe("Admin Shift Creation Form", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Basic Form Structure", () => {
    test("should display shift creation form with main elements", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check main tabs
      await expect(page.getByRole("tab", { name: "Single Shift" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Bulk Creation" })).toBeVisible();
      
      // Check form sections are present
      await expect(page.getByText("Quick Templates")).toBeVisible();
      await expect(page.getByText("Shift Type")).toBeVisible();
      await expect(page.getByText("Schedule")).toBeVisible();
      await expect(page.getByText("Location & Capacity")).toBeVisible();
      await expect(page.getByText("Additional Information")).toBeVisible();
    });

    test("should have create shift type functionality", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check create shift type button exists
      await expect(page.getByTestId("create-shift-type-button")).toBeVisible();
      
      // Open create shift type dialog
      await page.getByTestId("create-shift-type-button").click();
      
      // Check dialog content
      await expect(page.getByText("Create New Shift Type")).toBeVisible();
      await expect(page.getByTestId("shift-type-name-input")).toBeVisible();
      await expect(page.getByTestId("shift-type-description-textarea")).toBeVisible();
      await expect(page.getByTestId("create-shift-type-submit")).toBeVisible();
    });
  });

  test.describe("Template Management UI", () => {
    test("should display template management interface", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check templates section
      await expect(page.getByTestId("shift-templates-section")).toBeVisible();
      await expect(page.getByTestId("add-template-button")).toBeVisible();
      
      // Check that some default templates are visible
      const templateElements = page.locator('[data-testid^="template-"]').first();
      await expect(templateElements).toBeVisible();
    });

    test("should open add template dialog", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Open add template dialog
      await page.getByTestId("add-template-button").click();
      
      // Check dialog form fields
      await expect(page.getByText("Add New Template")).toBeVisible();
      await expect(page.getByTestId("template-name-input")).toBeVisible();
      await expect(page.getByTestId("template-start-time-input")).toBeVisible();
      await expect(page.getByTestId("template-end-time-input")).toBeVisible();
      await expect(page.getByTestId("template-capacity-input")).toBeVisible();
      await expect(page.getByTestId("template-shift-type-select")).toBeVisible();
      await expect(page.getByTestId("template-notes-textarea")).toBeVisible();
      await expect(page.getByTestId("save-template-button")).toBeVisible();
    });
  });

  test.describe("Form Fields and Interactions", () => {
    test("should have all required form fields", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check main form fields exist
      await expect(page.getByTestId("shift-type-select")).toBeVisible();
      await expect(page.getByTestId("shift-date-input")).toBeVisible();
      await expect(page.getByTestId("shift-start-time-input")).toBeVisible();
      await expect(page.getByTestId("shift-end-time-input")).toBeVisible();
      await expect(page.getByTestId("shift-location-select")).toBeVisible();
      await expect(page.getByTestId("shift-capacity-input")).toBeVisible();
      await expect(page.getByTestId("shift-notes-textarea")).toBeVisible();
      await expect(page.getByTestId("create-shift-button")).toBeVisible();
    });

    test("should open calendar picker for date selection", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Click date picker button
      await page.getByTestId("shift-date-input").click();
      
      // Calendar should be visible
      await expect(page.getByRole("dialog")).toBeVisible();
      
      // Check for calendar grid with date buttons
      const dateButtons = page.locator('[role="gridcell"] button');
      await expect(dateButtons.first()).toBeVisible();
    });

    test("should accept manual input in time fields", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Test time inputs accept values
      await page.getByTestId("shift-start-time-input").fill("14:00");
      await expect(page.getByTestId("shift-start-time-input")).toHaveValue("14:00");
      
      await page.getByTestId("shift-end-time-input").fill("18:00");
      await expect(page.getByTestId("shift-end-time-input")).toHaveValue("18:00");
    });

    test("should accept capacity input", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      await page.getByTestId("shift-capacity-input").fill("5");
      await expect(page.getByTestId("shift-capacity-input")).toHaveValue("5");
    });
  });

  test.describe("Bulk Creation Tab", () => {
    test("should switch to bulk creation tab", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Switch to bulk creation tab
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
      
      // Check bulk-specific elements
      await expect(page.getByTestId("bulk-start-date-input")).toBeVisible();
      await expect(page.getByTestId("bulk-end-date-input")).toBeVisible();
      await expect(page.getByText("Date Range")).toBeVisible();
      await expect(page.getByText("Days Selection")).toBeVisible();
      await expect(page.getByText("Shift Templates")).toBeVisible();
    });

    test("should have day selection checkboxes", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Switch to bulk creation
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
      
      // Check day checkboxes exist
      await expect(page.getByLabel("Monday")).toBeVisible();
      await expect(page.getByLabel("Tuesday")).toBeVisible();
      await expect(page.getByLabel("Wednesday")).toBeVisible();
      await expect(page.getByLabel("Thursday")).toBeVisible();
      await expect(page.getByLabel("Friday")).toBeVisible();
      await expect(page.getByLabel("Saturday")).toBeVisible();
      await expect(page.getByLabel("Sunday")).toBeVisible();
    });

    test("should open calendar pickers for bulk date range", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Switch to bulk creation
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
      
      // Click start date picker
      await page.getByTestId("bulk-start-date-input").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      
      // Close and try end date
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      await page.getByTestId("bulk-end-date-input").click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  });

  test.describe("Form Validation", () => {
    test("should have required field indicators", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check for required field labels (with asterisks)
      await expect(page.getByText("Select shift type *")).toBeVisible();
      await expect(page.getByText("Date *")).toBeVisible();
      await expect(page.getByText("Start time *")).toBeVisible();
      await expect(page.getByText("End time *")).toBeVisible();
      await expect(page.getByText("Location *")).toBeVisible();
      await expect(page.getByText("Volunteer capacity *")).toBeVisible();
    });

    test("should validate capacity input constraints", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      const capacityInput = page.getByTestId("shift-capacity-input");
      
      // Check min attribute
      await expect(capacityInput).toHaveAttribute("min", "1");
      await expect(capacityInput).toHaveAttribute("step", "1");
      await expect(capacityInput).toHaveAttribute("type", "number");
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper form labels and ARIA attributes", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check tab navigation
      await expect(page.getByRole("tablist")).toBeVisible();
      await expect(page.getByRole("tab", { name: "Single Shift" })).toHaveAttribute("aria-selected", "true");
      
      // Check form has proper structure
      const form = page.locator("form").first();
      await expect(form).toBeVisible();
    });

    test("should support keyboard navigation", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Test tab navigation
      await page.keyboard.press("Tab");
      const activeElement = page.locator(":focus");
      await expect(activeElement).toBeVisible();
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test("should be responsive on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/admin/shifts/new");
      await page.waitForLoadState("load");

      // Check that main elements are still visible on mobile
      await expect(page.getByRole("tab", { name: "Single Shift" })).toBeVisible();
      await expect(page.getByTestId("shift-type-select")).toBeVisible();
      await expect(page.getByTestId("create-shift-button")).toBeVisible();
    });
  });
});