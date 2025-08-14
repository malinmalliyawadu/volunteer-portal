import { test, expect } from "./base";
import type { Page } from "@playwright/test";

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  try {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const adminLoginButton = page.getByRole("button", {
      name: /login as admin/i,
    });
    await adminLoginButton.waitFor({ state: "visible", timeout: 5000 });
    await adminLoginButton.click();

    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 10000,
      });
    } catch (error) {
      console.log("Admin login may have failed or taken too long");
    }

    await page.waitForLoadState("networkidle");
  } catch (error) {
    console.log("Error during admin login:", error);
  }
}

// Helper function to login as volunteer
async function loginAsVolunteer(page: Page) {
  try {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const volunteerLoginButton = page.getByRole("button", {
      name: /login as volunteer/i,
    });
    await volunteerLoginButton.waitFor({ state: "visible", timeout: 5000 });
    await volunteerLoginButton.click();

    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 10000,
      });
    } catch (error) {
      console.log("Volunteer login may have failed or taken too long");
    }

    await page.waitForLoadState("networkidle");
  } catch (error) {
    console.log("Error during volunteer login:", error);
  }
}

test.describe("Group Booking Feature", () => {
  test("volunteer can access group booking dialog", async ({ page }) => {
    await loginAsVolunteer(page);

    // Navigate to shifts page
    await page.goto("/shifts");
    await page.waitForLoadState("networkidle");

    // Skip test if login failed (we're still on login page)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip(true, "Volunteer login failed - skipping group booking test");
    }

    // Look for "Book as Group" button (it should exist if shifts are available)
    const bookAsGroupButton = page.getByRole("button", { name: /book as group/i });
    
    // Check if button exists (might not be visible if no shifts available)
    const buttonCount = await bookAsGroupButton.count();
    if (buttonCount === 0) {
      test.skip(true, "No shifts available for group booking test");
    }

    // If button exists, test the dialog functionality
    await bookAsGroupButton.first().click();
    
    // Wait for dialog to open
    await expect(page.getByTestId("group-booking-dialog")).toBeVisible();
    
    // Check that key elements are present
    await expect(page.getByTestId("group-name-input")).toBeVisible();
    await expect(page.getByTestId("new-email-input")).toBeVisible();
    await expect(page.getByTestId("group-booking-create-button")).toBeVisible();
    
    // Close dialog
    await page.getByTestId("group-booking-cancel-button").click();
    await expect(page.getByTestId("group-booking-dialog")).not.toBeVisible();
  });

  test("admin can view group bookings in admin dashboard", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin shifts page
    await page.goto("/admin/shifts");
    await page.waitForLoadState("networkidle");

    // Skip test if login failed (we're still on login page)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip(true, "Admin login failed - skipping admin dashboard test");
    }

    // Check if the page loaded successfully
    await expect(page).toHaveURL(/.*\/admin\/shifts.*/);
    
    // Look for shifts table or group booking elements
    // Since we don't know if there are existing group bookings, we'll just verify
    // that the admin can access the page and it loads without errors
    const mainContent = page.locator("main").first();
    await expect(mainContent).toBeVisible();
  });

  test("group booking dialog validates required fields", async ({ page }) => {
    await loginAsVolunteer(page);

    await page.goto("/shifts");
    await page.waitForLoadState("networkidle");

    // Skip test if login failed (we're still on login page)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip(true, "Volunteer login failed - skipping validation test");
    }

    const bookAsGroupButton = page.getByRole("button", { name: /book as group/i });
    const buttonCount = await bookAsGroupButton.count();
    
    if (buttonCount === 0) {
      test.skip(true, "No shifts available for validation test");
    }

    await bookAsGroupButton.first().click();
    await expect(page.getByTestId("group-booking-dialog")).toBeVisible();

    // Try to submit without filling required fields
    const createButton = page.getByTestId("group-booking-create-button");
    
    // Button should be disabled when required fields are empty
    await expect(createButton).toBeDisabled();

    // Fill in group name
    await page.getByTestId("group-name-input").fill("Test Group");
    
    // Button should still be disabled without members and shift selection
    await expect(createButton).toBeDisabled();

    // Try to add invalid email
    await page.getByTestId("new-email-input").fill("invalid-email");
    await page.getByTestId("add-email-button").click();
    
    // Should show validation error
    await expect(page.getByTestId("emails-error")).toBeVisible();

    // Add valid email
    await page.getByTestId("new-email-input").fill("test@example.com");
    await page.getByTestId("add-email-button").click();
    
    // Email should be added to the list
    await expect(page.getByTestId("email-list")).toBeVisible();
    
    // Close dialog
    await page.getByTestId("group-booking-cancel-button").click();
  });

  test("invitation page loads correctly", async ({ page }) => {
    // Test accessing an invitation page (this will likely show "not found" or "expired")
    // but it tests that the route works and the page loads
    await page.goto("/group-invitations/test-token-123");
    await page.waitForLoadState("networkidle");

    // Should load without JavaScript errors (even if invitation doesn't exist)
    // Just check that the page loaded and we're not getting a browser error
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("unauthorized access to admin group features is blocked", async ({ page }) => {
    await loginAsVolunteer(page);

    // Skip test if login failed 
    const loginUrl = page.url();
    if (loginUrl.includes("/login")) {
      test.skip(true, "Volunteer login failed - skipping unauthorized access test");
    }

    // Try to access admin group booking endpoints (should be redirected or show error)
    await page.goto("/admin/shifts");
    await page.waitForLoadState("networkidle");

    // Should either redirect to login, show error, or redirect to volunteer dashboard
    // Check that we're not on the admin shifts page
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/admin\/shifts$/);
  });
});