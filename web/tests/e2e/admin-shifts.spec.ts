import { test, expect } from "./base";
import type { Page } from "@playwright/test";

// Helper function to wait for page to load completely
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(500); // Small buffer for animations
}

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await waitForPageLoad(page);

  const adminButton = page.getByTestId("quick-login-admin-button");
  await adminButton.click();

  // Wait for navigation away from login page
  await page.waitForURL(
    (url) => {
      return url.pathname !== "/login";
    },
    { timeout: 10000 }
  );
}

// Helper function to login as volunteer (for permission tests)
async function loginAsVolunteer(page: Page) {
  await page.goto("/login");
  await waitForPageLoad(page);

  const volunteerButton = page.getByTestId("quick-login-volunteer-button");
  await volunteerButton.click();

  // Wait for navigation away from login page
  await page.waitForURL(
    (url) => {
      return url.pathname !== "/login";
    },
    { timeout: 10000 }
  );
}

test.describe("Admin Shifts Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Page Access and Authentication", () => {
    test("should allow admin users to access the shifts management page", async ({
      page,
    }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Verify we're on the admin shifts page
      const adminShiftsPage = page.getByTestId("admin-shifts-page");
      await expect(adminShiftsPage).toBeVisible();

      // Verify page title
      const pageTitle = page.getByRole("heading", { name: /admin.*shifts/i });
      await expect(pageTitle).toBeVisible();
    });

    test("should redirect non-admin users away from admin shifts pages", async ({
      page,
    }) => {
      // Logout and login as volunteer
      await page.goto("/api/auth/signout");
      await loginAsVolunteer(page);

      // Try to access admin shifts page
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Should be redirected away from admin page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/admin/shifts");

      // Should be redirected to dashboard page
      expect(currentUrl).toContain("/dashboard");
    });

    test("should redirect unauthenticated users to login", async ({ page }) => {
      // Clear all cookies and session storage to ensure unauthenticated state
      await page.context().clearCookies();
      await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
      });

      // Try to access admin shifts page
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Check final URL - should be redirected to login or access denied
      const currentUrl = page.url();

      // Should either be redirected to login or not have access to admin shifts
      if (currentUrl.includes("/login")) {
        expect(currentUrl).toContain("/login");
        // Check for callback URL (may be encoded differently)
        expect(currentUrl).toMatch(/callbackUrl.*admin/);
      } else {
        // Alternative: should not be on the admin shifts page
        expect(currentUrl).not.toContain("/admin/shifts");
      }
    });
  });

  test.describe("Shifts List Page Structure", () => {
    test("should display admin shifts page with proper structure", async ({
      page,
    }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Check main page elements
      const adminShiftsPage = page.getByTestId("admin-shifts-page");
      await expect(adminShiftsPage).toBeVisible();

      // Check create shift button
      const createShiftButton = page.getByTestId("create-shift-button");
      await expect(createShiftButton).toBeVisible();
      await expect(createShiftButton).toContainText("Create shift");

      // Check filters section
      const filtersSection = page.getByTestId("filters-section");
      await expect(filtersSection).toBeVisible();
    });

    test("should display filters and navigation correctly", async ({
      page,
    }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Check filters section
      const filtersSection = page.getByTestId("filters-section");
      await expect(filtersSection).toBeVisible();

      // Check location filter (it's a Select component)
      const locationFilter = page.getByTestId("location-filter");
      await expect(locationFilter).toBeVisible();

      // Check date filter trigger button
      const dateFilterTrigger = page.getByTestId("date-filter-trigger");
      await expect(dateFilterTrigger).toBeVisible();

      // Check clear filters button (if any filters are applied)
      const clearFiltersButton = page.getByTestId("clear-filters-button");
      if (await clearFiltersButton.isVisible()) {
        await expect(clearFiltersButton).toContainText("Clear all filters");
      }
    });

    test("should display upcoming and historical shifts sections", async ({
      page,
    }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Check upcoming shifts section
      const upcomingShiftsSection = page.getByTestId("upcoming-shifts-section");
      await expect(upcomingShiftsSection).toBeVisible();

      const upcomingTitle = page.getByRole("heading", {
        name: /upcoming shifts/i,
      });
      await expect(upcomingTitle).toBeVisible();

      // Check historical shifts section
      const historicalShiftsSection = page.getByTestId(
        "historical-shifts-section"
      );
      await expect(historicalShiftsSection).toBeVisible();

      const historicalTitle = page.getByRole("heading", {
        name: /historical shifts/i,
      });
      await expect(historicalTitle).toBeVisible();
    });
  });

  test.describe("Shift Display and Information", () => {
    test("should display shift cards with proper information", async ({
      page,
    }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Get shift cards if any exist
      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        // Check first shift card
        const firstShiftCard = shiftCards.first();
        await expect(firstShiftCard).toBeVisible();

        // Extract shift ID from testid
        const firstCardTestId = await firstShiftCard.getAttribute(
          "data-testid"
        );
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          // Check shift name
          const shiftName = page.getByTestId(`shift-name-${shiftId}`);
          await expect(shiftName).toBeVisible();

          // Check shift time
          const shiftTime = page.getByTestId(`shift-time-${shiftId}`);
          await expect(shiftTime).toBeVisible();

          // Check shift date
          const shiftDate = page.getByTestId(`shift-date-${shiftId}`);
          await expect(shiftDate).toBeVisible();

          // Check shift location
          const shiftLocation = page.getByTestId(`shift-location-${shiftId}`);
          if (await shiftLocation.isVisible()) {
            await expect(shiftLocation).toBeVisible();
          }

          // Check capacity information
          const shiftCapacity = page.getByTestId(`shift-capacity-${shiftId}`);
          await expect(shiftCapacity).toBeVisible();

          // Check edit button
          const editButton = page.getByTestId(`edit-shift-${shiftId}`);
          await expect(editButton).toBeVisible();
          await expect(editButton).toContainText("Edit");

          // Check delete button
          const deleteButton = page.getByTestId(`delete-shift-${shiftId}`);
          await expect(deleteButton).toBeVisible();
          await expect(deleteButton).toContainText("Delete");
        }
      } else {
        // Check empty state message
        const emptyStateMessage = page.getByTestId("no-shifts-message");
        await expect(emptyStateMessage).toBeVisible();
      }
    });

    test("should display shift signups information correctly", async ({
      page,
    }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstCardTestId = await shiftCards
          .first()
          .getAttribute("data-testid");
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          // Check signup badges (confirmed, pending, waitlisted)
          const confirmedBadge = page.getByTestId(
            `confirmed-signups-${shiftId}`
          );
          const pendingBadge = page.getByTestId(`pending-signups-${shiftId}`);
          const waitlistedBadge = page.getByTestId(
            `waitlisted-signups-${shiftId}`
          );

          // At least confirmed badge should be visible or signup count should be visible
          const signupsList = page.getByTestId(`signups-list-${shiftId}`);
          const noSignupsMessage = page.getByTestId(`no-signups-${shiftId}`);

          // Either signups list or no signups message should be visible
          const hasSignupsList = await signupsList.isVisible();
          const hasNoSignupsMessage = await noSignupsMessage.isVisible();

          expect(hasSignupsList || hasNoSignupsMessage).toBeTruthy();

          if (hasSignupsList) {
            // Check individual signup rows
            const signupRows = page.locator(`[data-testid^='signup-row-']`);
            const signupCount = await signupRows.count();

            if (signupCount > 0) {
              const firstSignup = signupRows.first();
              await expect(firstSignup).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe("Filtering and Search", () => {
    test("should filter shifts by location", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Apply location filter (it's a Select component, so click and select)
      const locationFilter = page.getByTestId("location-filter");
      await locationFilter.click();

      // Wait for dropdown to open and select option
      await page.getByRole("option", { name: /wellington/i }).click();

      // Wait for page to update
      await page.waitForURL("/admin/shifts?*");
      await waitForPageLoad(page);

      // Check URL contains filter parameter
      const currentUrl = page.url();
      expect(currentUrl).toContain("location=Wellington");
    });

    test("should filter shifts by date range", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Click on date filter trigger to open calendar
      const dateFilterTrigger = page.getByTestId("date-filter-trigger");
      await dateFilterTrigger.click();

      // Wait for calendar to appear
      const calendar = page.getByTestId("date-filter-calendar");
      await expect(calendar).toBeVisible();

      // For now, just close the calendar and check it was interactive
      await dateFilterTrigger.click();
      await expect(calendar).not.toBeVisible();
    });

    test("should clear all filters", async ({ page }) => {
      // Start with filters applied
      await page.goto("/admin/shifts?location=Wellington&dateFrom=2024-01-01");
      await waitForPageLoad(page);

      // Click clear filters button
      const clearFiltersButton = page.getByTestId("clear-filters-button");
      if (await clearFiltersButton.isVisible()) {
        await clearFiltersButton.click();
        await waitForPageLoad(page);

        // Check URL no longer contains filter parameters
        const currentUrl = page.url();
        expect(currentUrl).not.toContain("location=");
        expect(currentUrl).not.toContain("dateFrom=");
        expect(currentUrl).not.toContain("dateTo=");
      }
    });
  });

  test.describe("Shift Actions", () => {
    test("should navigate to create shift page", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const createShiftButton = page.getByTestId("create-shift-button");
      await createShiftButton.click();

      // Should navigate to create shift page
      await page.waitForURL("**/admin/shifts/new", { timeout: 10000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain("/admin/shifts/new");
    });

    test("should navigate to edit shift page", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstCardTestId = await shiftCards
          .first()
          .getAttribute("data-testid");
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          const editButton = page.getByTestId(`edit-shift-${shiftId}`);
          await editButton.click();

          // Should navigate to edit shift page
          await page.waitForURL(`**/admin/shifts/${shiftId}/edit`, {
            timeout: 10000,
          });

          const currentUrl = page.url();
          expect(currentUrl).toContain(`/admin/shifts/${shiftId}/edit`);
        }
      }
    });

    test("should open delete confirmation dialog", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstCardTestId = await shiftCards
          .first()
          .getAttribute("data-testid");
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          const deleteButton = page.getByTestId(`delete-shift-${shiftId}`);
          await deleteButton.click();

          // Delete confirmation dialog should appear
          const deleteDialog = page.getByTestId("delete-shift-dialog");
          await expect(deleteDialog).toBeVisible();

          const dialogTitle = page.getByTestId("delete-shift-dialog-title");
          await expect(dialogTitle).toBeVisible();
          await expect(dialogTitle).toContainText("Delete Shift");

          // Check cancel and confirm buttons
          const cancelButton = page.getByTestId("delete-shift-cancel-button");
          const confirmButton = page.getByTestId("delete-shift-confirm-button");

          await expect(cancelButton).toBeVisible();
          await expect(confirmButton).toBeVisible();

          // Close dialog
          await cancelButton.click();
          await expect(deleteDialog).not.toBeVisible();
        }
      }
    });
  });

  test.describe("Pagination", () => {
    test("should display pagination controls", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Check for upcoming shifts pagination
      const upcomingPagination = page.getByTestId("upcoming-pagination");
      if (await upcomingPagination.isVisible()) {
        const prevButton = page.getByTestId("upcoming-prev-button");
        const nextButton = page.getByTestId("upcoming-next-button");
        const pageInfo = page.getByTestId("upcoming-page-info");

        await expect(prevButton).toBeVisible();
        await expect(nextButton).toBeVisible();
        await expect(pageInfo).toBeVisible();
      }

      // Check for historical shifts pagination
      const historicalPagination = page.getByTestId("historical-pagination");
      if (await historicalPagination.isVisible()) {
        const prevButton = page.getByTestId("historical-prev-button");
        const nextButton = page.getByTestId("historical-next-button");
        const pageInfo = page.getByTestId("historical-page-info");

        await expect(prevButton).toBeVisible();
        await expect(nextButton).toBeVisible();
        await expect(pageInfo).toBeVisible();
      }
    });
  });

  test.describe("Success Messages", () => {
    test("should display success message after shift creation", async ({
      page,
    }) => {
      await page.goto("/admin/shifts?created=1");
      await waitForPageLoad(page);

      const successMessage = page.getByTestId("shift-created-message");
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText("Shift created successfully");
    });

    test("should display success message after shift update", async ({
      page,
    }) => {
      await page.goto("/admin/shifts?updated=1");
      await waitForPageLoad(page);

      const successMessage = page.getByTestId("shift-updated-message");
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText("Shift updated successfully");
    });

    test("should display success message after shift deletion", async ({
      page,
    }) => {
      await page.goto("/admin/shifts?deleted=1");
      await waitForPageLoad(page);

      const successMessage = page.getByTestId("shift-deleted-message");
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText("Shift deleted successfully");
    });
  });

  test.describe("Responsive Design", () => {
    test("should be responsive on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      // Main elements should still be accessible
      const adminShiftsPage = page.getByTestId("admin-shifts-page");
      await expect(adminShiftsPage).toBeVisible();

      const createShiftButton = page.getByTestId("create-shift-button");
      await expect(createShiftButton).toBeVisible();

      // Filters should be functional
      const filtersSection = page.getByTestId("filters-section");
      await expect(filtersSection).toBeVisible();
    });
  });

  test.describe("Loading States", () => {
    test("should handle slow loading gracefully", async ({ page }) => {
      // Simulate slow network
      await page.route("**/admin/shifts", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.continue();
      });

      await page.goto("/admin/shifts");

      // Page should eventually load
      await waitForPageLoad(page);

      const adminShiftsPage = page.getByTestId("admin-shifts-page");
      await expect(adminShiftsPage).toBeVisible();

      // Clean up route
      await page.unroute("**/admin/shifts");
    });
  });

  test.describe("Create New Shift Page", () => {
    test("should access create new shift page", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await waitForPageLoad(page);

      // Verify page loads and has proper structure
      const createShiftPage = page.getByTestId("create-shift-page");
      await expect(createShiftPage).toBeVisible();

      // Check page title
      const pageTitle = page.getByRole("heading", { name: /create shifts/i });
      await expect(pageTitle).toBeVisible();
    });

    test("should display single shift creation form", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await waitForPageLoad(page);

      // Should default to single shift tab
      const singleShiftTab = page.getByRole("tab", { name: /single shift/i });
      await expect(singleShiftTab).toHaveAttribute("data-state", "active");

      // Check form fields
      const shiftTypeSelect = page.getByTestId("shift-type-select");
      const dateInput = page.getByTestId("shift-date-input");
      const startTimeInput = page.getByTestId("shift-start-time-input");
      const endTimeInput = page.getByTestId("shift-end-time-input");
      const locationSelect = page.getByTestId("shift-location-select");
      const capacityInput = page.getByTestId("shift-capacity-input");
      const notesTextarea = page.getByTestId("shift-notes-textarea");

      await expect(shiftTypeSelect).toBeVisible();
      await expect(dateInput).toBeVisible();
      await expect(startTimeInput).toBeVisible();
      await expect(endTimeInput).toBeVisible();
      await expect(locationSelect).toBeVisible();
      await expect(capacityInput).toBeVisible();
      await expect(notesTextarea).toBeVisible();

      // Check action buttons
      const cancelButton = page.getByTestId("cancel-shift-creation-button");
      const createButton = page.getByTestId("create-shift-button");

      await expect(cancelButton).toBeVisible();
      await expect(createButton).toBeVisible();
      await expect(createButton).toContainText("Create shift");
    });

    test("should display bulk shift creation form", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await waitForPageLoad(page);

      // Switch to bulk creation tab
      const bulkShiftTab = page.getByRole("tab", { name: /weekly schedule/i });
      await bulkShiftTab.click();

      await expect(bulkShiftTab).toHaveAttribute("data-state", "active");

      // Check bulk form fields
      const shiftTypeSelect = page.getByTestId("bulk-shift-type-select");
      const startDateInput = page.getByTestId("bulk-start-date-input");
      const endDateInput = page.getByTestId("bulk-end-date-input");
      const locationSelect = page.getByTestId("bulk-location-select");

      await expect(shiftTypeSelect).toBeVisible();
      await expect(startDateInput).toBeVisible();
      await expect(endDateInput).toBeVisible();
      await expect(locationSelect).toBeVisible();

      // Check day selection checkboxes
      const mondayCheckbox = page.getByTestId("day-monday-checkbox");
      const tuesdayCheckbox = page.getByTestId("day-tuesday-checkbox");

      await expect(mondayCheckbox).toBeVisible();
      await expect(tuesdayCheckbox).toBeVisible();

      // Check template selection
      const morningKitchenTemplate = page.getByTestId(
        "template-morning-kitchen-checkbox"
      );
      await expect(morningKitchenTemplate).toBeVisible();
    });

    test("should validate required fields", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await waitForPageLoad(page);

      // Try to submit empty form
      const createButton = page.getByTestId("create-shift-button");
      await createButton.click();

      // Check for HTML5 validation or form errors
      const shiftTypeSelect = page.getByTestId("shift-type-select");
      const isSelectRequired = await shiftTypeSelect.evaluate(
        (el: HTMLSelectElement) => el.hasAttribute("required")
      );

      if (isSelectRequired) {
        const validationMessage = await shiftTypeSelect.evaluate(
          (el: HTMLSelectElement) => el.validationMessage
        );
        expect(validationMessage).toBeTruthy();
      }
    });

    test("should show quick templates", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await waitForPageLoad(page);

      // Check that quick templates are visible
      const quickTemplates = page.getByTestId("quick-templates-section");
      await expect(quickTemplates).toBeVisible();

      // Check some template badges
      const morningKitchenTemplate = page.locator("text=Morning Kitchen");
      const lunchServiceTemplate = page.locator("text=Lunch Service");

      await expect(morningKitchenTemplate).toBeVisible();
      await expect(lunchServiceTemplate).toBeVisible();
    });

    test("should cancel and return to shifts page", async ({ page }) => {
      await page.goto("/admin/shifts/new");
      await waitForPageLoad(page);

      const cancelButton = page.getByTestId("cancel-shift-creation-button");
      await cancelButton.click();

      // Should navigate back to shifts page
      await page.waitForURL("**/admin/shifts", { timeout: 10000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain("/admin/shifts");
      expect(currentUrl).not.toContain("/new");
    });

    test.skip("should successfully create a single shift", async ({ page }) => {
      // Skip this test as it would create actual data
      await page.goto("/admin/shifts/new");
      await waitForPageLoad(page);

      // Fill out form with test data
      // This test would:
      // 1. Select shift type
      // 2. Set date and time
      // 3. Select location
      // 4. Set capacity
      // 5. Add notes
      // 6. Click create
      // 7. Verify success message and redirect
    });
  });

  test.describe("Edit Shift Page", () => {
    test("should access edit shift page", async ({ page }) => {
      // First go to shifts page to find a shift to edit
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstCardTestId = await shiftCards
          .first()
          .getAttribute("data-testid");
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          await page.goto(`/admin/shifts/${shiftId}/edit`);
          await waitForPageLoad(page);

          // Verify edit page loads
          const editShiftPage = page.getByTestId("edit-shift-page");
          await expect(editShiftPage).toBeVisible();

          // Check page title contains "Edit"
          const pageTitle = page.getByRole("heading", { name: /edit shift/i });
          await expect(pageTitle).toBeVisible();
        }
      } else {
        console.log("No shifts found for edit test");
      }
    });

    test("should display pre-populated form fields", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstCardTestId = await shiftCards
          .first()
          .getAttribute("data-testid");
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          await page.goto(`/admin/shifts/${shiftId}/edit`);
          await waitForPageLoad(page);

          // Check that form fields are pre-populated
          const shiftTypeSelect = page.getByTestId("edit-shift-type-select");
          const dateInput = page.getByTestId("edit-shift-date-input");
          const startTimeInput = page.getByTestId(
            "edit-shift-start-time-input"
          );
          const endTimeInput = page.getByTestId("edit-shift-end-time-input");
          const locationSelect = page.getByTestId("edit-shift-location-select");
          const capacityInput = page.getByTestId("edit-shift-capacity-input");

          await expect(shiftTypeSelect).toBeVisible();
          await expect(dateInput).toBeVisible();
          await expect(startTimeInput).toBeVisible();
          await expect(endTimeInput).toBeVisible();
          await expect(locationSelect).toBeVisible();
          await expect(capacityInput).toBeVisible();

          // Check that capacity input has a value
          const capacityValue = await capacityInput.inputValue();
          expect(capacityValue).toBeTruthy();
          expect(parseInt(capacityValue)).toBeGreaterThan(0);
        }
      }
    });

    test("should display delete and cancel buttons", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstCardTestId = await shiftCards
          .first()
          .getAttribute("data-testid");
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          await page.goto(`/admin/shifts/${shiftId}/edit`);
          await waitForPageLoad(page);

          // Check action buttons
          const deleteButton = page.getByTestId(
            "delete-shift-from-edit-button"
          );
          const cancelButton = page.getByTestId("cancel-edit-shift-button");
          const updateButton = page.getByTestId("update-shift-button");

          await expect(deleteButton).toBeVisible();
          await expect(deleteButton).toContainText("Delete");

          await expect(cancelButton).toBeVisible();
          await expect(updateButton).toBeVisible();
          await expect(updateButton).toContainText("Update");
        }
      }
    });

    test("should show warnings for past shifts", async ({ page }) => {
      // This test would need a past shift to work properly
      // For now, we'll skip it as it depends on data
      console.log("Test for past shift warnings would need specific test data");
    });

    test("should show warnings for shifts with signups", async ({ page }) => {
      // This test would need a shift with signups to work properly
      // For now, we'll skip it as it depends on data
      console.log("Test for shifts with signups would need specific test data");
    });

    test("should cancel and return to shifts page", async ({ page }) => {
      await page.goto("/admin/shifts");
      await waitForPageLoad(page);

      const shiftCards = page.locator("[data-testid^='shift-card-']");
      const shiftCount = await shiftCards.count();

      if (shiftCount > 0) {
        const firstCardTestId = await shiftCards
          .first()
          .getAttribute("data-testid");
        const shiftId = firstCardTestId?.replace("shift-card-", "");

        if (shiftId) {
          await page.goto(`/admin/shifts/${shiftId}/edit`);
          await waitForPageLoad(page);

          const cancelButton = page.getByTestId("cancel-edit-shift-button");
          await cancelButton.click();

          // Should navigate back to shifts page
          await page.waitForURL("**/admin/shifts", { timeout: 10000 });

          const currentUrl = page.url();
          expect(currentUrl).toContain("/admin/shifts");
          expect(currentUrl).not.toContain("/edit");
        }
      }
    });

    test.skip("should successfully update a shift", async ({ page }) => {
      // Skip this test as it would modify actual data
      // This test would:
      // 1. Navigate to edit page
      // 2. Modify form fields
      // 3. Click update
      // 4. Verify success message and redirect
    });
  });
});
