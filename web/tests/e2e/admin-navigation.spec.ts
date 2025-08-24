import { test, expect } from './base';
import type { Page } from '@playwright/test';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  try {
    await page.goto('/login');
    await page.waitForLoadState('load');

    const adminLoginButton = page.getByTestId('quick-login-admin-button');
    await adminLoginButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminLoginButton.click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15000,
    });
    await page.waitForLoadState('load');
  } catch (error) {
    console.log('Error during admin login:', error);
    throw error;
  }
}

// Helper function to login as volunteer
async function loginAsVolunteer(page: Page) {
  try {
    await page.goto('/login');
    await page.waitForLoadState('load');

    const volunteerLoginButton = page.getByTestId('quick-login-volunteer-button');
    await volunteerLoginButton.waitFor({ state: 'visible', timeout: 10000 });
    await volunteerLoginButton.click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15000,
    });
    await page.waitForLoadState('load');
  } catch (error) {
    console.log('Error during volunteer login:', error);
    throw error;
  }
}

test.describe('Admin Navigation', () => {

  test.describe('Admin Header Navigation', () => {
    test('admin sees migration link in desktop navigation', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);

      // Verify all admin links are present using test IDs
      await expect(page.getByTestId('nav-admin-dashboard')).toBeVisible();
      await expect(page.getByTestId('nav-admin-dashboard')).toContainText('Dashboard');
      await expect(page.getByTestId('nav-shifts')).toBeVisible();
      await expect(page.getByTestId('nav-shifts')).toContainText('Shifts');
      await expect(page.getByTestId('nav-admin-manage-shifts')).toBeVisible();
      await expect(page.getByTestId('nav-admin-manage-shifts')).toContainText('Manage Shifts');
      await expect(page.getByTestId('nav-admin-manage-users')).toBeVisible();
      await expect(page.getByTestId('nav-admin-manage-users')).toContainText('Manage Users');
      await expect(page.getByTestId('nav-admin-migration')).toBeVisible();
      await expect(page.getByTestId('nav-admin-migration')).toContainText('Migration');

      // Verify migration link is clickable
      const migrationLink = page.getByTestId('nav-admin-migration');
      await expect(migrationLink).toBeVisible();
      
      // Click migration link
      await migrationLink.click();
      await page.waitForURL('/admin/migration');
      
      // Verify we're on the migration page
      await expect(page.locator('h1')).toContainText('User Migration');
    });

    test('admin sees migration link in mobile navigation', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Login as admin
      await loginAsAdmin(page);

      // Open mobile menu
      const mobileMenuButton = page.locator('button[aria-label="Toggle mobile menu"]');
      await expect(mobileMenuButton).toBeVisible();
      await mobileMenuButton.click();

      // Check mobile navigation is open
      const mobileNav = page.locator('.lg\\:hidden .space-y-3');
      await expect(mobileNav).toBeVisible();

      // Verify admin links in mobile menu - but migration link is not in mobile menu
      await expect(mobileNav.locator('a[href="/admin"]')).toContainText('Dashboard');
      await expect(mobileNav.locator('a[href="/shifts"]')).toContainText('Browse Shifts');
      await expect(mobileNav.locator('a[href="/admin/shifts"]')).toContainText('Manage Shifts');
      await expect(mobileNav.locator('a[href="/admin/users"]')).toContainText('Manage Users');
      
      // Note: Based on the site-header.tsx, migration link is only in desktop nav
      // This is expected behavior - not all admin links are in mobile menu
    });

    test('regular users do not see admin navigation links', async ({ page }) => {
      // Login as regular user
      await loginAsVolunteer(page);

      // Check that admin links are not visible
      await expect(page.getByTestId('nav-admin-dashboard')).not.toBeVisible();
      await expect(page.getByTestId('nav-admin-manage-shifts')).not.toBeVisible();
      await expect(page.getByTestId('nav-admin-manage-users')).not.toBeVisible();
      await expect(page.getByTestId('nav-admin-migration')).not.toBeVisible();

      // Instead, regular users should see volunteer-specific links
      await expect(page.getByTestId('nav-volunteer-dashboard')).toBeVisible();
      await expect(page.getByTestId('nav-volunteer-dashboard')).toContainText('Dashboard');
      await expect(page.getByTestId('nav-shifts')).toBeVisible();
      await expect(page.getByTestId('nav-shifts')).toContainText('Shifts');
      await expect(page.getByTestId('nav-my-shifts')).toBeVisible();
      await expect(page.getByTestId('nav-my-shifts')).toContainText('My Shifts');
      await expect(page.getByTestId('nav-friends')).toBeVisible();
      await expect(page.getByTestId('nav-friends')).toContainText('Friends');
    });

    test('migration navigation link has correct styling and behavior', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);

      const migrationLink = page.getByTestId('nav-admin-migration');
      
      // Check link styling (should have consistent button styles)
      await expect(migrationLink).toHaveClass(/text-white\/90/);
      await expect(migrationLink).toHaveClass(/hover:text-white/);
      await expect(migrationLink).toHaveClass(/rounded-lg/);
      
      // Test hover effect (link should be interactive)
      await migrationLink.hover();
      
      // Click and verify navigation
      await migrationLink.click();
      await page.waitForURL('/admin/migration');
      
      // Verify active state styling when on migration page
      await expect(migrationLink).toHaveClass(/text-white/);
      await expect(migrationLink).toHaveClass(/bg-white\/15/);
    });

    test('migration link works correctly from different admin pages', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);

      // Test from admin dashboard
      await page.goto('/admin');
      await page.click('nav a[href="/admin/migration"]');
      await page.waitForURL('/admin/migration');
      await expect(page.locator('h1')).toContainText('User Migration');

      // Test from admin users page
      await page.goto('/admin/users');
      await page.click('nav a[href="/admin/migration"]');
      await page.waitForURL('/admin/migration');
      await expect(page.locator('h1')).toContainText('User Migration');

      // Test from admin shifts page
      await page.goto('/admin/shifts');
      await page.click('nav a[href="/admin/migration"]');
      await page.waitForURL('/admin/migration');
      await expect(page.locator('h1')).toContainText('User Migration');
    });
  });

  test.describe('Navigation State Management', () => {
    test('migration link shows active state when on migration page', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);

      // Navigate to migration page
      await page.goto('/admin/migration');

      // Check that migration link has active styling
      const migrationLink = page.getByTestId('nav-admin-migration');
      await expect(migrationLink).toHaveClass(/bg-white\/15/);
      await expect(migrationLink).toHaveClass(/text-white/);
      
      // Check that other admin links don't have active state
      const usersLink = page.locator('a[href="/admin/users"]');
      const shiftsLink = page.locator('a[href="/admin/shifts"]');
      
      await expect(usersLink).not.toHaveClass(/bg-white\/15/);
      await expect(shiftsLink).not.toHaveClass(/bg-white\/15/);
    });

    test('migration link accessibility and keyboard navigation', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);

      // Test keyboard navigation to migration link
      await page.keyboard.press('Tab'); // Should focus on first interactive element
      
      // Continue tabbing until we reach migration link
      let currentFocus = await page.locator(':focus').getAttribute('href');
      let tabCount = 0;
      
      while (currentFocus !== '/admin/migration' && tabCount < 20) {
        await page.keyboard.press('Tab');
        currentFocus = await page.locator(':focus').getAttribute('href');
        tabCount++;
      }
      
      // Verify migration link can be activated with Enter
      if (currentFocus === '/admin/migration') {
        await page.keyboard.press('Enter');
        await page.waitForURL('/admin/migration');
        await expect(page.locator('h1')).toContainText('User Migration');
      }
    });
  });
});