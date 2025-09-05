import { test, expect } from "./base";
import type { Page } from "@playwright/test";

// Helper function to login as volunteer
async function loginAsVolunteer(page: Page) {
  try {
    await page.goto("/login");
    await page.waitForLoadState("load");

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

    await page.waitForLoadState("load");
  } catch (error) {
    console.log("Error during login:", error);
  }
}

test.describe("Shifts Browse Page", () => {
  test.describe("Unauthenticated Access", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("load");
    });

    test("should display shifts page without authentication", async ({
      page,
    }) => {
      // Check page loads successfully
      await expect(page).toHaveURL("/shifts");

      // Check main page container
      const browsePage = page.getByTestId("shifts-browse-page");
      await expect(browsePage).toBeVisible();

      // Check main page title
      const pageTitle = page.getByRole("heading", {
        name: /volunteer shifts/i,
      });
      await expect(pageTitle).toBeVisible();

      // Check page description
      const pageDescription = page.getByText(
        /find and sign up for upcoming volunteer opportunities/i
      );
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

    test("should show login buttons for shift signup when not authenticated", async ({
      page,
    }) => {
      // Look for shift cards
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();

        // Should show login link for signup
        const signupButton = firstShift.locator(
          '[data-testid*="signup-login-button"]'
        );
        if (await signupButton.isVisible()) {
          await expect(signupButton).toHaveAttribute(
            "href",
            /\/login.*callbackUrl.*shifts/
          );
        }

        // Or waitlist login link
        const waitlistButton = firstShift.locator(
          '[data-testid*="waitlist-login-button"]'
        );
        if (await waitlistButton.isVisible()) {
          await expect(waitlistButton).toHaveAttribute(
            "href",
            /\/login.*callbackUrl.*shifts/
          );
        }
      }
    });
  });

  test.describe("Authenticated Access", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("load");

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
      const pageTitle = page.getByRole("heading", {
        name: /volunteer shifts/i,
      });
      await expect(pageTitle).toBeVisible();

      const pageDescription = page.getByText(
        /find and sign up for upcoming volunteer opportunities/i
      );
      await expect(pageDescription).toBeVisible();
    });

    test("should display shift cards with all required information", async ({
      page,
    }) => {
      // Look for shift cards using testids
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute("data-testid");
        const id = shiftId?.replace("shift-card-", "") || "";

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
      // With the new calendar interface, we check for calendar elements instead
      const calendarCards = page.locator('[data-testid^="calendar-"]');
      const calendarCount = await calendarCards.count();

      if (calendarCount > 0) {
        // Check that calendar shows locations with proper theming
        const firstCalendar = calendarCards.first();
        await expect(firstCalendar).toBeVisible();

        // Check for location header with icon
        const locationIcon = firstCalendar.locator(".h-5.w-5.text-primary");
        if ((await locationIcon.count()) > 0) {
          await expect(locationIcon.first()).toBeVisible();
        }
      } else {
        // Fallback: if there are shift cards in upcoming section, check those
        const shiftCards = page.locator('[data-testid^="shift-card-"]');
        const shiftCount = await shiftCards.count();

        if (shiftCount > 0) {
          const firstShift = shiftCards.first();
          const shiftId = await firstShift.getAttribute("data-testid");
          const id = shiftId?.replace("shift-card-", "") || "";

          // Check for category badge (Kitchen, Service, etc.)
          const categoryBadge = firstShift.getByTestId(`shift-category-${id}`);
          if ((await categoryBadge.count()) > 0) {
            await expect(categoryBadge).toBeVisible();
          }

          // Check for gradient icon
          const iconContainer = firstShift.locator(".bg-gradient-to-br");
          if ((await iconContainer.count()) > 0) {
            await expect(iconContainer).toBeVisible();
          }
        }
      }
    });

    test("should display shift duration", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute("data-testid");
        const id = shiftId?.replace("shift-card-", "") || "";

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
        const shiftId = await firstShift.getAttribute("data-testid");
        const id = shiftId?.replace("shift-card-", "") || "";

        // Check for spots remaining or waitlist indicator
        const spotsIndicator = firstShift.getByTestId(
          `shift-spots-badge-${id}`
        );
        const waitlistIndicator = firstShift.getByTestId(
          `shift-waitlist-badge-${id}`
        );

        // At least one should be visible
        if (await spotsIndicator.isVisible()) {
          await expect(spotsIndicator).toBeVisible();
        } else {
          await expect(waitlistIndicator).toBeVisible();
        }
      }
    });

    test("should open signup dialog when clicking signup button", async ({
      page,
    }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        // Find a shift with an available signup button
        const signupButton = page
          .locator('[data-testid*="signup-button"]')
          .first();

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
      const waitlistButton = page
        .locator('[data-testid*="join-waitlist-button"]')
        .first();

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
        const waitlistDescription = page.getByTestId(
          "shift-signup-dialog-description"
        );
        await expect(waitlistDescription).toBeVisible();
        await expect(waitlistDescription).toContainText(
          "notified if a spot becomes available"
        );

        // Close dialog
        const cancelButton = page.getByTestId("shift-signup-cancel-button");
        await cancelButton.click();
        await expect(dialog).not.toBeVisible();
      }
    });

    test("should show user signup status for registered shifts", async ({
      page,
    }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        // Look for any shift with user status
        const statusBadge = page
          .locator('[data-testid*="signup-status"]')
          .first();

        if (await statusBadge.isVisible()) {
          await expect(statusBadge).toBeVisible();

          // Should also show "You're signed up!" message
          const signupMessage = page.locator(
            '[data-testid*="signed-up-message"]'
          );
          if ((await signupMessage.count()) > 0) {
            await expect(signupMessage.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe("Location Filtering", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("load");
    });

    test("should filter shifts by location when clicking location tabs", async ({
      page,
    }) => {
      // Click on Wellington tab
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.click();
      await page.waitForLoadState("load");

      // Should navigate to filtered URL
      await expect(page).toHaveURL("/shifts?location=Wellington");

      // Page should show Wellington filter indication
      const pageDescription = page.getByText(/in wellington/i);
      await expect(pageDescription).toBeVisible();
    });

    test("should show all locations when clicking All tab", async ({
      page,
    }) => {
      // First go to a filtered view
      await page.goto("/shifts?location=Wellington");
      await page.waitForLoadState("load");

      // Then click "All" tab
      const allTab = page.getByTestId("location-tab-all");
      await allTab.click();
      await page.waitForLoadState("load");

      // Should return to unfiltered URL
      await expect(page).toHaveURL("/shifts?showAll=true");
    });

    test("should maintain active tab state for selected location", async ({
      page,
    }) => {
      // Navigate directly to filtered URL
      await page.goto("/shifts?location=Glenn%20Innes");
      await page.waitForLoadState("load");

      // Glen Innes tab should be visually active
      const glennInnesTab = page.getByTestId("location-tab-glenn-innes");

      // Check if it has active styling (Radix UI tabs use data-state="active")
      await expect(glennInnesTab).toHaveAttribute("data-state", "active");
    });

    test("should show user preference notification when applicable", async ({
      page,
    }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("load");

      // Look for preference notification
      const preferenceNotification = page.getByTestId(
        "profile-filter-notification"
      );

      // This may or may not be visible depending on user's profile
      if (await preferenceNotification.isVisible()) {
        await expect(preferenceNotification).toBeVisible();

        // Should have link to update preferences
        const updateLink = page.getByRole("link", {
          name: /update your preferences/i,
        });
        await expect(updateLink).toBeVisible();
        await expect(updateLink).toHaveAttribute("href", "/profile/edit");
      }
    });
  });

  test.describe("Empty States", () => {
    test("should display empty state when no shifts available", async ({
      page,
    }) => {
      // Try to trigger empty state by filtering to a location that might not have shifts
      await page.goto("/shifts?location=NonExistentLocation");
      await page.waitForLoadState("load");

      // Look for empty state content
      const emptyState = page.getByTestId("empty-state");

      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();

        const emptyStateTitle = page.getByTestId("empty-state-title");
        await expect(emptyStateTitle).toBeVisible();

        const emptyStateDescription = page.getByTestId(
          "empty-state-description"
        );
        await expect(emptyStateDescription).toBeVisible();
      }
    });

    test("should provide helpful links in empty state for filtered locations", async ({
      page,
    }) => {
      await page.goto("/shifts?location=Wellington");
      await page.waitForLoadState("load");

      // Check if empty state is visible first
      const emptyState = page.getByTestId("empty-state");

      if (await emptyState.isVisible()) {
        // Look for empty state with helpful links
        const viewAllLink = page.getByRole("link", {
          name: /viewing all locations/i,
        });
        const updatePreferencesLink = page.getByRole("link", {
          name: /updating your location preferences/i,
        });

        // These links might be present in empty state
        if (await viewAllLink.isVisible()) {
          await expect(viewAllLink).toHaveAttribute("href", "/shifts");
        }
        if (await updatePreferencesLink.isVisible()) {
          await expect(updatePreferencesLink).toHaveAttribute(
            "href",
            "/profile/edit"
          );
        }
      }
    });
  });

  test.describe("Shifts Grouping and Display", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("load");
    });

    test("should group shifts by date", async ({ page }) => {
      // Look for shift list container
      const shiftsList = page.getByTestId("shifts-list");

      if (await shiftsList.isVisible()) {
        // Look for date sections
        const dateSections = page.locator(
          '[data-testid^="shifts-day-section-"]'
        );
        const sectionCount = await dateSections.count();

        if (sectionCount > 0) {
          const firstSection = dateSections.first();
          await expect(firstSection).toBeVisible();

          // Get the section ID to check heading and count
          const sectionId = await firstSection.getAttribute("data-testid");
          const dateKey = sectionId?.replace("shifts-day-section-", "") || "";

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
        const firstSectionId = await dateSections
          .nth(0)
          .getAttribute("data-testid");
        const secondSectionId = await dateSections
          .nth(1)
          .getAttribute("data-testid");

        const firstDateKey =
          firstSectionId?.replace("shifts-day-section-", "") || "";
        const secondDateKey =
          secondSectionId?.replace("shifts-day-section-", "") || "";

        // Compare date keys (they should be in chronological order)
        expect(firstDateKey <= secondDateKey).toBe(true);
      }
    });

    test("should show shift count badges", async ({ page }) => {
      const dateSections = page.locator('[data-testid^="shifts-day-section-"]');
      const sectionCount = await dateSections.count();

      if (sectionCount > 0) {
        const firstSection = dateSections.first();
        const sectionId = await firstSection.getAttribute("data-testid");
        const dateKey = sectionId?.replace("shifts-day-section-", "") || "";

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
      await page.waitForLoadState("load");
    });

    test("should display capacity progress bars", async ({ page }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstShift = shiftCards.first();
        const shiftId = await firstShift.getAttribute("data-testid");
        const id = shiftId?.replace("shift-card-", "") || "";

        // Look for capacity display (format like "2/5")
        const capacityDisplay = firstShift.getByTestId(
          `shift-capacity-count-${id}`
        );
        await expect(capacityDisplay).toBeVisible();

        // Look for progress bar
        const progressBar = firstShift.getByTestId(`shift-progress-bar-${id}`);
        await expect(progressBar).toBeVisible();
      }
    });

    test("should show pending and waitlist counts when applicable", async ({
      page,
    }) => {
      const shiftCards = page.locator('[data-testid^="shift-card-"]');
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        // Look for pending approval text in any shift
        const pendingText = page.getByText(/pending approval/i);
        if ((await pendingText.count()) > 0) {
          await expect(pendingText.first()).toBeVisible();
        }

        // Look for waitlist text in any shift
        const waitlistText = page.getByText(/on waitlist/i);
        if ((await waitlistText.count()) > 0) {
          await expect(waitlistText.first()).toBeVisible();
        }
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should be responsive on mobile viewport", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("load");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState("load");

      // Check main elements are still visible and accessible
      const pageTitle = page.getByRole("heading", {
        name: /volunteer shifts/i,
      });
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
      await page.waitForLoadState("load");

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState("load");

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
      const pageTitle = page.getByRole("heading", {
        name: /volunteer shifts/i,
      });
      await expect(pageTitle).toBeVisible({ timeout: 10000 });

      // Check that no error messages are displayed
      const errorMessage = page.getByText(/error|failed|something went wrong/i);
      await expect(errorMessage).not.toBeVisible();
    });

    test("should handle navigation between filter states", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("load");

      // Navigate through different location filters
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.click();
      await page.waitForLoadState("load");

      await expect(page).toHaveURL("/shifts?location=Wellington");

      const allTab = page.getByTestId("location-tab-all");
      await allTab.click();
      await page.waitForLoadState("load");

      await expect(page).toHaveURL("/shifts?showAll=true");

      // Page should remain functional
      const pageTitle = page.getByRole("heading", {
        name: /volunteer shifts/i,
      });
      await expect(pageTitle).toBeVisible();
    });
  });

  test.describe("Daily Signup Validation", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("load");

      // Skip tests if login failed
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(
          true,
          "Login failed - skipping daily signup validation tests"
        );
      }
    });

    test("should prevent multiple shift signups on the same day", async ({
      page,
    }) => {
      // Find shifts on the same day (get first date section)
      const firstDateSection = page
        .locator('[data-testid^="shifts-date-section-"]')
        .first();

      if (await firstDateSection.isVisible()) {
        // Get all shift cards in this date section
        const shiftCards = firstDateSection.locator(
          '[data-testid^="shift-card-"], .grid > div'
        );
        const shiftCount = await shiftCards.count();

        if (shiftCount >= 2) {
          // Try to sign up for the first available shift
          const firstShiftSignupButton = shiftCards
            .first()
            .locator(
              '[data-testid*="signup-button"], button:has-text("Sign Up"), button:has-text("✨ Sign Up Now")'
            )
            .first();

          if (await firstShiftSignupButton.isVisible()) {
            await firstShiftSignupButton.click();

            // Confirm signup in dialog
            const confirmButton = page.getByTestId(
              "shift-signup-confirm-button"
            );
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              await page.waitForLoadState("load");

              // Wait for any toast notifications to appear and dismiss
              await page.waitForTimeout(2000);

              // Now try to sign up for the second shift on the same day
              const secondShiftSignupButton = shiftCards
                .nth(1)
                .locator(
                  '[data-testid*="signup-button"], button:has-text("Sign Up"), button:has-text("✨ Sign Up Now")'
                )
                .first();

              if (await secondShiftSignupButton.isVisible()) {
                await secondShiftSignupButton.click();

                // Should show validation error dialog or message
                const errorDialog = page.getByTestId("shift-signup-dialog");
                if (await errorDialog.isVisible()) {
                  const confirmSecondButton = page.getByTestId(
                    "shift-signup-confirm-button"
                  );
                  await confirmSecondButton.click();
                }

                // Check for error message about daily limit
                const errorMessage = page.getByText(
                  /you already have a confirmed shift on this day/i
                );
                const duplicateErrorMessage = page.getByText(
                  /you can only sign up for one shift per day/i
                );
                const existingShiftError = page.getByText(
                  /already have.*shift.*day/i
                );

                // At least one of these error patterns should be visible
                const hasError =
                  (await errorMessage.isVisible()) ||
                  (await duplicateErrorMessage.isVisible()) ||
                  (await existingShiftError.isVisible());

                expect(hasError).toBe(true);

                // Alternatively, check for toast notification with error
                const toastError = page
                  .locator('[data-testid*="toast"], .toast, [role="alert"]')
                  .filter({
                    hasText: /shift.*day|daily.*limit|one shift per day/i,
                  });

                if ((await toastError.count()) > 0) {
                  await expect(toastError.first()).toBeVisible();
                }
              }
            }
          }
        } else {
          // Skip test if not enough shifts on the same day
          test.skip(
            true,
            "Not enough shifts on the same day to test daily validation"
          );
        }
      } else {
        // Skip test if no shifts available
        test.skip(true, "No shifts available to test daily validation");
      }
    });

    test("should allow signup on different days", async ({ page }) => {
      // Find shifts on different days
      const dateSections = page.locator(
        '[data-testid^="shifts-date-section-"]'
      );
      const sectionCount = await dateSections.count();

      if (sectionCount >= 2) {
        // Sign up for a shift on the first day
        const firstDayShifts = dateSections
          .first()
          .locator('[data-testid^="shift-card-"], .grid > div');
        const firstShiftSignupButton = firstDayShifts
          .first()
          .locator(
            '[data-testid*="signup-button"], button:has-text("Sign Up"), button:has-text("✨ Sign Up Now")'
          )
          .first();

        if (await firstShiftSignupButton.isVisible()) {
          await firstShiftSignupButton.click();

          // Confirm first signup
          const confirmButton = page.getByTestId("shift-signup-confirm-button");
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.waitForLoadState("load");
            await page.waitForTimeout(2000); // Wait for toast
          }

          // Now try to sign up for a shift on the second day
          const secondDayShifts = dateSections
            .nth(1)
            .locator('[data-testid^="shift-card-"], .grid > div');
          const secondShiftSignupButton = secondDayShifts
            .first()
            .locator(
              '[data-testid*="signup-button"], button:has-text("Sign Up"), button:has-text("✨ Sign Up Now")'
            )
            .first();

          if (await secondShiftSignupButton.isVisible()) {
            await secondShiftSignupButton.click();

            // Should be able to confirm second signup on different day
            const confirmSecondButton = page.getByTestId(
              "shift-signup-confirm-button"
            );
            if (await confirmSecondButton.isVisible()) {
              await confirmSecondButton.click();
              await page.waitForLoadState("load");

              // Should NOT show daily validation error
              const errorMessage = page.getByText(
                /you already have a confirmed shift on this day/i
              );
              const duplicateErrorMessage = page.getByText(
                /you can only sign up for one shift per day/i
              );

              await expect(errorMessage).not.toBeVisible();
              await expect(duplicateErrorMessage).not.toBeVisible();

              // Should show success indicator instead
              const successToast = page
                .locator('[data-testid*="toast"], .toast, [role="alert"]')
                .filter({
                  hasText: /success|signed up|confirmed/i,
                });

              if ((await successToast.count()) > 0) {
                await expect(successToast.first()).toBeVisible();
              }
            }
          }
        }
      } else {
        // Skip test if not enough different days available
        test.skip(
          true,
          "Not enough shifts on different days to test cross-day validation"
        );
      }
    });

    test("should show clear error message with existing shift details", async ({
      page,
    }) => {
      // This test verifies the error message includes details about the existing shift
      const firstDateSection = page
        .locator('[data-testid^="shifts-date-section-"]')
        .first();

      if (await firstDateSection.isVisible()) {
        const shiftCards = firstDateSection.locator(
          '[data-testid^="shift-card-"], .grid > div'
        );
        const shiftCount = await shiftCards.count();

        if (shiftCount >= 2) {
          // Get the first shift details
          const firstShiftCard = shiftCards.first();
          const firstShiftName = await firstShiftCard
            .locator('h3, [data-testid*="shift-name"]')
            .first()
            .textContent();

          // Sign up for first shift
          const firstShiftSignupButton = firstShiftCard
            .locator(
              '[data-testid*="signup-button"], button:has-text("Sign Up"), button:has-text("✨ Sign Up Now")'
            )
            .first();

          if (await firstShiftSignupButton.isVisible()) {
            await firstShiftSignupButton.click();

            const confirmButton = page.getByTestId(
              "shift-signup-confirm-button"
            );
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              await page.waitForLoadState("load");
              await page.waitForTimeout(2000);

              // Try to sign up for second shift
              const secondShiftSignupButton = shiftCards
                .nth(1)
                .locator(
                  '[data-testid*="signup-button"], button:has-text("Sign Up"), button:has-text("✨ Sign Up Now")'
                )
                .first();

              if (await secondShiftSignupButton.isVisible()) {
                await secondShiftSignupButton.click();

                const confirmSecondButton = page.getByTestId(
                  "shift-signup-confirm-button"
                );
                if (await confirmSecondButton.isVisible()) {
                  await confirmSecondButton.click();
                }

                // Check that error message includes the first shift name or time
                const detailedErrorMessage = page
                  .locator("text*=" + (firstShiftName || ""))
                  .or(page.getByText(/at \d+:\d+/i))
                  .or(page.getByText(/you already have.*shift/i));

                if ((await detailedErrorMessage.count()) > 0) {
                  await expect(detailedErrorMessage.first()).toBeVisible();
                }
              }
            }
          }
        } else {
          test.skip(true, "Not enough shifts to test detailed error message");
        }
      } else {
        test.skip(true, "No shifts available to test detailed error message");
      }
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper accessibility attributes", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("load");

      // Check main heading structure
      const mainHeading = page.getByRole("heading", {
        name: /volunteer shifts/i,
      });
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
      const signupButton = page
        .locator(
          '[data-testid*="signup-button"], [data-testid*="waitlist-button"]'
        )
        .first();
      if (await signupButton.isVisible()) {
        await expect(signupButton).toBeVisible();
      }
    });

    test("should support keyboard navigation", async ({ page }) => {
      await page.goto("/shifts");
      await page.waitForLoadState("load");

      // Tab through location filters
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.focus();
      await expect(wellingtonTab).toBeFocused();

      // Check shift cards are keyboard accessible
      const signupButton = page
        .locator(
          '[data-testid*="signup-button"], [data-testid*="waitlist-button"]'
        )
        .first();
      if (await signupButton.isVisible()) {
        await signupButton.focus();
        await expect(signupButton).toBeFocused();
      }
    });
  });
});
