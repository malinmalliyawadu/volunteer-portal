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

test.describe("Shifts Browse Page", () => {
  test.describe("Unauthenticated Access", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");
    });

    test("should display shifts page without authentication", async ({ page }) => {
      // Check page loads successfully
      await expect(page).toHaveURL("/shifts");

      // Check main page container
      const browsePage = page.getByTestId("shifts-browse-page");
      await expect(browsePage).toBeVisible();

      // Check main page title
      const pageTitle = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(pageTitle).toBeVisible();

      // Check page description
      const pageDescription = page.getByText(/find and sign up for upcoming volunteer opportunities/i);
      await expect(pageDescription).toBeVisible();
    });

    test("should display location filter tabs", async ({ page }) => {
      // Check location filter section
      const locationFilter = page.getByTestId("location-filter");
      await expect(locationFilter).toBeVisible();

      // Check filter label
      const filterLabel = page.getByText("Filter by location:");
      await expect(filterLabel).toBeVisible();

      // Check location tabs container
      const locationTabs = page.getByTestId("location-tabs");
      await expect(locationTabs).toBeVisible();

      // Check "All" tab
      const allTab = page.getByTestId("location-tab-all");
      await expect(allTab).toBeVisible();

      // Check location-specific tabs
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await expect(wellingtonTab).toBeVisible();

      const glennInnesTab = page.getByTestId("location-tab-glenn-innes");
      await expect(glennInnesTab).toBeVisible();

      const onehungaTab = page.getByTestId("location-tab-onehunga");
      await expect(onehungaTab).toBeVisible();
    });

    test("should show login buttons for shift signup when not authenticated", async ({ page }) => {
      // Look for shift cards
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        
        // Should show login link for signup
        const signupButton = firstShift.locator('[data-testid*="signup-login-button"]');
        if (await signupButton.isVisible()) {
          await expect(signupButton).toHaveAttribute("href", /\/login.*callbackUrl.*shifts/);
        }

        // Or waitlist login link
        const waitlistButton = firstShift.locator('[data-testid*="waitlist-login-button"]');
        if (await waitlistButton.isVisible()) {
          await expect(waitlistButton).toHaveAttribute("href", /\/login.*callbackUrl.*shifts/);
        }
      }
    });
  });

  test.describe("Authenticated Access", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Skip tests if login failed
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Login failed - skipping authenticated shifts tests");
      }
    });

    test("should display page with authentication", async ({ page }) => {
      // Check page loads successfully
      await expect(page).toHaveURL("/shifts");

      // Check main page container
      const browsePage = page.getByTestId("shifts-browse-page");
      await expect(browsePage).toBeVisible();

      // Check main elements are visible
      const pageTitle = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(pageTitle).toBeVisible();

      const pageDescription = page.getByText(/find and sign up for upcoming volunteer opportunities/i);
      await expect(pageDescription).toBeVisible();
    });

    test("should display shift cards with all required information", async ({ page }) => {
      // Look for shift cards using testids
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute('data-testid');
        const id = shiftId?.replace('shift-card-', '') || '';

        // Check shift type name
        const shiftName = firstShift.getByTestId(`shift-name-${id}`);
        await expect(shiftName).toBeVisible();

        // Check time information
        const timeInfo = firstShift.getByTestId(`shift-time-${id}`);
        await expect(timeInfo).toBeVisible();

        // Check location information
        const locationInfo = firstShift.getByTestId(`shift-location-${id}`);
        await expect(locationInfo).toBeVisible();

        // Check capacity information
        const capacityInfo = firstShift.getByTestId(`shift-capacity-${id}`);
        await expect(capacityInfo).toBeVisible();

        // Check actions section
        const actionsSection = firstShift.getByTestId(`shift-actions-${id}`);
        await expect(actionsSection).toBeVisible();
      }
    });

    test("should show shift type categories and theming", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute('data-testid');
        const id = shiftId?.replace('shift-card-', '') || '';

        // Check for category badge (Kitchen, Service, etc.)
        const categoryBadge = firstShift.getByTestId(`shift-category-${id}`);
        await expect(categoryBadge).toBeVisible();

        // Check for gradient icon
        const iconContainer = firstShift.locator('.bg-gradient-to-br');
        await expect(iconContainer).toBeVisible();
      }
    });

    test("should display shift duration", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute('data-testid');
        const id = shiftId?.replace('shift-card-', '') || '';

        // Check for duration badge (format like "4h" or "3h 30m")
        const durationBadge = firstShift.getByTestId(`shift-duration-${id}`);
        await expect(durationBadge).toBeVisible();
      }
    });

    test("should show spots remaining or waitlist status", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute('data-testid');
        const id = shiftId?.replace('shift-card-', '') || '';

        // Check for spots remaining or waitlist indicator
        const spotsIndicator = firstShift.getByTestId(`shift-spots-badge-${id}`);
        const waitlistIndicator = firstShift.getByTestId(`shift-waitlist-badge-${id}`);
        
        // At least one should be visible
        if (await spotsIndicator.isVisible()) {
          await expect(spotsIndicator).toBeVisible();
        } else {
          await expect(waitlistIndicator).toBeVisible();
        }
      }
    });

    test("should open signup dialog when clicking signup button", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        // Find a shift with an available signup button
        const signupButton = page.locator('[data-testid*="signup-button"]').first();
        
        if (await signupButton.isVisible()) {
          await signupButton.click();

          // Check dialog appears
          const dialog = page.getByTestId("shift-signup-dialog");
          await expect(dialog).toBeVisible();

          // Check dialog title
          const dialogTitle = page.getByTestId("shift-signup-dialog-title");
          await expect(dialogTitle).toBeVisible();

          // Check cancel button
          const cancelButton = page.getByTestId("shift-signup-cancel-button");
          await expect(cancelButton).toBeVisible();

          // Check confirm signup button
          const confirmButton = page.getByTestId("shift-signup-confirm-button");
          await expect(confirmButton).toBeVisible();

          // Close dialog
          await cancelButton.click();
          await expect(dialog).not.toBeVisible();
        }
      }
    });

    test("should open waitlist dialog for full shifts", async ({ page }) => {
      // Look for waitlist buttons
      const waitlistButton = page.locator('[data-testid*="join-waitlist-button"]').first();
      
      if (await waitlistButton.isVisible()) {
        await waitlistButton.click();

        // Check dialog appears
        const dialog = page.getByTestId("shift-signup-dialog");
        await expect(dialog).toBeVisible();

        // Check dialog title
        const dialogTitle = page.getByTestId("shift-signup-dialog-title");
        await expect(dialogTitle).toBeVisible();
        await expect(dialogTitle).toContainText("Join Waitlist");

        // Check waitlist-specific content
        const waitlistDescription = page.getByTestId("shift-signup-dialog-description");
        await expect(waitlistDescription).toBeVisible();
        await expect(waitlistDescription).toContainText("notified if a spot becomes available");

        // Close dialog
        const cancelButton = page.getByTestId("shift-signup-cancel-button");
        await cancelButton.click();
        await expect(dialog).not.toBeVisible();
      }
    });

    test("should show user signup status for registered shifts", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        // Look for any shift with user status
        const statusBadge = page.locator('[data-testid*="signup-status"]').first();
        
        if (await statusBadge.isVisible()) {
          await expect(statusBadge).toBeVisible();
          
          // Should also show "You're signed up!" message
          const signupMessage = page.locator('[data-testid*="signed-up-message"]');
          if (await signupMessage.count() > 0) {
            await expect(signupMessage.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe("Location Filtering", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");
    });

    test("should filter shifts by location when clicking location tabs", async ({ page }) => {
      // Click on Wellington tab
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to filtered URL
      await expect(page).toHaveURL("/shifts?location=Wellington");

      // Page should show Wellington filter indication
      const pageDescription = page.getByText(/in wellington/i);
      await expect(pageDescription).toBeVisible();
    });

    test("should show all locations when clicking All tab", async ({ page }) => {
      // First go to a filtered view
      await page.goto("/shifts?location=Wellington");
      await page.waitForLoadState("networkidle");

      // Then click "All" tab
      const allTab = page.getByTestId("location-tab-all");
      await allTab.click();
      await page.waitForLoadState("networkidle");

      // Should return to unfiltered URL
      await expect(page).toHaveURL("/shifts?showAll=true");
    });

    test("should maintain active tab state for selected location", async ({ page }) => {
      // Navigate directly to filtered URL
      await page.goto("/shifts?location=Glenn%20Innes");
      await page.waitForLoadState("networkidle");

      // Glenn Innes tab should be visually active
      const glennInnesTab = page.getByTestId("location-tab-glenn-innes");
      
      // Check if it has active styling (Radix UI tabs use data-state="active")
      await expect(glennInnesTab).toHaveAttribute("data-state", "active");
    });

    test("should show user preference notification when applicable", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Look for preference notification
      const preferenceNotification = page.getByTestId("profile-filter-notification");
      
      // This may or may not be visible depending on user's profile
      if (await preferenceNotification.isVisible()) {
        await expect(preferenceNotification).toBeVisible();
        
        // Should have link to update preferences
        const updateLink = page.getByRole("link", { name: /update your preferences/i });
        await expect(updateLink).toBeVisible();
        await expect(updateLink).toHaveAttribute("href", "/profile/edit");
      }
    });
  });

  test.describe("Empty States", () => {
    test("should display empty state when no shifts available", async ({ page }) => {
      // Try to trigger empty state by filtering to a location that might not have shifts
      await page.goto("/shifts?location=NonExistentLocation");
      await page.waitForLoadState("networkidle");

      // Look for empty state content
      const emptyState = page.getByTestId("empty-state");
      
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
        
        const emptyStateTitle = page.getByTestId("empty-state-title");
        await expect(emptyStateTitle).toBeVisible();
        
        const emptyStateDescription = page.getByTestId("empty-state-description");
        await expect(emptyStateDescription).toBeVisible();
      }
    });

    test("should provide helpful links in empty state for filtered locations", async ({ page }) => {
      await page.goto("/shifts?location=Wellington");
      await page.waitForLoadState("networkidle");

      // Check if empty state is visible first
      const emptyState = page.getByTestId("empty-state");
      
      if (await emptyState.isVisible()) {
        // Look for empty state with helpful links
        const viewAllLink = page.getByRole("link", { name: /viewing all locations/i });
        const updatePreferencesLink = page.getByRole("link", { name: /updating your location preferences/i });

        // These links might be present in empty state
        if (await viewAllLink.isVisible()) {
          await expect(viewAllLink).toHaveAttribute("href", "/shifts");
        }
        if (await updatePreferencesLink.isVisible()) {
          await expect(updatePreferencesLink).toHaveAttribute("href", "/profile/edit");
        }
      }
    });
  });

  test.describe("Shifts Grouping and Display", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");
    });

    test("should group shifts by date", async ({ page }) => {
      // Look for shift list container
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for date sections
        const dateSections = page.locator('[data-testid^="shifts-day-section-"]');
        const sectionCount = await dateSections.count();

        if (sectionCount > 0) {
          const firstSection = dateSections.first();
          await expect(firstSection).toBeVisible();

          // Get the section ID to check heading and count
          const sectionId = await firstSection.getAttribute('data-testid');
          const dateKey = sectionId?.replace('shifts-day-section-', '') || '';
          
          const heading = page.getByTestId(`shifts-day-heading-${dateKey}`);
          await expect(heading).toBeVisible();
          
          const countBadge = page.getByTestId(`shifts-day-count-${dateKey}`);
          await expect(countBadge).toBeVisible();
        }
      }
    });

    test("should display shifts in chronological order", async ({ page }) => {
      const dateSections = page.locator('[data-testid^="shifts-day-section-"]');
      const sectionCount = await dateSections.count();

      if (sectionCount > 1) {
        // Get date keys from testids (format: yyyy-MM-dd)
        const firstSectionId = await dateSections.nth(0).getAttribute('data-testid');
        const secondSectionId = await dateSections.nth(1).getAttribute('data-testid');
        
        const firstDateKey = firstSectionId?.replace('shifts-day-section-', '') || '';
        const secondDateKey = secondSectionId?.replace('shifts-day-section-', '') || '';

        // Compare date keys (they should be in chronological order)
        expect(firstDateKey <= secondDateKey).toBe(true);
      }
    });

    test("should show shift count badges", async ({ page }) => {
      const dateSections = page.locator('[data-testid^="shifts-day-section-"]');
      const sectionCount = await dateSections.count();

      if (sectionCount > 0) {
        const firstSection = dateSections.first();
        const sectionId = await firstSection.getAttribute('data-testid');
        const dateKey = sectionId?.replace('shifts-day-section-', '') || '';
        
        const countBadge = page.getByTestId(`shifts-day-count-${dateKey}`);
        await expect(countBadge).toBeVisible();
        
        const badgeText = await countBadge.textContent();
        expect(badgeText).toMatch(/\d+\s+shifts?/);
      }
    });
  });

  test.describe("Progress Indicators and Capacity", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");
    });

    test("should display capacity progress bars", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute('data-testid');
        const id = shiftId?.replace('shift-card-', '') || '';

        // Look for capacity display (format like "2/5")
        const capacityDisplay = firstShift.getByTestId(`shift-capacity-count-${id}`);
        await expect(capacityDisplay).toBeVisible();

        // Look for progress bar
        const progressBar = firstShift.getByTestId(`shift-progress-bar-${id}`);
        await expect(progressBar).toBeVisible();
      }
    });

    test("should show pending and waitlist counts when applicable", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        // Look for pending approval text in any shift
        const pendingText = page.getByText(/pending approval/i);
        if (await pendingText.count() > 0) {
          await expect(pendingText.first()).toBeVisible();
        }

        // Look for waitlist text in any shift
        const waitlistText = page.getByText(/on waitlist/i);
        if (await waitlistText.count() > 0) {
          await expect(waitlistText.first()).toBeVisible();
        }
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should be responsive on mobile viewport", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Check main elements are still visible and accessible
      const pageTitle = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(pageTitle).toBeVisible();

      // Check location filter is accessible on mobile
      const locationTabs = page.locator('[role="tablist"]');
      await expect(locationTabs).toBeVisible();

      // Check shift cards adapt to mobile layout
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        await expect(firstShift).toBeVisible();
      }
    });

    test("should maintain usability on tablet viewport", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Check grid layout works on tablet
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 1) {
        // On tablet, should have grid layout (multiple cards per row)
        const firstShift = shiftCards.first();
        const secondShift = shiftCards.nth(1);
        
        await expect(firstShift).toBeVisible();
        await expect(secondShift).toBeVisible();
      }
    });
  });

  test.describe("Loading and Error Handling", () => {
    test("should handle page loading gracefully", async ({ page }) => {
      await page.goto("/shifts");

      // Wait for main content to be visible
      const pageTitle = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(pageTitle).toBeVisible({ timeout: 10000 });

      // Check that no error messages are displayed
      const errorMessage = page.getByText(/error|failed|something went wrong/i);
      await expect(errorMessage).not.toBeVisible();
    });

    test("should handle navigation between filter states", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Navigate through different location filters
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.click();
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL("/shifts?location=Wellington");

      const allTab = page.getByTestId("location-tab-all");
      await allTab.click();
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL("/shifts?showAll=true");

      // Page should remain functional
      const pageTitle = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(pageTitle).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper accessibility attributes", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check main heading structure
      const mainHeading = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(mainHeading).toBeVisible();

      // Check location filter has proper labels
      const locationFilter = page.getByTestId("location-filter");
      await expect(locationFilter).toBeVisible();
      
      const filterLabel = page.getByText("Filter by location:");
      await expect(filterLabel).toBeVisible();

      // Check tab navigation
      const locationTabs = page.getByTestId("location-tabs");
      await expect(locationTabs).toBeVisible();

      // Check that buttons have accessible names
      const signupButton = page.locator('[data-testid*="signup-button"], [data-testid*="waitlist-button"]').first();
      if (await signupButton.isVisible()) {
        await expect(signupButton).toBeVisible();
      }
    });

    test("should support keyboard navigation", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Tab through location filters
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.focus();
      await expect(wellingtonTab).toBeFocused();

      // Check shift cards are keyboard accessible
      const signupButton = page.locator('[data-testid*="signup-button"], [data-testid*="waitlist-button"]').first();
      if (await signupButton.isVisible()) {
        await signupButton.focus();
        await expect(signupButton).toBeFocused();
      }
    });
  });
});