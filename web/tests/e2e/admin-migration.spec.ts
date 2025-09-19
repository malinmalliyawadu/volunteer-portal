import { test, expect } from "./base";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import path from "path";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Admin Migration System", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to migration page
    await page.click('[data-testid="user-migration-button"]');
    await expect(page).toHaveURL("/admin/migration");
  });

  test.describe("Migration Status Tab", () => {
    test("should display migration statistics", async ({ page }) => {
      // Switch to migration status tab
      await page.getByTestId("tab-migration-status").click();

      // Wait for the stats to load
      await expect(page.getByTestId("migrated-users-card")).toBeVisible({
        timeout: 10000,
      });

      // Check statistics cards are visible
      await expect(
        page
          .getByTestId("migrated-users-card")
          .locator("text=Migrated Users")
      ).toBeVisible();
      await expect(
        page
          .getByTestId("migrated-shifts-card")
          .locator("text=Nova Shifts")
      ).toBeVisible();
      await expect(
        page.getByTestId("migrated-signups-card").locator("text=Nova Signups")
      ).toBeVisible();
      await expect(
        page.getByTestId("shift-types-card").locator("text=Shift Types")
      ).toBeVisible();
    });

    test("should show migrated data sections", async ({ page }) => {
      // Switch to migration status tab
      await page.getByTestId("tab-migration-status").click();

      // Check migrated data section
      await expect(
        page.locator("text=All Migrated Data")
      ).toBeVisible({ timeout: 10000 });
      
      // Check that tabs for different data types exist (use role="tab" to be more specific)
      await expect(page.getByRole("tab", { name: /Users \(\d+\)/ })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Shifts \(\d+\)/ })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Signups \(\d+\)/ })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Types \(\d+\)/ })).toBeVisible();
    });
  });

  test.describe("User Invitations Tab", () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we have migrated users by running a quick migration
      const validCsvPath = path.join(
        __dirname,
        "../fixtures/migration-test-data.csv"
      );
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await page.getByText("Validate CSV").click();
      await expect(page.getByTestId("validation-title")).toBeVisible({
        timeout: 10000,
      });
      await page.getByTestId("execute-migration-button").click();
      await expect(page.getByTestId("migration-results-title")).toBeVisible({
        timeout: 15000,
      });

      // Switch to invitations tab
      await page.getByTestId("tab-user-invitations").click();
    });

    test("should display invitation statistics", async ({ page }) => {
      // Wait for the statistics cards to load
      await expect(page.getByTestId("total-migrated-card")).toBeVisible({
        timeout: 10000,
      });

      // Check statistics cards are present
      await expect(
        page.getByTestId("total-migrated-card").locator("text=Total Migrated")
      ).toBeVisible();
      await expect(
        page.getByTestId("pending-invitations-card").locator("text=Pending")
      ).toBeVisible();
      await expect(
        page.getByTestId("invited-users-card").locator("text=Invited")
      ).toBeVisible();
      await expect(
        page.getByTestId("expired-invitations-card").locator("text=Expired")
      ).toBeVisible();
      await expect(
        page
          .getByTestId("completed-registrations-card")
          .locator("text=Completed")
      ).toBeVisible();
    });

    test("should show migrated users list", async ({ page }) => {
      // Wait for users to load
      await expect(page.getByTestId("total-migrated-card")).toBeVisible({
        timeout: 10000,
      });

      // Check users are displayed
      await expect(page.locator("text=john.doe@test.com")).toBeVisible();
      await expect(page.locator("text=sarah.smith@test.com")).toBeVisible();

      // Check status badges (look for badge with pending status)
      await expect(
        page.locator('[data-slot="badge"]').locator("text=Pending").first()
      ).toBeVisible();
    });

    test("should filter users by status", async ({ page }) => {
      // Wait for users to load first
      await expect(page.getByTestId("total-migrated-card")).toBeVisible({
        timeout: 10000,
      });

      // Test filter dropdown
      await page.getByTestId("filter-status-select").selectOption("pending");
      await expect(page.locator("text=john.doe@test.com")).toBeVisible();

      await page.getByTestId("filter-status-select").selectOption("all");
      await expect(page.locator("text=john.doe@test.com")).toBeVisible();
    });

    test("should search users by email", async ({ page }) => {
      // Wait for users to load first
      await expect(page.getByTestId("total-migrated-card")).toBeVisible({
        timeout: 10000,
      });

      // Test search functionality
      await page.getByTestId("search-users-input").fill("john.doe");
      await expect(page.locator("text=john.doe@test.com")).toBeVisible();
      await expect(page.locator("text=sarah.smith@test.com")).not.toBeVisible();

      // Clear search
      await page.getByTestId("search-users-input").fill("");
      await expect(page.locator("text=sarah.smith@test.com")).toBeVisible();
    });

    test("should select and send invitations", async ({ page }) => {
      // Wait for users to load first
      await expect(page.getByTestId("total-migrated-card")).toBeVisible({
        timeout: 10000,
      });

      // Skip if no migrated users exist
      const totalMigratedCard = page.getByTestId("total-migrated-card");
      const totalText = await totalMigratedCard.textContent();
      const totalUsers = parseInt(totalText?.match(/\d+/)?.[0] || "0");

      if (totalUsers === 0) {
        test.skip(true, "No migrated users available to send invitations to");
      }

      // Check if there are user checkboxes available
      const userCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await userCheckboxes.count();

      if (checkboxCount <= 1) {
        test.skip(
          true,
          "No user checkboxes available - no migrated users found"
        );
      }

      // Select first user checkbox (skip select all checkbox)
      await userCheckboxes.nth(1).check({ force: true });

      // Check send button is enabled
      const sendButton = page.getByTestId("send-invitations-button");
      await expect(sendButton).toBeEnabled();

      // Send invitations
      await sendButton.click();

      // Wait for invitations to be sent
      await expect(page.locator("text=Successfully sent")).toBeVisible({
        timeout: 10000,
      });

      // Check registration URLs dialog appears
      await expect(page.getByTestId("registration-urls-dialog")).toBeVisible();
      await expect(
        page.locator("text=Registration URLs Generated")
      ).toBeVisible();

      // Check copy functionality
      await expect(page.getByTestId("copy-all-urls-button")).toBeVisible();

      // Close dialog
      await page.keyboard.press("Escape");
      await expect(
        page.getByTestId("registration-urls-dialog")
      ).not.toBeVisible();
    });

    test("should send invitations without custom message template", async ({
      page,
    }) => {
      // Wait for users to load first
      await expect(page.getByTestId("total-migrated-card")).toBeVisible({
        timeout: 10000,
      });

      // Verify custom message textarea is NOT present (removed functionality)
      await expect(
        page.getByTestId("custom-message-textarea")
      ).not.toBeVisible();

      // Skip if no migrated users exist
      const totalMigratedCard = page.getByTestId("total-migrated-card");
      const totalText = await totalMigratedCard.textContent();
      const totalUsers = parseInt(totalText?.match(/\d+/)?.[0] || "0");

      if (totalUsers === 0) {
        test.skip(true, "No migrated users available to send invitations to");
      }

      // Check if there are user checkboxes available
      const userCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await userCheckboxes.count();

      if (checkboxCount <= 1) {
        test.skip(
          true,
          "No user checkboxes available - no migrated users found"
        );
      }

      // Select first user checkbox (skip select all checkbox)
      await userCheckboxes.nth(1).check({ force: true });

      await page.getByTestId("send-invitations-button").click();

      // Verify invitation sent successfully (using Campaign Monitor templates)
      await expect(page.locator("text=Successfully sent")).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Error Handling", () => {
    test("should handle file upload errors", async ({ page }) => {
      // Try to upload non-CSV file
      const textFilePath = path.join(__dirname, "../fixtures/test.txt");

      // Create a temporary text file for testing
      writeFileSync(textFilePath, "This is not a CSV file");

      try {
        await page.locator('input[type="file"]').setInputFiles(textFilePath);
        // The error message now appears as a toast notification
        await expect(
          page.locator("text=Please select a CSV file")
        ).toBeVisible();
      } finally {
        // Clean up
        unlinkSync(textFilePath);
      }
    });

    test("should handle network errors gracefully", async ({ page }) => {
      // Mock network failure for validation endpoint
      await page.route("**/api/admin/migration/validate", (route) => {
        route.abort("failed");
      });

      const validCsvPath = path.join(
        __dirname,
        "../fixtures/migration-test-data.csv"
      );
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await page.getByText("Validate CSV").click();

      // Check error message appears as toast
      await expect(
        page.locator("text=Failed to validate CSV file")
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
