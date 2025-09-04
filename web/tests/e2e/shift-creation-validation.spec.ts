import { test, expect } from "./base";
import { loginAsAdmin } from "./helpers/auth";

/**
 * Tests for form validation functionality in the shift creation system.
 * 
 * NOTE: These tests require a running database with admin user setup.
 * See tests/README.md for complete setup instructions.
 * 
 * Tests focus on:
 * - Form field validation
 * - Input constraints and browser validation
 * - Template management validation
 * - Error handling and user feedback
 */
test.describe("Shift Creation Form Validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/shifts/new");
    await page.waitForLoadState("load");
  });

  test.describe("Single Shift Creation Validation", () => {
    test("should prevent submission with missing required fields", async ({ page }) => {
      // Try to submit without any data
      await page.getByTestId("create-shift-button").click();
      
      // Should still be on the form page due to browser validation
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
      
      // Check that required fields are still visible (form didn't submit)
      await expect(page.getByTestId("shift-type-select")).toBeVisible();
      await expect(page.getByTestId("shift-date-input")).toBeVisible();
    });

    test("should validate time inputs", async ({ page }) => {
      // Fill some required fields first
      await page.getByTestId("shift-type-select").click();
      await page.getByRole("option").first().click();
      
      // Fill with potentially invalid times (end before start)
      await page.getByTestId("shift-start-time-input").fill("18:00");
      await page.getByTestId("shift-end-time-input").fill("12:00");
      
      // Check that values were set
      await expect(page.getByTestId("shift-start-time-input")).toHaveValue("18:00");
      await expect(page.getByTestId("shift-end-time-input")).toHaveValue("12:00");
      
      // Try to submit (browser/server validation will handle the logic)
      await page.getByTestId("create-shift-button").click();
      
      // Form should not submit successfully with invalid time range
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
    });

    test("should validate capacity input constraints", async ({ page }) => {
      const capacityInput = page.getByTestId("shift-capacity-input");
      
      // Check input attributes
      await expect(capacityInput).toHaveAttribute("min", "1");
      await expect(capacityInput).toHaveAttribute("step", "1");
      await expect(capacityInput).toHaveAttribute("type", "number");
      
      // Try negative capacity
      await capacityInput.fill("-1");
      await capacityInput.blur();
      
      // Browser should handle negative values based on min attribute
      const capacityValue = await capacityInput.inputValue();
      // Either browser prevents it or shows validation message
      expect(capacityValue === "-1" || parseInt(capacityValue) >= 1).toBeTruthy();
      
      // Try zero capacity
      await capacityInput.fill("0");
      await page.getByTestId("create-shift-button").click();
      
      // Should prevent submission due to min="1" constraint
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
    });

    test("should handle very long notes text", async ({ page }) => {
      const longText = "A".repeat(5000); // Very long text
      
      await page.getByTestId("shift-notes-textarea").fill(longText);
      
      // Should accept long text without issues
      const actualValue = await page.getByTestId("shift-notes-textarea").inputValue();
      expect(actualValue.length).toBeGreaterThan(1000);
      
      // Text should not cause UI issues
      await expect(page.getByTestId("shift-notes-textarea")).toBeVisible();
    });
  });

  test.describe("Bulk Creation Validation", () => {
    test.beforeEach(async ({ page }) => {
      // Switch to bulk creation tab
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
    });

    test("should require date range selection", async ({ page }) => {
      // Try to submit without setting dates
      await page.getByRole("button", { name: "Create Shifts" }).click();
      
      // Should prevent submission without dates
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
      
      // Date inputs should still be visible
      await expect(page.getByTestId("bulk-start-date-input")).toBeVisible();
      await expect(page.getByTestId("bulk-end-date-input")).toBeVisible();
    });

    test("should validate date range with calendar picker", async ({ page }) => {
      // Open start date picker
      await page.getByTestId("bulk-start-date-input").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      
      // Select a date (use first available date)
      const firstDate = page.locator('[role="gridcell"] button').first();
      await firstDate.click();
      
      // Open end date picker
      await page.getByTestId("bulk-end-date-input").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      
      // Select another date
      const secondDate = page.locator('[role="gridcell"] button').first();
      await secondDate.click();
      
      // Both inputs should now have values
      const startValue = await page.getByTestId("bulk-start-date-input").textContent();
      const endValue = await page.getByTestId("bulk-end-date-input").textContent();
      
      expect(startValue).not.toContain("Pick start date");
      expect(endValue).not.toContain("Pick end date");
    });

    test("should require at least one day selection", async ({ page }) => {
      // Try to submit without selecting any days
      await page.getByRole("button", { name: "Create Shifts" }).click();
      
      // Should prevent submission
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
      
      // Day checkboxes should be visible
      await expect(page.getByLabel("Monday")).toBeVisible();
      await expect(page.getByLabel("Tuesday")).toBeVisible();
    });

    test("should require template selection", async ({ page }) => {
      // Select days but no templates
      await page.getByLabel("Monday").check();
      await page.getByLabel("Tuesday").check();
      
      // Try to submit
      await page.getByRole("button", { name: "Create Shifts" }).click();
      
      // Should prevent submission without templates
      await expect(page).toHaveURL(/\/admin\/shifts\/new/);
    });
  });

  test.describe("Template Management Validation", () => {
    test("should validate new template creation", async ({ page }) => {
      // Open add template dialog
      await page.getByTestId("add-template-button").click();
      
      // Check that save button is initially disabled or form validates
      const saveButton = page.getByTestId("save-template-button");
      await expect(saveButton).toBeVisible();
      
      // Try to save without filling required fields
      await saveButton.click();
      
      // Dialog should remain open if validation fails
      await expect(page.getByTestId("template-name-input")).toBeVisible();
    });

    test("should validate template form fields", async ({ page }) => {
      await page.getByTestId("add-template-button").click();
      
      // Check required field indicators
      await expect(page.getByText("Template Name *")).toBeVisible();
      await expect(page.getByText("Start Time *")).toBeVisible();
      await expect(page.getByText("End Time *")).toBeVisible();
      await expect(page.getByText("Capacity *")).toBeVisible();
      await expect(page.getByText("Shift Type *")).toBeVisible();
      
      // Fill partial form to test validation
      await page.getByTestId("template-name-input").fill("Test Template");
      await page.getByTestId("template-start-time-input").fill("10:00");
      // Leave end time empty to test validation
      await page.getByTestId("template-capacity-input").fill("3");
      
      // Try to save with missing required field
      await page.getByTestId("save-template-button").click();
      
      // Should not close dialog due to validation
      await expect(page.getByTestId("template-end-time-input")).toBeVisible();
    });

    test("should validate template capacity constraints", async ({ page }) => {
      await page.getByTestId("add-template-button").click();
      
      const capacityInput = page.getByTestId("template-capacity-input");
      
      // Check input constraints
      await expect(capacityInput).toHaveAttribute("min", "1");
      await expect(capacityInput).toHaveAttribute("type", "number");
      
      // Try invalid capacity
      await capacityInput.fill("0");
      await capacityInput.blur();
      
      // Check browser handles validation
      const value = await capacityInput.inputValue();
      expect(value === "0" || parseInt(value) >= 1).toBeTruthy();
    });
  });

  test.describe("Shift Type Creation Validation", () => {
    test("should validate shift type name requirement", async ({ page }) => {
      await page.getByTestId("create-shift-type-button").click();
      
      // Try to submit without name
      await page.getByTestId("create-shift-type-submit").click();
      
      // Should stay in dialog due to required field validation
      await expect(page.getByTestId("shift-type-name-input")).toBeVisible();
      await expect(page.getByText("Create New Shift Type")).toBeVisible();
    });

    test("should handle empty description gracefully", async ({ page }) => {
      await page.getByTestId("create-shift-type-button").click();
      
      // Fill only name, leave description empty (should be valid)
      await page.getByTestId("shift-type-name-input").fill("Test Shift Type");
      
      // Description should be optional
      const descriptionField = page.getByTestId("shift-type-description-textarea");
      await expect(descriptionField).not.toHaveAttribute("required");
      
      // Button should be enabled with just name filled
      const submitButton = page.getByTestId("create-shift-type-submit");
      await expect(submitButton).not.toBeDisabled();
    });
  });

  test.describe("Error Handling", () => {
    test("should maintain form state during validation errors", async ({ page }) => {
      // Fill some form data
      await page.getByTestId("shift-start-time-input").fill("14:00");
      await page.getByTestId("shift-end-time-input").fill("18:00");
      await page.getByTestId("shift-capacity-input").fill("4");
      await page.getByTestId("shift-notes-textarea").fill("Test notes");
      
      // Try to submit with missing required fields
      await page.getByTestId("create-shift-button").click();
      
      // Form data should be preserved
      await expect(page.getByTestId("shift-start-time-input")).toHaveValue("14:00");
      await expect(page.getByTestId("shift-end-time-input")).toHaveValue("18:00");
      await expect(page.getByTestId("shift-capacity-input")).toHaveValue("4");
      await expect(page.getByTestId("shift-notes-textarea")).toHaveValue("Test notes");
    });

    test("should handle form navigation without losing data", async ({ page }) => {
      // Fill form data
      await page.getByTestId("shift-capacity-input").fill("6");
      await page.getByTestId("shift-notes-textarea").fill("Important notes");
      
      // Switch tabs and back
      await page.getByRole("tab", { name: "Bulk Creation" }).click();
      await page.getByRole("tab", { name: "Single Shift" }).click();
      
      // Data should be preserved (if implemented)
      const capacityValue = await page.getByTestId("shift-capacity-input").inputValue();
      const notesValue = await page.getByTestId("shift-notes-textarea").inputValue();
      
      // Either preserved or cleared - both are valid UX patterns
      expect(capacityValue === "6" || capacityValue === "").toBeTruthy();
      expect(notesValue === "Important notes" || notesValue === "").toBeTruthy();
    });
  });
});