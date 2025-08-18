import { test, expect } from '@playwright/test';

test.describe('Friends System', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the application homepage
    await page.goto('/');
  });

  test('should navigate to friends page when logged in as volunteer', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for login to complete and navigate to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Click on Friends link in navigation
    await page.click('a[href="/friends"]');
    
    // Verify we're on the friends page
    await expect(page).toHaveURL('/friends');
    await expect(page.locator('h1')).toContainText('My Friends');
  });

  test('should show empty state when user has no friends', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to friends page
    await page.goto('/friends');

    // Check for empty state
    await expect(page.locator('[data-testid="empty-friends-state"]')).toBeVisible();
    await expect(page.locator('text=No friends yet')).toBeVisible();
    await expect(page.locator('text=Add Your First Friend')).toBeVisible();
  });

  test('should open send friend request dialog', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to friends page
    await page.goto('/friends');

    // Click "Add Friend" button
    await page.click('text=Add Friend');

    // Verify dialog is open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Send Friend Request')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should validate email input in friend request dialog', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to friends page
    await page.goto('/friends');

    // Open friend request dialog
    await page.click('text=Add Friend');

    // Try to submit with invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('text=Send Request');

    // Should show validation error (HTML5 validation)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('validity', /invalid/i);
  });

  test('should send friend request with valid email', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to friends page
    await page.goto('/friends');

    // Open friend request dialog
    await page.click('text=Add Friend');

    // Fill in valid email and message
    await page.fill('input[type="email"]', 'friend@example.com');
    await page.fill('textarea', 'Would love to volunteer together!');
    
    // Submit the request
    await page.click('text=Send Request');

    // Dialog should close and we should see a success state
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Could check for success message or updated UI state here
    // This would depend on the specific implementation
  });

  test('should open privacy settings dialog', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to friends page
    await page.goto('/friends');

    // Click "Privacy Settings" button
    await page.click('text=Privacy Settings');

    // Verify dialog is open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Friend Privacy Settings')).toBeVisible();
    await expect(page.locator('text=Who can see your volunteer activity?')).toBeVisible();
    await expect(page.locator('text=Allow friend requests')).toBeVisible();
  });

  test('should change privacy settings', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to friends page
    await page.goto('/friends');

    // Open privacy settings
    await page.click('text=Privacy Settings');

    // Change visibility to public
    await page.click('input[value="PUBLIC"]');
    
    // Uncheck allow friend requests
    await page.click('input[type="checkbox"]');

    // Save settings
    await page.click('text=Save Settings');

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should switch between friends and requests tabs', async ({ page }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'volunteer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to friends page
    await page.goto('/friends');

    // Should start on Friends tab
    await expect(page.locator('[data-state="active"]')).toContainText('Friends');

    // Click on Requests tab
    await page.click('text=Requests');
    await expect(page.locator('[data-state="active"]')).toContainText('Requests');

    // Click back to Friends tab
    await page.click('text=Friends');
    await expect(page.locator('[data-state="active"]')).toContainText('Friends');
  });

  test('should search friends when friends exist', async ({ page }) => {
    // This test would require pre-seeded data or API mocking
    // Skipping for now as it requires test data setup
    test.skip();
  });

  test('should accept friend request', async ({ page }) => {
    // This test would require pre-seeded friend requests
    // Skipping for now as it requires test data setup
    test.skip();
  });

  test('should decline friend request', async ({ page }) => {
    // This test would require pre-seeded friend requests
    // Skipping for now as it requires test data setup
    test.skip();
  });

  test('should remove friend', async ({ page }) => {
    // This test would require pre-seeded friends
    // Skipping for now as it requires test data setup
    test.skip();
  });

  test('friends page should not be accessible to admin users', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Try to navigate to friends page
    await page.goto('/friends');

    // Should either redirect or show 404/403 error
    // The exact behavior depends on implementation
    // For now, just check that we don't see the friends UI
    await expect(page.locator('h1')).not.toContainText('My Friends');
  });

  test('friends link should not appear in admin navigation', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Check that Friends link is not in navigation
    await expect(page.locator('a[href="/friends"]')).not.toBeVisible();
  });
});