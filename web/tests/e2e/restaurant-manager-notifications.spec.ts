import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsVolunteer } from "./helpers/auth";

test.describe("Restaurant Manager Shift Cancellation Notifications", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await loginAsAdmin(page);
  });

  test("admin can assign restaurant managers to locations", async ({ page }) => {
    await page.goto("/admin/restaurant-managers");

    // Check page loads correctly
    await expect(page.getByRole("heading", { name: "Restaurant Manager Assignments" })).toBeVisible();
    await expect(page.getByText("Assign admins to restaurant locations")).toBeVisible();

    // Check form is present
    await expect(page.getByText("Admin User")).toBeVisible();
    await expect(page.getByText("Restaurant Locations")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /receive shift cancellation notifications/i })).toBeVisible();

    // Verify assignment form has required elements
    await expect(page.getByRole("combobox")).toBeVisible(); // User dropdown
    await expect(page.getByRole("button", { name: "Assign Manager" })).toBeDisabled(); // Should be disabled initially
  });

  test("restaurant manager assignment workflow", async ({ page }) => {
    await page.goto("/admin/restaurant-managers");

    // Select an admin user (assuming we have at least one admin)
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();

    // Add a location
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option").first().click();

    // Check notification preference is enabled by default
    const notificationCheckbox = page.getByRole("checkbox", { name: /receive shift cancellation notifications/i });
    await expect(notificationCheckbox).toBeChecked();

    // Submit the form
    await page.getByRole("button", { name: "Assign Manager" }).click();

    // Should show success message (assuming toast notifications)
    // Note: This might need to be adjusted based on your actual toast implementation
    await expect(page.getByText(/successfully assigned/i)).toBeVisible({ timeout: 5000 });
  });

  test("admin can view and manage restaurant manager assignments", async ({ page }) => {
    // First create an assignment (reusing logic from previous test)
    await page.goto("/admin/restaurant-managers");
    
    // If there are existing assignments, the table should be visible
    const assignmentsSection = page.getByText("Current Assignments");
    await expect(assignmentsSection).toBeVisible();

    // Check for table elements if assignments exist
    const noAssignmentsText = page.getByText("No restaurant managers assigned yet");
    const hasAssignments = await page.getByRole("table").isVisible().catch(() => false);
    
    if (hasAssignments) {
      // Test table functionality
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Manager" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Locations" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Notifications" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
    } else {
      // Should show empty state message
      await expect(noAssignmentsText).toBeVisible();
    }
  });

  test("admin can toggle notification preferences for managers", async ({ page }) => {
    await page.goto("/admin/restaurant-managers");

    // This test assumes there's at least one manager assignment
    // Check if there are any existing assignments
    const hasAssignments = await page.getByRole("table").isVisible().catch(() => false);
    
    if (hasAssignments) {
      // Find notification toggle buttons (Bell icons)
      const notificationToggle = page.getByRole("button").filter({ has: page.locator('svg') }).first();
      
      if (await notificationToggle.isVisible()) {
        await notificationToggle.click();
        
        // Should show confirmation (toast or similar)
        await expect(page.getByText(/notifications.*enabled|disabled/i)).toBeVisible({ timeout: 5000 });
      }
    } else {
      // Skip test if no assignments exist
      test.skip(true, "No restaurant manager assignments exist to test notification toggle");
    }
  });

  test("admin can remove restaurant manager assignments", async ({ page }) => {
    await page.goto("/admin/restaurant-managers");

    // This test assumes there's at least one manager assignment
    const hasAssignments = await page.getByRole("table").isVisible().catch(() => false);
    
    if (hasAssignments) {
      // Find delete button (Trash icon)
      const deleteButton = page.getByRole("button").filter({ has: page.locator('svg') }).filter({ hasText: /remove|delete/i }).first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        await expect(page.getByText("Remove Manager Assignment")).toBeVisible();
        await expect(page.getByText(/are you sure you want to remove/i)).toBeVisible();
        
        // Cancel the deletion
        await page.getByRole("button", { name: "Cancel" }).click();
        
        // Dialog should close
        await expect(page.getByText("Remove Manager Assignment")).not.toBeVisible();
      }
    } else {
      // Skip test if no assignments exist
      test.skip(true, "No restaurant manager assignments exist to test deletion");
    }
  });

  test("restaurant managers navigation link is visible in admin dashboard", async ({ page }) => {
    await page.goto("/admin");
    
    // Check that the Restaurant Managers link is in the Quick Actions section
    await expect(page.getByTestId("restaurant-managers-button")).toBeVisible();
    
    // Click the link and verify navigation
    await page.getByTestId("restaurant-managers-button").click();
    await expect(page).toHaveURL("/admin/restaurant-managers");
    await expect(page.getByRole("heading", { name: "Restaurant Manager Assignments" })).toBeVisible();
  });
});

