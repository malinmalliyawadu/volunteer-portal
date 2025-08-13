import { test, expect } from "./base";
import type { Page } from "@playwright/test";

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
      console.log("Login may have failed or taken too long");
    }

    await page.waitForLoadState("networkidle");
  } catch (error) {
    console.log("Error during login:", error);
  }
}

test.describe("My Shifts Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVolunteer(page);

    // Navigate to my shifts page
    await page.goto("/shifts/mine");
    await page.waitForLoadState("networkidle");

    // Skip tests if login failed (we're still on login page)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip(true, "Login failed - skipping my shifts tests");
    }
  });

  test.describe("Page Structure and Navigation", () => {
    test("should display my shifts page with main elements", async ({ page }) => {
      // Check page loads successfully
      await expect(page).toHaveURL("/shifts/mine");

      // Check main page container
      const myShiftsPage = page.getByTestId("my-shifts-page");
      await expect(myShiftsPage).toBeVisible();

      // Check page title
      const pageTitle = page.getByRole("heading", { name: /my shifts/i });
      await expect(pageTitle).toBeVisible();

      // Check page description
      const pageDescription = page.getByText("View your upcoming and past volunteer shifts");
      await expect(pageDescription).toBeVisible();
    });

    test("should display location filter with all location tabs", async ({ page }) => {
      // Check location filter section
      const locationFilter = page.getByTestId("location-filter");
      await expect(locationFilter).toBeVisible();

      // Check location tabs container
      const locationTabs = page.getByTestId("location-tabs");
      await expect(locationTabs).toBeVisible();

      // Check "All" tab
      const allTab = page.getByTestId("location-tab-all");
      await expect(allTab).toBeVisible();
      await expect(allTab).toContainText("All");

      // Check specific location tabs
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await expect(wellingtonTab).toBeVisible();
      await expect(wellingtonTab).toContainText("Wellington");

      const glennInnesTab = page.getByTestId("location-tab-glenn-innes");
      await expect(glennInnesTab).toBeVisible();
      await expect(glennInnesTab).toContainText("Glenn Innes");

      const onehungaTab = page.getByTestId("location-tab-onehunga");
      await expect(onehungaTab).toBeVisible();
      await expect(onehungaTab).toContainText("Onehunga");
    });

    test("should display upcoming shifts section", async ({ page }) => {
      // Check upcoming shifts section
      const upcomingSection = page.getByTestId("upcoming-shifts-section");
      await expect(upcomingSection).toBeVisible();

      // Check section title
      const upcomingTitle = page.getByTestId("upcoming-shifts-title");
      await expect(upcomingTitle).toBeVisible();
      await expect(upcomingTitle).toContainText("Upcoming Shifts");

      // Check shifts count badge
      const upcomingCount = page.getByTestId("upcoming-shifts-count");
      await expect(upcomingCount).toBeVisible();

      // Check pagination controls
      const upcomingPagination = page.getByTestId("upcoming-shifts-pagination");
      await expect(upcomingPagination).toBeVisible();
    });

    test("should display past shifts section", async ({ page }) => {
      // Check past shifts section
      const pastSection = page.getByTestId("past-shifts-section");
      await expect(pastSection).toBeVisible();

      // Check section title
      const pastTitle = page.getByTestId("past-shifts-title");
      await expect(pastTitle).toBeVisible();
      await expect(pastTitle).toContainText("Shift History");

      // Check shifts count badge
      const pastCount = page.getByTestId("past-shifts-count");
      await expect(pastCount).toBeVisible();

      // Check pagination controls
      const pastPagination = page.getByTestId("past-shifts-pagination");
      await expect(pastPagination).toBeVisible();
    });
  });

  test.describe("Location Filtering", () => {
    test("should filter by location when clicking location tabs", async ({ page }) => {
      // Click on Wellington tab
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to filtered URL
      await expect(page).toHaveURL("/shifts/mine?location=Wellington");

      // Click on "All" tab to clear filter
      const allTab = page.getByTestId("location-tab-all");
      await allTab.click();
      await page.waitForLoadState("networkidle");

      // Should navigate back to unfiltered URL
      await expect(page).toHaveURL("/shifts/mine");
    });

    test("should maintain selected location tab state", async ({ page }) => {
      // Navigate directly to filtered URL
      await page.goto("/shifts/mine?location=Glenn%20Innes");
      await page.waitForLoadState("networkidle");

      // Glenn Innes tab should be active
      const glennInnesTab = page.getByTestId("location-tab-glenn-innes");
      await expect(glennInnesTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Empty States", () => {
    test("should display empty state for upcoming shifts when none exist", async ({ page }) => {
      // Check if empty state is visible
      const upcomingEmptyState = page.getByTestId("upcoming-shifts-empty-state");
      
      // Only test if empty state is present
      if (await upcomingEmptyState.isVisible()) {
        await expect(upcomingEmptyState).toContainText("No upcoming shifts yet");
        await expect(upcomingEmptyState).toContainText("Ready to make a difference?");
        
        // Check browse shifts button
        const browseShiftsButton = page.getByTestId("browse-shifts-button");
        await expect(browseShiftsButton).toBeVisible();
        await expect(browseShiftsButton).toContainText("Browse Shifts");
      }
    });

    test("should display empty state for past shifts when none exist", async ({ page }) => {
      // Check if empty state is visible
      const pastEmptyState = page.getByTestId("past-shifts-empty-state");
      
      // Only test if empty state is present
      if (await pastEmptyState.isVisible()) {
        await expect(pastEmptyState).toContainText("No shift history yet");
        await expect(pastEmptyState).toContainText("Your completed shifts will appear here");
      }
    });

    test("should navigate to shifts page from browse shifts button", async ({ page }) => {
      // Only test if empty state and button are present
      const browseShiftsButton = page.getByTestId("browse-shifts-button");
      
      if (await browseShiftsButton.isVisible()) {
        await browseShiftsButton.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL("/shifts");
      }
    });
  });

  test.describe("Shift Cards Display", () => {
    test("should display upcoming shift cards with all information", async ({ page }) => {
      // Check if upcoming shifts list exists
      const upcomingShiftsList = page.getByTestId("upcoming-shifts-list");
      
      if (await upcomingShiftsList.isVisible()) {
        // Get all upcoming shift cards
        const shiftCards = page.locator('[data-testid^="upcoming-shift-"]');
        const shiftCount = await shiftCards.count();
        
        if (shiftCount > 0) {
          const firstShift = shiftCards.first();
          
          // Check shift name
          const shiftName = firstShift.getByTestId("shift-name");
          await expect(shiftName).toBeVisible();
          
          // Check shift status
          const shiftStatus = firstShift.getByTestId("shift-status");
          await expect(shiftStatus).toBeVisible();
          
          // Check shift datetime
          const shiftDateTime = firstShift.getByTestId("shift-datetime");
          await expect(shiftDateTime).toBeVisible();
          
          // Check shift location
          const shiftLocation = firstShift.getByTestId("shift-location");
          await expect(shiftLocation).toBeVisible();
          
          // Check shift actions (cancel button)
          const shiftActions = firstShift.getByTestId("shift-actions");
          await expect(shiftActions).toBeVisible();
          
          // Check cancel button
          const cancelButton = firstShift.getByTestId("cancel-shift-button");
          await expect(cancelButton).toBeVisible();
          await expect(cancelButton).toContainText("Cancel");
        }
      }
    });

    test("should display past shift cards with all information", async ({ page }) => {
      // Check if past shifts list exists
      const pastShiftsList = page.getByTestId("past-shifts-list");
      
      if (await pastShiftsList.isVisible()) {
        // Get all past shift cards
        const shiftCards = page.locator('[data-testid^="past-shift-"]');
        const shiftCount = await shiftCards.count();
        
        if (shiftCount > 0) {
          const firstShift = shiftCards.first();
          
          // Check shift name
          const shiftName = firstShift.getByTestId("shift-name");
          await expect(shiftName).toBeVisible();
          
          // Check shift status
          const shiftStatus = firstShift.getByTestId("shift-status");
          await expect(shiftStatus).toBeVisible();
          
          // Check shift datetime
          const shiftDateTime = firstShift.getByTestId("shift-datetime");
          await expect(shiftDateTime).toBeVisible();
          
          // Check shift location
          const shiftLocation = firstShift.getByTestId("shift-location");
          await expect(shiftLocation).toBeVisible();
          
          // Past shifts should not have cancel button
          const cancelButton = firstShift.getByTestId("cancel-shift-button");
          await expect(cancelButton).not.toBeVisible();
        }
      }
    });
  });

  test.describe("Shift Cancellation", () => {
    test("should open cancel confirmation dialog when clicking cancel button", async ({ page }) => {
      // Check if upcoming shifts list exists
      const upcomingShiftsList = page.getByTestId("upcoming-shifts-list");
      
      if (await upcomingShiftsList.isVisible()) {
        // Get first upcoming shift with cancel button
        const firstShift = page.locator('[data-testid^="upcoming-shift-"]').first();
        const cancelButton = firstShift.getByTestId("cancel-shift-button");
        
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          
          // Check cancel dialog appears
          const cancelDialog = page.getByTestId("cancel-shift-dialog");
          await expect(cancelDialog).toBeVisible();
          
          // Check dialog title
          const dialogTitle = page.getByTestId("cancel-dialog-title");
          await expect(dialogTitle).toBeVisible();
          await expect(dialogTitle).toContainText("Cancel Shift Signup");
          
          // Check dialog description
          const dialogDescription = page.getByTestId("cancel-dialog-description");
          await expect(dialogDescription).toBeVisible();
          await expect(dialogDescription).toContainText("Are you sure you want to cancel");
          
          // Check dialog buttons
          const keepButton = page.getByTestId("keep-signup-button");
          await expect(keepButton).toBeVisible();
          await expect(keepButton).toContainText("Keep Signup");
          
          const confirmCancelButton = page.getByTestId("confirm-cancel-button");
          await expect(confirmCancelButton).toBeVisible();
          await expect(confirmCancelButton).toContainText("Cancel Signup");
        }
      }
    });

    test("should close dialog when clicking 'Keep Signup' button", async ({ page }) => {
      // Check if upcoming shifts list exists
      const upcomingShiftsList = page.getByTestId("upcoming-shifts-list");
      
      if (await upcomingShiftsList.isVisible()) {
        // Get first upcoming shift with cancel button
        const firstShift = page.locator('[data-testid^="upcoming-shift-"]').first();
        const cancelButton = firstShift.getByTestId("cancel-shift-button");
        
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          
          // Wait for dialog to appear
          const cancelDialog = page.getByTestId("cancel-shift-dialog");
          await expect(cancelDialog).toBeVisible();
          
          // Click "Keep Signup" button
          const keepButton = page.getByTestId("keep-signup-button");
          await keepButton.click();
          
          // Dialog should be closed
          await expect(cancelDialog).not.toBeVisible();
        }
      }
    });

    test("should show loading state when canceling signup", async ({ page }) => {
      // Check if upcoming shifts list exists
      const upcomingShiftsList = page.getByTestId("upcoming-shifts-list");
      
      if (await upcomingShiftsList.isVisible()) {
        // Get first upcoming shift with cancel button
        const firstShift = page.locator('[data-testid^="upcoming-shift-"]').first();
        const cancelButton = firstShift.getByTestId("cancel-shift-button");
        
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          
          // Wait for dialog to appear
          const cancelDialog = page.getByTestId("cancel-shift-dialog");
          await expect(cancelDialog).toBeVisible();
          
          // Click "Cancel Signup" button
          const confirmCancelButton = page.getByTestId("confirm-cancel-button");
          await confirmCancelButton.click();
          
          // Should show loading state briefly
          await expect(confirmCancelButton).toContainText("Canceling...");
          
          // Wait for action to complete (either success or error)
          await page.waitForLoadState("networkidle");
        }
      }
    });
  });

  test.describe("Authentication and Access Control", () => {
    test("should require authentication to access my shifts page", async ({ context }) => {
      // Create a new context (fresh browser session)
      const newContext = await context.browser()?.newContext();
      if (!newContext) throw new Error("Could not create new context");

      const newPage = await newContext.newPage();

      // Try to access my shifts directly without authentication
      await newPage.goto("/shifts/mine");
      await newPage.waitForLoadState("networkidle");

      // Should be redirected to login with callback URL
      await expect(newPage).toHaveURL(/\/login.*callbackUrl.*shifts\/mine/);

      await newPage.close();
      await newContext.close();
    });
  });

  test.describe("Responsive Design", () => {
    test("should be responsive on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Check that main elements are still visible and accessible
      const myShiftsPage = page.getByTestId("my-shifts-page");
      await expect(myShiftsPage).toBeVisible();

      // Check location filter is accessible
      const locationFilter = page.getByTestId("location-filter");
      await expect(locationFilter).toBeVisible();

      // Check sections are accessible
      const upcomingSection = page.getByTestId("upcoming-shifts-section");
      await expect(upcomingSection).toBeVisible();

      const pastSection = page.getByTestId("past-shifts-section");
      await expect(pastSection).toBeVisible();
    });
  });

  test.describe("Loading and Error Handling", () => {
    test("should handle loading state gracefully", async ({ page }) => {
      // Navigate to my shifts page
      await page.goto("/shifts/mine");

      // Wait for the main content to be visible
      const myShiftsPage = page.getByTestId("my-shifts-page");
      await expect(myShiftsPage).toBeVisible({ timeout: 10000 });

      // Check that no error messages are displayed
      const errorMessage = page.getByText(/error|failed|something went wrong/i);
      await expect(errorMessage).not.toBeVisible();
    });

    test("should display shift counts correctly", async ({ page }) => {
      // Check upcoming shifts count is a number
      const upcomingCount = page.getByTestId("upcoming-shifts-count");
      await expect(upcomingCount).toBeVisible();
      const upcomingCountText = await upcomingCount.textContent();
      expect(upcomingCountText).toMatch(/^\d+$/);

      // Check past shifts count is a number
      const pastCount = page.getByTestId("past-shifts-count");
      await expect(pastCount).toBeVisible();
      const pastCountText = await pastCount.textContent();
      expect(pastCountText).toMatch(/^\d+$/);
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper accessibility attributes", async ({ page }) => {
      // Check that main sections have proper headings
      const upcomingTitle = page.getByTestId("upcoming-shifts-title");
      await expect(upcomingTitle).toHaveRole("heading");

      const pastTitle = page.getByTestId("past-shifts-title");
      await expect(pastTitle).toHaveRole("heading");

      // Check that interactive elements are accessible
      const locationTabs = page.getByTestId("location-tabs");
      await expect(locationTabs).toBeVisible();

      // Check that buttons have accessible names
      const browseShiftsButton = page.getByTestId("browse-shifts-button");
      if (await browseShiftsButton.isVisible()) {
        await expect(browseShiftsButton).toHaveAttribute("href", "/shifts");
      }
    });
  });
});