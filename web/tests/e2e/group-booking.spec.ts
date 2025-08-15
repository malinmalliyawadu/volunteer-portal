import { test, expect } from "@playwright/test";

test.describe("Group Booking System", () => {
  test.beforeEach(async ({ page }) => {
    // Login as a regular volunteer
    await page.goto("/login");
    await page.fill('input[name="email"]', "volunteer@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should create a group booking with member assignments", async ({ page }) => {
    // Navigate to shifts page
    await page.goto("/shifts");
    
    // Wait for shifts to load
    await page.waitForSelector('[data-testid="shift-card"]', { timeout: 10000 });
    
    // Click on a date with available shifts
    const dateButton = page.locator('[data-testid="date-button"]').first();
    await dateButton.click();
    
    // Wait for the group booking button to appear
    await page.waitForSelector('[data-testid="group-booking-button"]');
    
    // Click the group booking button
    await page.click('[data-testid="group-booking-button"]');
    
    // Wait for the dialog to open
    await page.waitForSelector('[data-testid="group-booking-dialog"]');
    
    // Fill in group details
    await page.fill('[data-testid="group-name-input"]', "Test Family Group");
    await page.fill('[data-testid="group-description-input"]', "Testing group booking functionality");
    
    // Select shifts
    const shiftCheckboxes = page.locator('[data-testid^="shift-option-"] input[type="checkbox"]');
    const shiftCount = await shiftCheckboxes.count();
    
    if (shiftCount > 0) {
      // Select first two shifts if available
      await shiftCheckboxes.first().check();
      if (shiftCount > 1) {
        await shiftCheckboxes.nth(1).check();
      }
    }
    
    // Add member emails
    await page.fill('[data-testid="new-email-input"]', "member1@example.com");
    await page.click('[data-testid="add-email-button"]');
    
    await page.fill('[data-testid="new-email-input"]', "member2@example.com");
    await page.click('[data-testid="add-email-button"]');
    
    // Verify member assignment matrix appears
    await expect(page.locator('[data-testid="member-assignment-section"]')).toBeVisible();
    
    // Verify members are assigned to shifts by default
    const assignmentCheckboxes = page.locator('[data-testid="member-assignment-section"] input[type="checkbox"]');
    const assignmentCount = await assignmentCheckboxes.count();
    
    // All checkboxes should be checked by default
    for (let i = 0; i < assignmentCount; i++) {
      await expect(assignmentCheckboxes.nth(i)).toBeChecked();
    }
    
    // Create the group booking
    await page.click('[data-testid="group-booking-create-button"]');
    
    // Wait for success (page refresh)
    await page.waitForLoadState("networkidle");
    
    // Verify we're back on the shifts page
    await expect(page).toHaveURL(/\/shifts/);
  });

  test("should display group bookings in My Shifts page", async ({ page }) => {
    // Navigate to My Shifts page
    await page.goto("/shifts/mine");
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="my-shifts-page"]');
    
    // Check if group bookings section exists (only shows if user has group bookings)
    const groupSection = page.locator('[data-testid="group-bookings-section"]');
    const sectionExists = await groupSection.isVisible().catch(() => false);
    
    if (sectionExists) {
      // Verify group bookings section structure
      await expect(groupSection.locator('[data-testid="group-bookings-title"]')).toBeVisible();
      await expect(groupSection.locator('[data-testid="group-bookings-count"]')).toBeVisible();
      
      // Check for group booking cards
      const groupCards = groupSection.locator('[data-testid^="group-booking-"]');
      const cardCount = await groupCards.count();
      
      if (cardCount > 0) {
        const firstCard = groupCards.first();
        
        // Verify card contains expected elements
        await expect(firstCard.locator('[data-testid="group-name"]')).toBeVisible();
        
        // Check for member information
        const memberSection = firstCard.locator('text=/Group Members/');
        if (await memberSection.isVisible()) {
          // Verify member status indicators
          const registeredMembers = firstCard.locator('text=/Registered Members/');
          const pendingInvites = firstCard.locator('text=/Pending Invitations/');
          
          // At least one of these should be visible
          const hasMembers = await registeredMembers.isVisible().catch(() => false) || 
                            await pendingInvites.isVisible().catch(() => false);
          expect(hasMembers).toBeTruthy();
        }
      }
    }
  });

  test("should show registration status on group detail page", async ({ page }) => {
    // First, we need to create a group booking or use an existing one
    // Navigate to My Shifts to find a group booking
    await page.goto("/shifts/mine");
    
    const groupSection = page.locator('[data-testid="group-bookings-section"]');
    const sectionExists = await groupSection.isVisible().catch(() => false);
    
    if (sectionExists) {
      // Click on Manage Group button for the first group
      const manageButton = groupSection.locator('text=/Manage Group/').first();
      if (await manageButton.isVisible()) {
        await manageButton.click();
        
        // Wait for group detail page to load
        await page.waitForSelector('[data-testid="group-booking-detail-page"]');
        
        // Verify page shows member registration status
        const readyMembers = page.locator('text=/Ready Members/');
        const needingAction = page.locator('text=/Members Needing Action/');
        const pendingInvites = page.locator('text=/Pending Invitations/');
        
        // At least one section should be visible
        const hasSections = await readyMembers.isVisible().catch(() => false) ||
                           await needingAction.isVisible().catch(() => false) ||
                           await pendingInvites.isVisible().catch(() => false);
        
        expect(hasSections).toBeTruthy();
        
        // Check for registration status badges
        const completeProfile = page.locator('text=/Profile Complete/');
        const incompleteProfile = page.locator('text=/Incomplete/');
        const awaitingResponse = page.locator('text=/Awaiting Response/');
        
        // Verify at least one status indicator is present
        const hasStatus = await completeProfile.isVisible().catch(() => false) ||
                         await incompleteProfile.isVisible().catch(() => false) ||
                         await awaitingResponse.isVisible().catch(() => false);
        
        expect(hasStatus).toBeTruthy();
      }
    }
  });
});

test.describe("Group Booking Admin Features", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");
  });

  test("should prevent approval of groups with incomplete member profiles", async ({ page }) => {
    // Navigate to admin shifts page
    await page.goto("/admin/shifts");
    
    // Wait for shifts to load
    await page.waitForSelector('[data-testid="admin-shifts-page"]', { timeout: 10000 });
    
    // Look for group bookings with pending status
    const groupBookings = page.locator('[data-testid^="group-booking-admin-"]');
    const groupCount = await groupBookings.count();
    
    if (groupCount > 0) {
      // Find a group with incomplete members (if any)
      for (let i = 0; i < groupCount; i++) {
        const group = groupBookings.nth(i);
        const warningText = group.locator('text=/Some members have incomplete profiles/');
        
        if (await warningText.isVisible().catch(() => false)) {
          // Try to click the approve button
          const approveButton = group.locator('[data-testid^="approve-group-"]');
          
          // Button should be disabled
          await expect(approveButton).toBeDisabled();
          
          // Verify warning message is displayed
          await expect(warningText).toBeVisible();
          
          break;
        }
      }
    }
  });

  test("should allow approval of groups with complete member profiles", async ({ page }) => {
    // Navigate to admin shifts page
    await page.goto("/admin/shifts");
    
    // Wait for shifts to load
    await page.waitForSelector('[data-testid="admin-shifts-page"]', { timeout: 10000 });
    
    // Look for group bookings with pending status
    const groupBookings = page.locator('[data-testid^="group-booking-admin-"]');
    const groupCount = await groupBookings.count();
    
    if (groupCount > 0) {
      // Find a group without incomplete member warning
      for (let i = 0; i < groupCount; i++) {
        const group = groupBookings.nth(i);
        const warningText = group.locator('text=/Some members have incomplete profiles/');
        const approveButton = group.locator('[data-testid^="approve-group-"]');
        
        // If no warning and button exists
        if (!(await warningText.isVisible().catch(() => false)) && 
            await approveButton.isVisible()) {
          
          // Button should be enabled
          await expect(approveButton).toBeEnabled();
          
          // Click approve
          await approveButton.click();
          
          // Wait for status update
          await page.waitForLoadState("networkidle");
          
          // Verify the group status changed
          const statusBadge = group.locator('text=/confirmed/i');
          await expect(statusBadge).toBeVisible({ timeout: 5000 });
          
          break;
        }
      }
    }
  });
});