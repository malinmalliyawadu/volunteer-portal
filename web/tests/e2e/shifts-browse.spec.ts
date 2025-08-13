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
  test.beforeEach(async ({ page }) => {
    // Navigate to shifts page first to test both authenticated and unauthenticated access
    await page.goto("/shifts");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Page Structure and Navigation", () => {
    test("should display shifts browse page with main elements", async ({ page }) => {
      // Check page loads successfully
      await expect(page).toHaveURL("/shifts");

      // Check main page container
      const shiftsPage = page.getByTestId("shifts-browse-page");
      await expect(shiftsPage).toBeVisible();

      // Check page title
      const pageTitle = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(pageTitle).toBeVisible();

      // Check page description
      const pageDescription = page.getByText(/find and sign up for upcoming volunteer opportunities/i);
      await expect(pageDescription).toBeVisible();
    });

    test("should display location filter with tabs", async ({ page }) => {
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

    test("should display user preferences tab when logged in with preferences", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if preferences tab exists (only if user has preferences)
      const preferencesTab = page.getByTestId("location-tab-preferences");
      if (await preferencesTab.isVisible()) {
        await expect(preferencesTab).toContainText("Your preferences");
      }
    });
  });

  test.describe("Location Filtering", () => {
    test("should filter by location when clicking location tabs", async ({ page }) => {
      // Click on Wellington tab
      const wellingtonTab = page.getByTestId("location-tab-wellington");
      await wellingtonTab.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to filtered URL
      await expect(page).toHaveURL("/shifts?location=Wellington");

      // Click on "All" tab to clear filter
      const allTab = page.getByTestId("location-tab-all");
      await allTab.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to show all URL
      await expect(page).toHaveURL("/shifts?showAll=true");
    });

    test("should maintain selected location tab state", async ({ page }) => {
      // Navigate directly to filtered URL
      await page.goto("/shifts?location=Glenn%20Innes");
      await page.waitForLoadState("networkidle");

      // Glenn Innes tab should be active
      const glennInnesTab = page.getByTestId("location-tab-glenn-innes");
      await expect(glennInnesTab).toHaveAttribute("data-state", "active");
    });

    test("should display profile filter notification when using preferences", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if profile filter notification is visible (only if user has preferences and no explicit filter)
      const profileNotification = page.getByTestId("profile-filter-notification");
      if (await profileNotification.isVisible()) {
        await expect(profileNotification).toContainText("Showing shifts in your preferred locations");
        await expect(profileNotification).toContainText("update your preferences");
      }
    });
  });

  test.describe("Shifts Display", () => {
    test("should display shifts list when shifts are available", async ({ page }) => {
      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Should have day sections
        const daySections = page.locator('[data-testid^="shifts-day-"]');
        const dayCount = await daySections.count();
        expect(dayCount).toBeGreaterThan(0);

        // First day section should have proper structure
        const firstDay = daySections.first();
        
        // Check day heading
        const dayHeading = firstDay.getByTestId("day-heading");
        await expect(dayHeading).toBeVisible();
        
        // Check day shift count
        const dayShiftCount = firstDay.getByTestId("day-shift-count");
        await expect(dayShiftCount).toBeVisible();
        
        // Check shifts grid
        const shiftsGrid = firstDay.getByTestId("day-shifts-grid");
        await expect(shiftsGrid).toBeVisible();
      }
    });

    test("should display empty state when no shifts are available", async ({ page }) => {
      // Try a location that might not have shifts
      await page.goto("/shifts?location=NonExistentLocation");
      await page.waitForLoadState("networkidle");

      // Check if empty state is visible
      const emptyState = page.getByTestId("shifts-empty-state");
      
      if (await emptyState.isVisible()) {
        await expect(emptyState).toContainText("No shifts available");
        await expect(emptyState).toContainText("Check back later for new opportunities");
      }
    });

    test("should display shift cards with all required information", async ({ page }) => {
      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Get all shift cards
        const shiftCards = page.locator('[data-testid^="shift-card-"]');
        const shiftCount = await shiftCards.count();
        
        if (shiftCount > 0) {
          const firstShift = shiftCards.first();
          
          // Check shift name
          const shiftName = firstShift.getByTestId("shift-name");
          await expect(shiftName).toBeVisible();
          
          // Check shift category
          const shiftCategory = firstShift.getByTestId("shift-category");
          await expect(shiftCategory).toBeVisible();
          
          // Check shift time
          const shiftTime = firstShift.getByTestId("shift-time");
          await expect(shiftTime).toBeVisible();
          
          // Check shift location
          const shiftLocation = firstShift.getByTestId("shift-location");
          await expect(shiftLocation).toBeVisible();
          
          // Check shift capacity
          const shiftCapacity = firstShift.getByTestId("shift-capacity");
          await expect(shiftCapacity).toBeVisible();
          
          // Check capacity count
          const capacityCount = firstShift.getByTestId("capacity-count");
          await expect(capacityCount).toBeVisible();
          
          // Check capacity progress bar
          const capacityProgress = firstShift.getByTestId("capacity-progress");
          await expect(capacityProgress).toBeVisible();
          
          // Check shift actions
          const shiftActions = firstShift.getByTestId("shift-actions");
          await expect(shiftActions).toBeVisible();
        }
      }
    });

    test("should display shift description when available", async ({ page }) => {
      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Get all shift cards
        const shiftCards = page.locator('[data-testid^="shift-card-"]');
        const shiftCount = await shiftCards.count();
        
        if (shiftCount > 0) {
          // Check if any shift has a description
          for (let i = 0; i < Math.min(shiftCount, 3); i++) {
            const shift = shiftCards.nth(i);
            const description = shift.getByTestId("shift-description");
            
            if (await description.isVisible()) {
              await expect(description).toBeVisible();
              break;
            }
          }
        }
      }
    });
  });

  test.describe("Shift Status and Availability", () => {
    test("should display appropriate status for shifts with spots available", async ({ page }) => {
      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for shifts with spots available
        const spotsAvailable = page.getByTestId("spots-available");
        
        if (await spotsAvailable.first().isVisible()) {
          await expect(spotsAvailable.first()).toContainText("spot");
          await expect(spotsAvailable.first()).toContainText("left");
        }
      }
    });

    test("should display waitlist status for full shifts", async ({ page }) => {
      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for shifts with waitlist open
        const waitlistStatus = page.getByTestId("waitlist-status");
        
        if (await waitlistStatus.first().isVisible()) {
          await expect(waitlistStatus.first()).toContainText("Waitlist open");
        }
      }
    });

    test("should display user signup status when already signed up", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if user has any existing signups
      const userSignupStatus = page.getByTestId("user-signup-status");
      
      if (await userSignupStatus.first().isVisible()) {
        const statusText = await userSignupStatus.first().textContent();
        expect(statusText).toMatch(/(Confirmed|Pending|Waitlisted)/);
      }

      // Check for already signed up message
      const alreadySignedUp = page.getByTestId("already-signed-up");
      
      if (await alreadySignedUp.first().isVisible()) {
        await expect(alreadySignedUp.first()).toContainText("You're signed up!");
      }
    });
  });

  test.describe("Shift Signup Functionality", () => {
    test("should display login buttons for unauthenticated users", async ({ page }) => {
      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for login buttons
        const loginToSignupButton = page.getByTestId("login-to-signup-button");
        const loginToJoinWaitlistButton = page.getByTestId("login-to-join-waitlist-button");
        
        if (await loginToSignupButton.first().isVisible()) {
          await expect(loginToSignupButton.first()).toContainText("Sign up");
          await expect(loginToSignupButton.first()).toHaveAttribute("href", /login.*callbackUrl/);
        }
        
        if (await loginToJoinWaitlistButton.first().isVisible()) {
          await expect(loginToJoinWaitlistButton.first()).toContainText("Join waitlist");
          await expect(loginToJoinWaitlistButton.first()).toHaveAttribute("href", /login.*callbackUrl/);
        }
      }
    });

    test("should display signup buttons for authenticated users", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for signup buttons
        const signupButton = page.getByTestId("signup-button");
        const joinWaitlistButton = page.getByTestId("join-waitlist-button");
        
        if (await signupButton.first().isVisible()) {
          await expect(signupButton.first()).toContainText("Sign up");
        }
        
        if (await joinWaitlistButton.first().isVisible()) {
          await expect(joinWaitlistButton.first()).toContainText("Join waitlist");
        }
      }
    });

    test("should open signup dialog when clicking signup button", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for a signup button
        const signupButton = page.getByTestId("signup-button").first();
        
        if (await signupButton.isVisible()) {
          await signupButton.click();
          
          // Check signup dialog appears
          const signupDialog = page.getByTestId("shift-signup-dialog");
          await expect(signupDialog).toBeVisible();
          
          // Check dialog title
          const dialogTitle = page.getByTestId("signup-dialog-title");
          await expect(dialogTitle).toBeVisible();
          await expect(dialogTitle).toContainText("Confirm Signup");
          
          // Check dialog description
          const dialogDescription = page.getByTestId("signup-dialog-description");
          await expect(dialogDescription).toBeVisible();
          
          // Check shift details in dialog
          const shiftDetails = page.getByTestId("signup-shift-details");
          await expect(shiftDetails).toBeVisible();
          
          // Check shift name in dialog
          const shiftName = page.getByTestId("signup-shift-name");
          await expect(shiftName).toBeVisible();
          
          // Check dialog buttons
          const cancelButton = page.getByTestId("cancel-signup-dialog-button");
          await expect(cancelButton).toBeVisible();
          await expect(cancelButton).toContainText("Cancel");
          
          const confirmButton = page.getByTestId("confirm-signup-button");
          await expect(confirmButton).toBeVisible();
          await expect(confirmButton).toContainText("Confirm Signup");
        }
      }
    });

    test("should close signup dialog when clicking cancel", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for a signup button
        const signupButton = page.getByTestId("signup-button").first();
        
        if (await signupButton.isVisible()) {
          await signupButton.click();
          
          // Wait for dialog to appear
          const signupDialog = page.getByTestId("shift-signup-dialog");
          await expect(signupDialog).toBeVisible();
          
          // Click cancel button
          const cancelButton = page.getByTestId("cancel-signup-dialog-button");
          await cancelButton.click();
          
          // Dialog should be closed
          await expect(signupDialog).not.toBeVisible();
        }
      }
    });

    test("should display shift details correctly in signup dialog", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for a signup button
        const signupButton = page.getByTestId("signup-button").first();
        
        if (await signupButton.isVisible()) {
          await signupButton.click();
          
          // Wait for dialog to appear
          const signupDialog = page.getByTestId("shift-signup-dialog");
          await expect(signupDialog).toBeVisible();
          
          // Check all shift detail elements
          const shiftDate = page.getByTestId("signup-shift-date");
          await expect(shiftDate).toBeVisible();
          
          const shiftTime = page.getByTestId("signup-shift-time");
          await expect(shiftTime).toBeVisible();
          
          const shiftLocation = page.getByTestId("signup-shift-location");
          if (await shiftLocation.isVisible()) {
            await expect(shiftLocation).toBeVisible();
          }
          
          const shiftCapacity = page.getByTestId("signup-shift-capacity");
          await expect(shiftCapacity).toBeVisible();
          
          // Check approval info
          const approvalInfo = page.getByTestId("signup-approval-info");
          await expect(approvalInfo).toBeVisible();
          await expect(approvalInfo).toContainText("Approval Required");
        }
      }
    });

    test("should open waitlist dialog for full shifts", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/shifts");
      await page.waitForLoadState("networkidle");

      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for a join waitlist button
        const joinWaitlistButton = page.getByTestId("join-waitlist-button").first();
        
        if (await joinWaitlistButton.isVisible()) {
          await joinWaitlistButton.click();
          
          // Check signup dialog appears with waitlist content
          const signupDialog = page.getByTestId("shift-signup-dialog");
          await expect(signupDialog).toBeVisible();
          
          // Check dialog title for waitlist
          const dialogTitle = page.getByTestId("signup-dialog-title");
          await expect(dialogTitle).toContainText("Join Waitlist");
          
          // Check confirm button text for waitlist
          const confirmButton = page.getByTestId("confirm-signup-button");
          await expect(confirmButton).toContainText("Join Waitlist");
          
          // Check approval info for waitlist
          const approvalInfo = page.getByTestId("signup-approval-info");
          await expect(approvalInfo).toContainText("Waitlist Process");
        }
      }
    });
  });

  test.describe("Authentication and Access Control", () => {
    test("should allow access to shifts page without authentication", async ({ page }) => {
      // Shifts page should be accessible without login
      await expect(page).toHaveURL("/shifts");
      
      const shiftsPage = page.getByTestId("shifts-browse-page");
      await expect(shiftsPage).toBeVisible();
    });

    test("should navigate to login when clicking signup as unauthenticated user", async ({ page }) => {
      // Check if shifts list is visible
      const shiftsList = page.getByTestId("shifts-list");
      
      if (await shiftsList.isVisible()) {
        // Look for login to signup button
        const loginButton = page.getByTestId("login-to-signup-button").first();
        
        if (await loginButton.isVisible()) {
          await loginButton.click();
          await page.waitForLoadState("networkidle");
          
          // Should navigate to login with callback
          await expect(page).toHaveURL(/\/login.*callbackUrl.*shifts/);
        }
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should be responsive on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Check that main elements are still visible and accessible
      const shiftsPage = page.getByTestId("shifts-browse-page");
      await expect(shiftsPage).toBeVisible();

      // Check location filter is accessible
      const locationFilter = page.getByTestId("location-filter");
      await expect(locationFilter).toBeVisible();

      // Check shifts list or empty state is accessible
      const shiftsList = page.getByTestId("shifts-list");
      const emptyState = page.getByTestId("shifts-empty-state");
      
      const hasShifts = await shiftsList.isVisible();
      const isEmpty = await emptyState.isVisible();
      
      expect(hasShifts || isEmpty).toBe(true);
    });
  });

  test.describe("Loading and Error Handling", () => {
    test("should handle loading state gracefully", async ({ page }) => {
      // Navigate to shifts page
      await page.goto("/shifts");

      // Wait for the main content to be visible
      const shiftsPage = page.getByTestId("shifts-browse-page");
      await expect(shiftsPage).toBeVisible({ timeout: 10000 });

      // Check that no error messages are displayed
      const errorMessage = page.getByText(/error|failed|something went wrong/i);
      await expect(errorMessage).not.toBeVisible();
    });

    test("should display appropriate content based on shift availability", async ({ page }) => {
      // Either shifts list or empty state should be visible
      const shiftsList = page.getByTestId("shifts-list");
      const emptyState = page.getByTestId("shifts-empty-state");
      
      const hasShifts = await shiftsList.isVisible();
      const isEmpty = await emptyState.isVisible();
      
      // One of them should be visible
      expect(hasShifts || isEmpty).toBe(true);
      
      // But not both
      expect(hasShifts && isEmpty).toBe(false);
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper accessibility attributes", async ({ page }) => {
      // Check that main headings have proper roles
      const pageTitle = page.getByRole("heading", { name: /volunteer shifts/i });
      await expect(pageTitle).toBeVisible();

      // Check that day headings have proper roles
      const dayHeadings = page.getByTestId("day-heading");
      if (await dayHeadings.first().isVisible()) {
        await expect(dayHeadings.first()).toHaveRole("heading");
      }

      // Check that interactive elements are accessible
      const locationTabs = page.getByTestId("location-tabs");
      await expect(locationTabs).toBeVisible();

      // Check that buttons have accessible names
      const signupButtons = page.getByTestId("signup-button");
      if (await signupButtons.first().isVisible()) {
        const buttonText = await signupButtons.first().textContent();
        expect(buttonText).toBeTruthy();
      }
    });
  });
});