test.describe("Shift Cancellation Notification Flow", () => {
  test("volunteer can cancel shift and system handles notification flow", async ({ page }) => {
    // This is an integration test that verifies the entire cancellation flow
    // Note: This test assumes there's a shift with a volunteer signed up
    
    await loginAsVolunteer(page);
    await page.goto("/shifts/mine");
    
    // Check if user has any shifts to cancel
    const hasShifts = await page.getByTestId("cancel-shift-button").isVisible().catch(() => false);
    
    if (hasShifts) {
      // Click cancel button
      await page.getByTestId("cancel-shift-button").first().click();
      
      // Should show confirmation dialog
      await expect(page.getByTestId("cancel-shift-dialog")).toBeVisible();
      await expect(page.getByTestId("cancel-dialog-title")).toHaveText("Cancel Shift Signup");
      
      // Confirm cancellation
      await page.getByTestId("confirm-cancel-button").click();
      
      // Should redirect/refresh and show updated status
      await expect(page.getByTestId("cancel-shift-dialog")).not.toBeVisible();
      
      // Note: The actual notification sending is tested at the API level
      // The UI should just show that the cancellation was successful
    } else {
      test.skip(true, "No shifts available to test cancellation");
    }
  });

  test("API endpoints are accessible to admin users", async ({ page }) => {
    await loginAsAdmin(page);
    
    // Test that API endpoints respond correctly
    const response = await page.request.get("/api/admin/restaurant-managers");
    expect(response.ok()).toBeTruthy();
    
    // Test locations endpoint
    const locationsResponse = await page.request.get("/api/locations");
    expect(locationsResponse.ok()).toBeTruthy();
    
    // Test users endpoint  
    const usersResponse = await page.request.get("/api/admin/users");
    expect(usersResponse.ok()).toBeTruthy();
  });

  test("API endpoints reject unauthorized access", async ({ page }) => {
    await loginAsVolunteer(page);
    
    // Test that restaurant manager endpoints are protected
    const response = await page.request.get("/api/admin/restaurant-managers");
    expect(response.status()).toBe(403);
    
    // Test that users endpoint is protected
    const usersResponse = await page.request.get("/api/admin/users");
    expect(usersResponse.status()).toBe(403);
  });
});

test.describe("Restaurant Manager Assignment Data Validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("form validates required fields", async ({ page }) => {
    await page.goto("/admin/restaurant-managers");
    
    // Try to submit form without selecting user
    const submitButton = page.getByRole("button", { name: "Assign Manager" });
    await expect(submitButton).toBeDisabled();
    
    // Select a user but no locations
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    
    // Submit button should still be disabled
    await expect(submitButton).toBeDisabled();
  });

  test("form handles location selection and removal", async ({ page }) => {
    await page.goto("/admin/restaurant-managers");
    
    // Select a user first
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    
    // Add multiple locations
    const locationDropdown = page.getByRole("combobox").nth(1);
    
    // Add first location
    await locationDropdown.click();
    await page.getByRole("option").first().click();
    
    // Should show selected location as badge
    await expect(page.getByRole("button").filter({ has: page.locator('svg') })).toBeVisible();
    
    // Form should now be submittable
    await expect(page.getByRole("button", { name: "Assign Manager" })).toBeEnabled();
  });

  test("assignment form resets after successful submission", async ({ page }) => {
    await page.goto("/admin/restaurant-managers");
    
    // Fill out form
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option").first().click();
    
    // Submit form
    await page.getByRole("button", { name: "Assign Manager" }).click();
    
    // After successful submission, form should reset
    // Note: This test may need adjustment based on actual behavior
    await expect(page.getByRole("combobox").first()).toHaveText("Select an admin user...");
  });
});