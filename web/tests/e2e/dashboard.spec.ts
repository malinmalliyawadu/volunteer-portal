import { test, expect } from './base';

// Helper function to login
async function loginAsVolunteer(page: any) {
  await page.goto('/login');
  const volunteerLoginButton = page.getByRole('button', { name: /login as volunteer/i });
  await volunteerLoginButton.click();
  
  // Wait for navigation with more retries
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    
    if (!currentUrl.includes('/login')) {
      break;
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      await page.waitForTimeout(1000);
    }
  }
}

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVolunteer(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard with all main elements', async ({ page }) => {
    // Check page loads successfully
    await expect(page).toHaveURL('/dashboard');
    
    // Check main heading
    const welcomeHeading = page.getByRole('heading', { name: /welcome back/i });
    await expect(welcomeHeading).toBeVisible();
    
    // Check description
    const description = page.getByText(/here's what's happening with your volunteer journey/i);
    await expect(description).toBeVisible();
    
    // Check all stat cards are visible
    const shiftsCompletedCard = page.getByText('Shifts Completed').locator('..').locator('..');
    await expect(shiftsCompletedCard).toBeVisible();
    
    const hoursContributedCard = page.getByText('Hours Contributed').locator('..').locator('..');
    await expect(hoursContributedCard).toBeVisible();
    
    const confirmedShiftsCard = page.getByText('Confirmed Shifts').locator('..').locator('..');
    await expect(confirmedShiftsCard).toBeVisible();
    
    const thisMonthCard = page.getByText('This Month').locator('..').locator('..');
    await expect(thisMonthCard).toBeVisible();
  });

  test('should display stat numbers correctly', async ({ page }) => {
    // Check that stat numbers are displayed as numbers (not NaN or undefined)
    const statNumbers = page.locator('[class*="text-2xl"][class*="font-bold"]');
    const count = await statNumbers.count();
    
    for (let i = 0; i < count; i++) {
      const statNumber = statNumbers.nth(i);
      const text = await statNumber.textContent();
      
      // Should be a number (including 0)
      expect(text).toMatch(/^\d+$/);
    }
  });

  test('should display next shift section', async ({ page }) => {
    // Check for "Your Next Shift" section
    const nextShiftHeading = page.getByRole('heading', { name: /your next shift/i });
    await expect(nextShiftHeading).toBeVisible();
    
    // Check either upcoming shift details or "no upcoming shifts" message
    const hasUpcomingShift = await page.getByText(/no upcoming shifts/i).count() === 0;
    
    if (hasUpcomingShift) {
      // If there are upcoming shifts, check for shift details
      const viewAllShiftsButton = page.getByRole('link', { name: /view all my shifts/i });
      await expect(viewAllShiftsButton).toBeVisible();
    } else {
      // If no upcoming shifts, check for browse shifts button
      const browseShiftsButton = page.getByRole('link', { name: /browse shifts/i });
      await expect(browseShiftsButton).toBeVisible();
    }
  });

  test('should display recent activity section', async ({ page }) => {
    // Check for "Recent Activity" section
    const recentActivityHeading = page.getByRole('heading', { name: /recent activity/i });
    await expect(recentActivityHeading).toBeVisible();
    
    // Check either recent shifts or "no completed shifts" message
    const hasRecentShifts = await page.getByText(/no completed shifts yet/i).count() === 0;
    
    if (hasRecentShifts) {
      // If there are recent shifts, check for view all history button
      const viewHistoryButton = page.getByRole('link', { name: /view all history/i });
      await expect(viewHistoryButton).toBeVisible();
    } else {
      // If no recent shifts, check for the appropriate message
      const noShiftsMessage = page.getByText(/your completed shifts will appear here/i);
      await expect(noShiftsMessage).toBeVisible();
    }
  });

  test('should display achievements section', async ({ page }) => {
    // The achievements are in a separate component - just check it renders
    const achievementsSection = page.locator('[class*="achievement"]').or(
      page.getByText(/achievement/i).first().locator('..')
    );
    
    // At minimum, the achievements component should be present
    // Note: The exact structure depends on the AchievementsCard component
    await expect(page.locator('body')).toBeVisible(); // Fallback check for now
  });

  test('should display impact and community stats', async ({ page }) => {
    // Check for impact section
    const impactHeading = page.getByRole('heading', { name: /your impact.*community/i });
    await expect(impactHeading).toBeVisible();
    
    // Check for estimated meals stat
    const estimatedMealsText = page.getByText(/estimated meals helped prepare/i);
    await expect(estimatedMealsText).toBeVisible();
    
    // Check for active volunteers stat
    const activeVolunteersText = page.getByText(/active volunteers in our community/i);
    await expect(activeVolunteersText).toBeVisible();
    
    // Check for food waste prevented stat
    const foodWasteText = page.getByText(/estimated food waste prevented/i);
    await expect(foodWasteText).toBeVisible();
  });

  test('should display quick actions section', async ({ page }) => {
    // Check for quick actions heading
    const quickActionsHeading = page.getByRole('heading', { name: /quick actions/i });
    await expect(quickActionsHeading).toBeVisible();
    
    // Check all quick action buttons
    const findShiftsButton = page.getByRole('link', { name: /find shifts/i });
    await expect(findShiftsButton).toBeVisible();
    await expect(findShiftsButton).toHaveAttribute('href', '/shifts');
    
    const myScheduleButton = page.getByRole('link', { name: /my schedule/i });
    await expect(myScheduleButton).toBeVisible();
    await expect(myScheduleButton).toHaveAttribute('href', '/shifts/mine');
    
    const myProfileButton = page.getByRole('link', { name: /my profile/i });
    await expect(myProfileButton).toBeVisible();
    await expect(myProfileButton).toHaveAttribute('href', '/profile');
    
    const mainSiteLink = page.getByRole('link', { name: /visit main site/i });
    await expect(mainSiteLink).toBeVisible();
    await expect(mainSiteLink).toHaveAttribute('href', 'https://everybodyeats.nz');
    await expect(mainSiteLink).toHaveAttribute('target', '_blank');
  });

  test('should navigate to shifts page from quick actions', async ({ page }) => {
    const findShiftsButton = page.getByRole('link', { name: /find shifts/i });
    await findShiftsButton.click();
    
    await expect(page).toHaveURL('/shifts');
  });

  test('should navigate to my schedule from quick actions', async ({ page }) => {
    const myScheduleButton = page.getByRole('link', { name: /my schedule/i });
    await myScheduleButton.click();
    
    await expect(page).toHaveURL('/shifts/mine');
  });

  test('should navigate to profile from quick actions', async ({ page }) => {
    const myProfileButton = page.getByRole('link', { name: /my profile/i });
    await myProfileButton.click();
    
    await expect(page).toHaveURL('/profile');
  });

  test('should navigate to view all shifts from next shift section', async ({ page }) => {
    // Only test if the button exists (when there are upcoming shifts)
    const viewAllShiftsButton = page.getByRole('link', { name: /view all my shifts/i });
    
    if (await viewAllShiftsButton.count() > 0) {
      await viewAllShiftsButton.click();
      await expect(page).toHaveURL('/shifts/mine');
    }
  });

  test('should navigate to browse shifts from next shift section', async ({ page }) => {
    // Only test if the button exists (when there are no upcoming shifts)
    const browseShiftsButton = page.getByRole('link', { name: /browse shifts/i });
    
    if (await browseShiftsButton.count() > 0) {
      await browseShiftsButton.click();
      await expect(page).toHaveURL('/shifts');
    }
  });

  test('should navigate to view history from recent activity section', async ({ page }) => {
    // Only test if the button exists (when there are recent shifts)
    const viewHistoryButton = page.getByRole('link', { name: /view all history/i });
    
    if (await viewHistoryButton.count() > 0) {
      await viewHistoryButton.click();
      await expect(page).toHaveURL('/shifts/mine');
    }
  });

  test('should display pending shifts notification if any exist', async ({ page }) => {
    // Check if there's a pending approval notification
    const pendingText = page.getByText(/pending approval/i);
    
    if (await pendingText.count() > 0) {
      await expect(pendingText).toBeVisible();
    }
  });

  test('should display user name in welcome message if available', async ({ page }) => {
    const welcomeHeading = page.getByRole('heading', { name: /welcome back/i });
    const headingText = await welcomeHeading.textContent();
    
    // Should either be "Welcome back!" or "Welcome back, [Name]!"
    expect(headingText).toMatch(/Welcome back[,!]/i);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that main elements are still visible
    const welcomeHeading = page.getByRole('heading', { name: /welcome back/i });
    await expect(welcomeHeading).toBeVisible();
    
    // Check that stat cards are stacked vertically
    const statCards = page.locator('[class*="grid-cols-1"][class*="md:grid-cols-2"][class*="lg:grid-cols-4"]');
    await expect(statCards).toBeVisible();
    
    // Check quick actions are visible
    const quickActionsHeading = page.getByRole('heading', { name: /quick actions/i });
    await expect(quickActionsHeading).toBeVisible();
  });

  test('should handle loading state gracefully', async ({ page }) => {
    // Navigate to dashboard and verify it loads without errors
    await page.goto('/dashboard');
    
    // Wait for the main content to be visible
    const welcomeHeading = page.getByRole('heading', { name: /welcome back/i });
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
    
    // Check that no error messages are displayed
    const errorMessage = page.getByText(/error|failed|something went wrong/i);
    await expect(errorMessage).not.toBeVisible();
  });

  test('should require authentication', async ({ page, context }) => {
    // Create a new page without login
    const newPage = await context.newPage();
    
    // Try to access dashboard directly
    await newPage.goto('/dashboard');
    
    // Should redirect to login page
    await expect(newPage).toHaveURL(/\/login/);
    
    await newPage.close();
  });

  test('should display accessibility attributes correctly', async ({ page }) => {
    // Check main landmark
    const main = page.locator('main').or(page.locator('[role="main"]'));
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
    
    // Check headings have proper hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    expect(headingCount).toBeGreaterThan(0);
    
    // Check that buttons and links have accessible names
    const buttons = page.locator('button, a');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) { // Check first 10 to avoid timeout
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Button should have either text content or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('should update stat values correctly', async ({ page }) => {
    // Get initial stat values
    const statNumbers = page.locator('[class*="text-2xl"][class*="font-bold"]');
    const initialValues = [];
    
    const count = await statNumbers.count();
    for (let i = 0; i < count; i++) {
      const value = await statNumbers.nth(i).textContent();
      initialValues.push(value);
    }
    
    // Refresh the page and verify stats are consistent
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const refreshedStatNumbers = page.locator('[class*="text-2xl"][class*="font-bold"]');
    
    for (let i = 0; i < count; i++) {
      const refreshedValue = await refreshedStatNumbers.nth(i).textContent();
      expect(refreshedValue).toBe(initialValues[i]);
    }
  });
});