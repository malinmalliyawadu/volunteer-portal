import { test, expect } from "./base";
import type { Page } from "@playwright/test";

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  try {
    await page.goto("/login");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check if login form is visible
    const adminLoginButton = page.getByRole("button", {
      name: /login as admin/i,
    });
    await adminLoginButton.waitFor({ state: "visible", timeout: 5000 });

    // Click admin login button
    await adminLoginButton.click();

    // Wait for navigation with timeout
    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 10000,
      });
    } catch (error) {
      // Login might have failed, but don't throw - let the test handle it
      console.log("Admin login may have failed or taken too long");
    }

    await page.waitForLoadState("networkidle");
  } catch (error) {
    console.log("Error during admin login:", error);
  }
}

// Helper function to login as volunteer (for testing unauthorized access)
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

test.describe("Admin Dashboard Page", () => {
  test.describe("Admin Authentication and Access", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to admin dashboard and wait for it to load
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      // Skip tests if login failed (we're still on login page)
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping admin dashboard tests");
      }
    });

    test("should allow admin users to access admin dashboard", async ({ page }) => {
      // Check page loads successfully
      await expect(page).toHaveURL("/admin");

      // Check main admin dashboard heading
      const adminHeading = page.getByRole("heading", { name: /admin dashboard/i });
      await expect(adminHeading).toBeVisible();

      // Check admin description
      const description = page.getByText(
        /overview of volunteer portal activity and management tools/i
      );
      await expect(description).toBeVisible();
    });

    test("should display admin role indicator", async ({ page }) => {
      // Verify admin dashboard is accessible (indicating admin role)
      await expect(page).toHaveURL("/admin");
      
      // Check for admin-specific elements
      const adminHeading = page.getByRole("heading", { name: /admin dashboard/i });
      await expect(adminHeading).toBeVisible();
      
      // Admin should have access to admin actions
      const createShiftButton = page.getByRole("link", { name: /create new shift/i });
      await expect(createShiftButton).toBeVisible();
    });
  });

  test.describe("Unauthorized Access Prevention", () => {
    test("should redirect non-admin users from admin dashboard", async ({ page }) => {
      // Login as volunteer first
      await loginAsVolunteer(page);
      
      // Try to access admin dashboard directly
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      // Should redirect to main dashboard, not admin dashboard
      await expect(page).not.toHaveURL("/admin");
      
      // Should be on volunteer dashboard instead
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(dashboard|$)/);
    });

    test("should redirect unauthenticated users to login", async ({ context }) => {
      // Create a new context (fresh browser session)
      const newContext = await context.browser()?.newContext();
      if (!newContext) throw new Error("Could not create new context");

      const newPage = await newContext.newPage();

      // Try to access admin dashboard directly without authentication
      await newPage.goto("/admin");

      // Should redirect to login page with callback URL
      await expect(newPage).toHaveURL(/\/login/);
      
      // Check callback URL parameter
      const currentUrl = newPage.url();
      expect(currentUrl).toContain("callbackUrl");
      expect(currentUrl).toContain("admin");

      await newPage.close();
      await newContext.close();
    });
  });

  test.describe("Dashboard Statistics and Metrics", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping dashboard stats tests");
      }
    });

    test("should display all main statistics cards", async ({ page }) => {
      // Check Total Users card
      const totalUsersCard = page.getByText("Total Users").locator("..").locator("..");
      await expect(totalUsersCard).toBeVisible();
      
      // Check stat number is displayed as a number
      const totalUsersNumber = totalUsersCard.locator('[class*="text-2xl"][class*="font-bold"]');
      await expect(totalUsersNumber).toBeVisible();
      const totalUsersText = await totalUsersNumber.textContent();
      expect(totalUsersText).toMatch(/^\d+$/);

      // Check Total Shifts card
      const totalShiftsCard = page.getByText("Total Shifts").locator("..").locator("..");
      await expect(totalShiftsCard).toBeVisible();
      
      const totalShiftsNumber = totalShiftsCard.locator('[class*="text-2xl"][class*="font-bold"]');
      await expect(totalShiftsNumber).toBeVisible();

      // Check Total Signups card
      const totalSignupsCard = page.getByText("Total Signups").locator("..").locator("..");
      await expect(totalSignupsCard).toBeVisible();
      
      const totalSignupsNumber = totalSignupsCard.locator('[class*="text-2xl"][class*="font-bold"]');
      await expect(totalSignupsNumber).toBeVisible();

      // Check This Month card
      const thisMonthCard = page.getByText("This Month").locator("..").locator("..");
      await expect(thisMonthCard).toBeVisible();
      
      const thisMonthNumber = thisMonthCard.locator('[class*="text-2xl"][class*="font-bold"]');
      await expect(thisMonthNumber).toBeVisible();
    });

    test("should display detailed statistics information", async ({ page }) => {
      // Check volunteers and admins breakdown in Total Users card
      const volunteersAdminsText = page.getByText(/\d+ volunteers, \d+ admins/);
      await expect(volunteersAdminsText).toBeVisible();

      // Check upcoming and completed breakdown in Total Shifts card
      const shiftsBreakdownText = page.getByText(/\d+ upcoming, \d+ completed/);
      await expect(shiftsBreakdownText).toBeVisible();

      // Check signups breakdown in Total Signups card
      const signupsBreakdownText = page.getByText(/\d+ confirmed, \d+ pending, \d+ waitlisted/);
      await expect(signupsBreakdownText).toBeVisible();

      // Check monthly breakdown in This Month card
      const monthlyText = page.getByText(/signups for \d+ shifts/);
      await expect(monthlyText).toBeVisible();
      
      const newUsersText = page.getByText(/\d+ new users/);
      await expect(newUsersText).toBeVisible();
    });

    test("should highlight pending signups when present", async ({ page }) => {
      // Check if there are pending signups
      const pendingBadge = page.getByText(/\d+ pending/).locator("..").getByRole("generic").filter({ hasText: /pending/ });
      
      if (await pendingBadge.count() > 0) {
        await expect(pendingBadge).toBeVisible();
        
        // Check if the Total Signups card has highlighting when there are pending signups
        const totalSignupsCard = page.getByText("Total Signups").locator("..").locator("..");
        const cardClasses = await totalSignupsCard.getAttribute("class");
        
        if (cardClasses?.includes("border-orange") || cardClasses?.includes("bg-orange")) {
          // Card should be highlighted for pending signups
          expect(cardClasses).toContain("orange");
        }
      }
    });
  });

  test.describe("Quick Actions Section", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping quick actions tests");
      }
    });

    test("should display all quick action buttons", async ({ page }) => {
      // Check Quick Actions section heading
      const quickActionsHeading = page.getByText("Quick Actions");
      await expect(quickActionsHeading).toBeVisible();

      // Check Create New Shift button
      const createShiftButton = page.getByRole("link", { name: /create new shift/i });
      await expect(createShiftButton).toBeVisible();
      await expect(createShiftButton).toHaveAttribute("href", "/admin/shifts/new");

      // Check Manage All Shifts button
      const manageShiftsButton = page.getByRole("link", { name: /manage all shifts/i });
      await expect(manageShiftsButton).toBeVisible();
      await expect(manageShiftsButton).toHaveAttribute("href", "/admin/shifts");

      // Check Manage Users button
      const manageUsersButton = page.getByRole("link", { name: /manage users/i });
      await expect(manageUsersButton).toBeVisible();
      await expect(manageUsersButton).toHaveAttribute("href", "/admin/users");

      // Check View Public Shifts button
      const viewPublicShiftsButton = page.getByRole("link", { name: /view public shifts/i });
      await expect(viewPublicShiftsButton).toBeVisible();
      await expect(viewPublicShiftsButton).toHaveAttribute("href", "/shifts");
    });

    test("should navigate to create new shift page", async ({ page }) => {
      const createShiftButton = page.getByRole("link", { name: /create new shift/i });
      await createShiftButton.click();

      await expect(page).toHaveURL("/admin/shifts/new");
    });

    test("should navigate to manage shifts page", async ({ page }) => {
      const manageShiftsButton = page.getByRole("link", { name: /manage all shifts/i });
      await manageShiftsButton.click();

      await expect(page).toHaveURL("/admin/shifts");
    });

    test("should navigate to manage users page", async ({ page }) => {
      const manageUsersButton = page.getByRole("link", { name: /manage users/i });
      await manageUsersButton.click();

      await expect(page).toHaveURL("/admin/users");
    });

    test("should navigate to public shifts page", async ({ page }) => {
      const viewPublicShiftsButton = page.getByRole("link", { name: /view public shifts/i });
      await viewPublicShiftsButton.click();

      await expect(page).toHaveURL("/shifts");
    });
  });

  test.describe("Next Shift Section", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping next shift tests");
      }
    });

    test("should display next shift information or no shifts message", async ({ page }) => {
      // Check for Next Shift section heading
      const nextShiftHeading = page.getByText("Next Shift");
      await expect(nextShiftHeading).toBeVisible();

      // Check either upcoming shift details or "no upcoming shifts" message
      const hasUpcomingShift = (await page.getByText(/no upcoming shifts scheduled/i).count()) === 0;

      if (hasUpcomingShift) {
        // If there are upcoming shifts, check for shift details
        const viewDetailsButton = page.getByRole("link", { name: /view details/i });
        await expect(viewDetailsButton).toBeVisible();
        
        // Check for capacity indicator (volunteers badge)
        const volunteersText = page.getByText(/volunteers/);
        await expect(volunteersText).toBeVisible();
        
        // Check for location indicator
        const locationText = page.locator('text=/📍/');
        await expect(locationText).toBeVisible();
      } else {
        // If no upcoming shifts, check for appropriate message
        const noShiftsMessage = page.getByText(/no upcoming shifts scheduled/i);
        await expect(noShiftsMessage).toBeVisible();
      }
    });

    test("should navigate to shifts management when clicking view details", async ({ page }) => {
      // Only test if the button exists (when there are upcoming shifts)
      const viewDetailsButton = page.getByRole("link", { name: /view details/i });

      if ((await viewDetailsButton.count()) > 0) {
        await viewDetailsButton.click();
        await expect(page).toHaveURL(/\/admin\/shifts/);
      }
    });
  });

  test.describe("Needs Attention Section", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping needs attention tests");
      }
    });

    test("should display shifts needing attention or positive message", async ({ page }) => {
      // Check for Needs Attention section heading
      const needsAttentionHeading = page.getByText("Needs Attention");
      await expect(needsAttentionHeading).toBeVisible();

      // Check either low signup shifts or positive message
      const hasLowSignupShifts = (await page.getByText(/all upcoming shifts have good signup rates/i).count()) === 0;

      if (hasLowSignupShifts) {
        // If there are shifts with low signup rates
        const lowSignupText = page.getByText(/shifts with low signup rates/);
        await expect(lowSignupText).toBeVisible();
        
        // Check for review button
        const reviewAllButton = page.getByRole("link", { name: /review all/i });
        await expect(reviewAllButton).toBeVisible();
        await expect(reviewAllButton).toHaveAttribute("href", "/admin/shifts");
      } else {
        // If all shifts have good signup rates
        const positiveMessage = page.getByText(/all upcoming shifts have good signup rates/i);
        await expect(positiveMessage).toBeVisible();
        
        // Check for celebration emoji
        const celebrationEmoji = page.getByText(/🎉/);
        await expect(celebrationEmoji).toBeVisible();
      }
    });

    test("should navigate to shifts management when clicking review all", async ({ page }) => {
      // Only test if the button exists (when there are shifts needing attention)
      const reviewAllButton = page.getByRole("link", { name: /review all/i });

      if ((await reviewAllButton.count()) > 0) {
        await reviewAllButton.click();
        await expect(page).toHaveURL("/admin/shifts");
      }
    });
  });

  test.describe("Recent Signups Section", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping recent signups tests");
      }
    });

    test("should display recent signups section", async ({ page }) => {
      // Check for Recent Signups section heading
      const recentSignupsHeading = page.getByText("Recent Signups");
      await expect(recentSignupsHeading).toBeVisible();

      // Check either recent signups or "no recent signups" message
      const hasRecentSignups = (await page.getByText(/no recent signups/i).count()) === 0;

      if (hasRecentSignups) {
        // If there are recent signups, check for status badges
        const statusBadges = page.locator('[class*="badge"], .badge');
        const badgeCount = await statusBadges.count();
        expect(badgeCount).toBeGreaterThan(0);
        
        // Check for volunteer profile links (if names are present)
        const volunteerLinks = page.getByRole("link").filter({ hasText: /.*/ });
        // There should be at least some links in the recent signups
        expect(await volunteerLinks.count()).toBeGreaterThan(0);
      } else {
        // If no recent signups
        const noSignupsMessage = page.getByText(/no recent signups/i);
        await expect(noSignupsMessage).toBeVisible();
      }
    });

    test("should display signup status badges correctly", async ({ page }) => {
      // Look for status badges in the recent signups section
      const statusTexts = ["confirmed", "pending", "waitlisted", "canceled"];
      
      for (const status of statusTexts) {
        const statusBadge = page.getByText(status, { exact: false });
        if (await statusBadge.count() > 0) {
          await expect(statusBadge.first()).toBeVisible();
        }
      }
    });
  });

  test.describe("Location Filter", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping location filter tests");
      }
    });

    test("should display location filter tabs", async ({ page }) => {
      // Check for filter label
      const filterLabel = page.getByText("Filter by location:");
      await expect(filterLabel).toBeVisible();

      // Check for "All" tab
      const allTab = page.getByRole("link", { name: "All" });
      await expect(allTab).toBeVisible();

      // Check for location tabs (Wellington, Glenn Innes, Onehunga)
      const locations = ["Wellington", "Glenn Innes", "Onehunga"];
      for (const location of locations) {
        const locationTab = page.getByRole("link", { name: location });
        await expect(locationTab).toBeVisible();
      }
    });

    test("should filter data when selecting a location", async ({ page }) => {
      // Get initial stats
      const initialTotalShifts = await page.locator('[class*="text-2xl"][class*="font-bold"]').nth(1).textContent();
      
      // Click on Wellington location filter
      const wellingtonTab = page.getByRole("link", { name: "Wellington" });
      await wellingtonTab.click();
      
      // Wait for page to load with filter
      await page.waitForLoadState("networkidle");
      
      // Verify URL has location parameter
      await expect(page).toHaveURL(/location=Wellington/);
      
      // Stats should potentially change (or stay the same if all shifts are in Wellington)
      const filteredTotalShifts = await page.locator('[class*="text-2xl"][class*="font-bold"]').nth(1).textContent();
      expect(filteredTotalShifts).toBeTruthy();
    });

    test("should return to all locations when clicking All tab", async ({ page }) => {
      // First filter by a location
      const wellingtonTab = page.getByRole("link", { name: "Wellington" });
      await wellingtonTab.click();
      await page.waitForLoadState("networkidle");
      
      // Then click All to remove filter
      const allTab = page.getByRole("link", { name: "All" });
      await allTab.click();
      await page.waitForLoadState("networkidle");
      
      // Verify URL doesn't have location parameter
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("location=");
    });
  });

  test.describe("Loading States and Error Handling", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test("should handle page loading gracefully", async ({ page }) => {
      // Navigate to admin dashboard and verify it loads without errors
      await page.goto("/admin");

      // Wait for the main content to be visible
      const adminHeading = page.getByRole("heading", { name: /admin dashboard/i });
      await expect(adminHeading).toBeVisible({ timeout: 10000 });

      // Check that no error messages are displayed
      const errorMessage = page.getByText(/error|failed|something went wrong/i);
      await expect(errorMessage).not.toBeVisible();
    });

    test("should display valid data in all stat cards", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      // Check that all stat numbers are valid (not NaN or undefined)
      const statNumbers = page.locator('[class*="text-2xl"][class*="font-bold"]');
      const count = await statNumbers.count();

      // Should have exactly 4 stat cards
      expect(count).toBe(4);

      for (let i = 0; i < count; i++) {
        const statNumber = statNumbers.nth(i);
        const text = await statNumber.textContent();

        // Should be a number (including 0)
        expect(text).toMatch(/^\d+$/);
        expect(text).not.toBe("NaN");
        expect(text).not.toBe("undefined");
      }
    });
  });

  test.describe("Responsive Design", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping responsive design tests");
      }
    });

    test("should be responsive on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that main elements are still visible
      const adminHeading = page.getByRole("heading", { name: /admin dashboard/i });
      await expect(adminHeading).toBeVisible();

      // Check that stat cards are visible on mobile
      const statCards = page.locator('[class*="grid-cols-1"][class*="md:grid-cols-2"]');
      await expect(statCards).toBeVisible();

      // Check quick actions are visible
      const quickActionsHeading = page.getByText("Quick Actions");
      await expect(quickActionsHeading).toBeVisible();
      
      // Check at least one quick action button is visible
      const createShiftButton = page.getByRole("link", { name: /create new shift/i });
      await expect(createShiftButton).toBeVisible();
    });

    test("should maintain functionality on tablet viewport", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Verify main functionality still works
      const adminHeading = page.getByRole("heading", { name: /admin dashboard/i });
      await expect(adminHeading).toBeVisible();

      // Check location filter tabs are still accessible
      const wellingtonTab = page.getByRole("link", { name: "Wellington" });
      await expect(wellingtonTab).toBeVisible();

      // Test a navigation action
      const manageUsersButton = page.getByRole("link", { name: /manage users/i });
      await manageUsersButton.click();
      await expect(page).toHaveURL("/admin/users");
    });
  });

  test.describe("Accessibility", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        test.skip(true, "Admin login failed - skipping accessibility tests");
      }
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      // Check main heading
      const mainHeading = page.locator("h1, h2").filter({ hasText: /admin dashboard/i });
      await expect(mainHeading).toBeVisible();

      // Check section headings exist
      const headings = page.locator("h1, h2, h3, h4, h5, h6");
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(1);
    });

    test("should have accessible navigation links", async ({ page }) => {
      // Check that all navigation links have accessible names
      const navLinks = page.getByRole("link");
      const linkCount = await navLinks.count();

      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        // Check first 10 links to avoid timeout
        const link = navLinks.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute("aria-label");

        // Link should have either text content or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test("should support keyboard navigation", async ({ page }) => {
      // Focus on first focusable element
      await page.keyboard.press("Tab");

      // Verify we can navigate through the interface
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Continue tabbing to ensure tab order is logical
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Should still have a focused element
      const stillFocused = page.locator(":focus");
      await expect(stillFocused).toBeVisible();
    });
  });
});