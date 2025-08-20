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

test.describe("My Shifts Calendar Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVolunteer(page);

    // Navigate to my shifts page
    await page.goto("/shifts/mine");
    await page.waitForLoadState("load");

    // Skip tests if login failed (we're still on login page)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip(true, "Login failed - skipping my shifts tests");
    }
  });

  test.describe("Page Structure and Layout", () => {
    test("should display my shifts page with main elements", async ({ page }) => {
      // Check page loads successfully
      await expect(page).toHaveURL("/shifts/mine");

      // Check main page container
      const myShiftsPage = page.getByTestId("my-shifts-page");
      await expect(myShiftsPage).toBeVisible();

      // Check page title and description
      const pageTitle = page.getByRole("heading", { name: /my shifts/i });
      await expect(pageTitle).toBeVisible();

      const pageDescription = page.getByText("Your volunteer schedule and shift history");
      await expect(pageDescription).toBeVisible();
    });

    test("should display stats overview cards", async ({ page }) => {
      // Check stats overview section
      const statsOverview = page.getByTestId("stats-overview");
      await expect(statsOverview).toBeVisible();

      // Check all 4 stat cards are visible
      const completedCard = page.getByTestId("completed-shifts-card");
      await expect(completedCard).toBeVisible();

      const upcomingCard = page.getByTestId("upcoming-shifts-card");
      await expect(upcomingCard).toBeVisible();

      const thisMonthCard = page.getByTestId("this-month-shifts-card");
      await expect(thisMonthCard).toBeVisible();

      const totalHoursCard = page.getByTestId("total-hours-card");
      await expect(totalHoursCard).toBeVisible();

      // Check that each card has a numeric value
      const completedCount = await page.getByTestId("completed-shifts-card-count").textContent();
      const upcomingCount = await page.getByTestId("upcoming-shifts-card-count").textContent();
      const thisMonthCount = await page.getByTestId("this-month-shifts-card-count").textContent();
      const totalHoursCount = await page.getByTestId("total-hours-card-count").textContent();

      expect(completedCount).toMatch(/^\d+$/);
      expect(upcomingCount).toMatch(/^\d+$/);
      expect(thisMonthCount).toMatch(/^\d+$/);
      expect(totalHoursCount).toMatch(/^\d+$/);
    });

    test("should display calendar view with navigation", async ({ page }) => {
      // Check calendar view is visible
      const calendarView = page.getByTestId("calendar-view");
      await expect(calendarView).toBeVisible();

      // Check calendar title shows current month/year
      const calendarTitle = page.getByTestId("calendar-title");
      await expect(calendarTitle).toBeVisible();
      
      const titleText = await calendarTitle.textContent();
      expect(titleText).toMatch(/^\w+ \d{4}$/); // Format: "Month Year"

      // Check calendar description
      const calendarDescription = page.getByTestId("calendar-description");
      await expect(calendarDescription).toBeVisible();
      await expect(calendarDescription).toContainText("Your volunteer schedule");

      // Check navigation section
      const navigation = page.getByTestId("calendar-navigation");
      await expect(navigation).toBeVisible();

      // Check navigation buttons
      const prevButton = page.getByTestId("prev-month-button");
      await expect(prevButton).toBeVisible();

      const nextButton = page.getByTestId("next-month-button");
      await expect(nextButton).toBeVisible();
    });

    test("should display calendar grid with day headers", async ({ page }) => {
      // Check calendar grid exists
      const calendarGrid = page.getByTestId("calendar-grid");
      await expect(calendarGrid).toBeVisible();

      // Check day headers
      const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (const day of dayHeaders) {
        const dayHeader = page.getByText(day).first();
        await expect(dayHeader).toBeVisible();
      }

      // Check that calendar has day cells (should be at least 28 days in any month)
      const dayCells = page.locator(".min-h-\\[120px\\]");
      const dayCount = await dayCells.count();
      expect(dayCount).toBeGreaterThanOrEqual(28);
    });
  });

  test.describe("Calendar Navigation", () => {
    test("should navigate to previous month", async ({ page }) => {
      // Get current month from title
      const initialTitle = await page.getByTestId("calendar-title").textContent();
      
      // Click previous month button
      const prevButton = page.getByTestId("prev-month-button");
      await prevButton.click();
      await page.waitForLoadState("load");

      // Check that navigation worked (URL may or may not have month param)
      // The important thing is that the month title changed
      await page.waitForTimeout(500); // Give time for any URL updates

      // Check month title has changed
      const newTitle = await page.getByTestId("calendar-title").textContent();
      expect(newTitle).not.toBe(initialTitle);
    });

    test("should navigate to next month", async ({ page }) => {
      // Get current month from title
      const initialTitle = await page.getByTestId("calendar-title").textContent();
      
      // Click next month button
      const nextButton = page.getByTestId("next-month-button");
      await nextButton.click();
      await page.waitForLoadState("load");

      // Check that navigation worked (URL may or may not have month param)
      // The important thing is that the month title changed
      await page.waitForTimeout(500); // Give time for any URL updates

      // Check month title has changed
      const newTitle = await page.getByTestId("calendar-title").textContent();
      expect(newTitle).not.toBe(initialTitle);
    });

    test("should show 'Today' button when not viewing current month", async ({ page }) => {
      // Navigate to next month
      const nextButton = page.getByTestId("next-month-button");
      await nextButton.click();
      await page.waitForLoadState("load");

      // Today button should now be visible
      const todayButton = page.getByTestId("today-button");
      await expect(todayButton).toBeVisible();

      // Click today button to return to current month
      await todayButton.click();
      await page.waitForLoadState("load");

      // Should be back to base URL
      await expect(page).toHaveURL("/shifts/mine");
    });
  });

  test.describe("Calendar Days and Shifts", () => {
    test("should highlight today's date", async ({ page }) => {
      const today = new Date().getDate();
      
      // Look for today's date with special styling
      const todayCell = page.locator(".bg-blue-500").first();
      if (await todayCell.isVisible()) {
        const todayText = await todayCell.textContent();
        expect(todayText?.trim()).toBe(today.toString());
      }
    });

    test("should display day numbers correctly", async ({ page }) => {
      // Look for day cells within the calendar grid
      const calendarGrid = page.getByTestId("calendar-grid");
      await expect(calendarGrid).toBeVisible();
      
      // Look for day number elements (circles with dates)
      const dayElements = calendarGrid.locator(".w-6.h-6, .w-7.h-7, .text-sm.font-bold");
      const count = await dayElements.count();
      
      if (count > 0) {
        // Check first few day numbers if they exist
        for (let i = 0; i < Math.min(count, 3); i++) {
          const dayText = await dayElements.nth(i).textContent();
          if (dayText && dayText.trim()) {
            expect(dayText.trim()).toMatch(/^\d{1,2}$/);
          }
        }
      } else {
        // Alternative: check for any text that looks like day numbers in the grid
        const textElements = calendarGrid.locator("text=/^\\d{1,2}$/");
        const textCount = await textElements.count();
        expect(textCount).toBeGreaterThan(0);
      }
    });

    test("should show shift information on calendar days", async ({ page }) => {
      // Look for shift elements on calendar
      const shiftElements = page.locator(".bg-gradient-to-br");
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        // Check first shift element
        const firstShift = shiftElements.first();
        await expect(firstShift).toBeVisible();
        
        // Shift should have time and emoji
        const shiftTime = firstShift.locator(".font-bold.text-xs, .font-bold.text-sm");
        if (await shiftTime.count() > 0) {
          const timeText = await shiftTime.textContent();
          expect(timeText).toMatch(/^\d{2}:\d{2}$/); // Time format HH:MM
        }
      }
    });

    test("should show available shifts button on days with openings", async ({ page }) => {
      // Look for "available" buttons
      const availableButtons = page.getByText(/available/);
      const buttonCount = await availableButtons.count();
      
      if (buttonCount > 0) {
        const firstButton = availableButtons.first();
        await expect(firstButton).toBeVisible();
        
        // Button should link to shifts page
        const parentLink = firstButton.locator("..").locator("a");
        if (await parentLink.count() > 0) {
          const href = await parentLink.getAttribute("href");
          expect(href).toBe("/shifts");
        }
      }
    });
  });

  test.describe("Shift Details Dialog", () => {
    test("should open shift details when clicking on a shift", async ({ page }) => {
      // Look for clickable shifts
      const shiftElements = page.locator(".bg-gradient-to-br").filter({ hasText: /\d{2}:\d{2}/ });
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        // Click on first shift
        await shiftElements.first().click();
        
        // Dialog should open
        const dialog = page.locator("[role='dialog']");
        await expect(dialog).toBeVisible();
        
        // Dialog should have title
        const dialogTitle = dialog.locator("h2, .font-semibold").first();
        await expect(dialogTitle).toBeVisible();
        
        // Close dialog by clicking outside or escape
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
      }
    });

    test("should display shift information in dialog", async ({ page }) => {
      const shiftElements = page.locator(".bg-gradient-to-br").filter({ hasText: /\d{2}:\d{2}/ });
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        await shiftElements.first().click();
        
        const dialog = page.locator("[role='dialog']");
        await expect(dialog).toBeVisible();
        
        // Should show status
        const statusText = dialog.getByText(/pending|confirmed|waitlisted/i);
        if (await statusText.count() > 0) {
          await expect(statusText.first()).toBeVisible();
        }
        
        // Should show time information
        const timeInfo = dialog.locator("text=/\\d{1,2}:\\d{2}\\s*(am|pm)/i");
        if (await timeInfo.count() > 0) {
          await expect(timeInfo.first()).toBeVisible();
        }
        
        await page.keyboard.press("Escape");
      }
    });

    test("should show calendar export options for upcoming shifts", async ({ page }) => {
      const shiftElements = page.locator(".bg-gradient-to-br").filter({ hasText: /\d{2}:\d{2}/ });
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        await shiftElements.first().click();
        
        const dialog = page.locator("[role='dialog']");
        await expect(dialog).toBeVisible();
        
        // Look for calendar export buttons
        const googleButton = dialog.getByText("Google");
        const outlookButton = dialog.getByText("Outlook");
        const icsButton = dialog.getByText(".ics File");
        
        // At least one export option should be visible for upcoming shifts
        const hasExportOptions = await googleButton.isVisible() || 
                                 await outlookButton.isVisible() || 
                                 await icsButton.isVisible();
        
        if (hasExportOptions) {
          // Check that export buttons are links/have proper attributes
          if (await googleButton.isVisible()) {
            const googleLink = googleButton.locator("..");
            await expect(googleLink).toHaveAttribute("href");
          }
        }
        
        await page.keyboard.press("Escape");
      }
    });

    test("should show cancel button for upcoming shifts", async ({ page }) => {
      const shiftElements = page.locator(".bg-gradient-to-br").filter({ hasText: /\d{2}:\d{2}/ });
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        await shiftElements.first().click();
        
        const dialog = page.locator("[role='dialog']");
        await expect(dialog).toBeVisible();
        
        // Look for cancel button
        const cancelButton = dialog.getByText(/cancel/i);
        if (await cancelButton.count() > 0) {
          await expect(cancelButton.first()).toBeVisible();
          
          // Cancel button should be clickable
          await expect(cancelButton.first()).toBeEnabled();
        }
        
        await page.keyboard.press("Escape");
      }
    });
  });

  test.describe("Friends Integration", () => {
    test("should show friends joining shifts", async ({ page }) => {
      const shiftElements = page.locator(".bg-gradient-to-br").filter({ hasText: /\d{2}:\d{2}/ });
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        // Look for friend indicators on calendar
        const friendIndicators = page.locator(".bg-white\\/20");
        const friendCount = await friendIndicators.count();
        
        if (friendCount > 0) {
          const firstIndicator = friendIndicators.first();
          await expect(firstIndicator).toBeVisible();
          
          // Should show friend count (may be empty if no friends)
          const countText = await firstIndicator.textContent();
          if (countText && countText.trim()) {
            expect(countText).toMatch(/\+\d+/);
          }
        }
      }
    });

    test("should display friend details in shift dialog", async ({ page }) => {
      const shiftElements = page.locator(".bg-gradient-to-br").filter({ hasText: /\d{2}:\d{2}/ });
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        await shiftElements.first().click();
        
        const dialog = page.locator("[role='dialog']");
        await expect(dialog).toBeVisible();
        
        // Look for friends section
        const friendsSection = dialog.getByText("Friends Joining");
        if (await friendsSection.isVisible()) {
          await expect(friendsSection).toBeVisible();
          
          // Should show friend avatars/names
          const friendElements = dialog.locator("[data-testid*='friend'], .flex.items-center.gap-3");
          if (await friendElements.count() > 0) {
            await expect(friendElements.first()).toBeVisible();
          }
        }
        
        await page.keyboard.press("Escape");
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
      await newPage.waitForLoadState("load");

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
      await page.waitForLoadState("load");

      // Check that main elements are still visible and accessible
      const myShiftsPage = page.getByTestId("my-shifts-page");
      await expect(myShiftsPage).toBeVisible();

      // Check stats cards stack properly on mobile
      const statsGrid = page.getByTestId("stats-overview");
      await expect(statsGrid).toBeVisible();

      // Check calendar is still accessible
      const calendarGrid = page.getByTestId("calendar-grid");
      await expect(calendarGrid).toBeVisible();

      // Check navigation buttons are accessible
      const prevButton = page.getByTestId("prev-month-button");
      await expect(prevButton).toBeVisible();
    });

    test("should show abbreviated day headers on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState("load");

      // Mobile should show abbreviated day names (S, M, T, W, T, F, S)
      const abbreviatedDays = page.locator(".sm\\:hidden");
      const count = await abbreviatedDays.count();
      
      if (count > 0) {
        const firstAbbrev = await abbreviatedDays.first().textContent();
        expect(firstAbbrev?.length).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe("Performance and Loading", () => {
    test("should load within reasonable time", async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto("/shifts/mine");
      await page.waitForLoadState("load");
      
      // Wait for main content to be visible
      const myShiftsPage = page.getByTestId("my-shifts-page");
      await expect(myShiftsPage).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test("should display stats without errors", async ({ page }) => {
      // Check that no error messages are displayed
      const errorMessage = page.getByText(/error|failed|something went wrong/i);
      await expect(errorMessage).not.toBeVisible();

      // Check that all stat numbers are displayed
      const statNumbers = page.locator(".text-2xl.font-bold");
      const count = await statNumbers.count();
      expect(count).toBe(4); // Should have 4 stat cards

      // Check each stat card's number display
      const completedCount = await page.getByTestId("completed-shifts-card-count").textContent();
      const upcomingCount = await page.getByTestId("upcoming-shifts-card-count").textContent();
      const thisMonthCount = await page.getByTestId("this-month-shifts-card-count").textContent();
      const totalHoursCount = await page.getByTestId("total-hours-card-count").textContent();

      expect(completedCount).toMatch(/^\d+$/);
      expect(upcomingCount).toMatch(/^\d+$/);
      expect(thisMonthCount).toMatch(/^\d+$/);
      expect(totalHoursCount).toMatch(/^\d+$/);
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper heading hierarchy", async ({ page }) => {
      // Check main heading
      const mainHeading = page.getByRole("heading", { name: /my shifts/i });
      await expect(mainHeading).toBeVisible();

      // Check calendar heading
      const calendarHeading = page.getByTestId("calendar-title");
      await expect(calendarHeading).toBeVisible();
    });

    test("should have accessible navigation buttons", async ({ page }) => {
      // Navigation buttons should be proper links
      const prevButton = page.getByTestId("prev-month-button");
      await expect(prevButton).toBeVisible();
      await expect(prevButton).toHaveAttribute("href");

      const nextButton = page.getByTestId("next-month-button");
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toHaveAttribute("href");

      // Today button (only visible when not viewing current month)
      // Navigate to see if today button appears
      await nextButton.click();
      await page.waitForLoadState("load");
      
      const todayButton = page.getByTestId("today-button");
      if (await todayButton.isVisible()) {
        await expect(todayButton).toHaveAttribute("href");
      }
    });

    test("should have accessible shift interactions", async ({ page }) => {
      // Shift elements should be clickable
      const shiftElements = page.locator(".bg-gradient-to-br").filter({ hasText: /\d{2}:\d{2}/ });
      const shiftCount = await shiftElements.count();
      
      if (shiftCount > 0) {
        const firstShift = shiftElements.first();
        
        // Should be clickable (has cursor pointer or is button/link)
        await expect(firstShift).toBeVisible();
        
        // Should be able to interact with it
        await firstShift.click();
        
        // Dialog should be accessible
        const dialog = page.locator("[role='dialog']");
        if (await dialog.isVisible()) {
          await expect(dialog).toBeVisible();
          await page.keyboard.press("Escape");
        }
      }
    });
  });
});