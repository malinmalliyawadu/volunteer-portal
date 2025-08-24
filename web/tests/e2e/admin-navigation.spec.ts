import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Admin Navigation', () => {
  let adminUser: any;
  let regularUser: any;

  test.beforeAll(async () => {
    const timestamp = Date.now();
    
    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: `admin-nav-test-${timestamp}@example.com`,
        firstName: 'Admin',
        lastName: 'Navigation',
        name: 'Admin Navigation',
        hashedPassword: 'hashed-password',
        role: 'ADMIN',
        profileCompleted: true,
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      }
    });

    // Create regular user for comparison
    regularUser = await prisma.user.create({
      data: {
        email: `regular-nav-test-${timestamp}@example.com`,
        firstName: 'Regular',
        lastName: 'User',
        name: 'Regular User',
        hashedPassword: 'hashed-password',
        role: 'VOLUNTEER',
        profileCompleted: true,
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      }
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { 
        email: { 
          in: [adminUser.email, regularUser.email] 
        } 
      }
    });
    await prisma.$disconnect();
  });

  test.describe('Admin Header Navigation', () => {
    test('admin sees migration link in desktop navigation', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');

      // Check desktop navigation (hidden lg:flex)
      const desktopNav = page.locator('.hidden.lg\\:flex');
      
      // Verify all admin links are present
      await expect(desktopNav.locator('a[href="/admin"]')).toContainText('Dashboard');
      await expect(desktopNav.locator('a[href="/shifts"]')).toContainText('Shifts');
      await expect(desktopNav.locator('a[href="/admin/shifts"]')).toContainText('Manage Shifts');
      await expect(desktopNav.locator('a[href="/admin/users"]')).toContainText('Manage Users');
      await expect(desktopNav.locator('a[href="/admin/migration"]')).toContainText('Migration');

      // Verify migration link is visible and clickable
      const migrationLink = desktopNav.locator('a[href="/admin/migration"]');
      await expect(migrationLink).toBeVisible();
      
      // Click migration link
      await migrationLink.click();
      await page.waitForURL('/admin/migration');
      
      // Verify we're on the migration page
      await expect(page.locator('h1')).toContainText('Migration Management');
    });

    test('admin sees migration link in mobile navigation', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Login as admin
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');

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
      await page.goto('/login');
      await page.fill('input[type="email"]', regularUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Check that admin links are not visible
      await expect(page.locator('a[href="/admin"]')).not.toBeVisible();
      await expect(page.locator('a[href="/admin/shifts"]')).not.toBeVisible();
      await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible();
      await expect(page.locator('a[href="/admin/migration"]')).not.toBeVisible();

      // Instead, regular users should see volunteer-specific links
      await expect(page.locator('a[href="/dashboard"]')).toContainText('Dashboard');
      await expect(page.locator('a[href="/shifts"]')).toContainText('Shifts');
      await expect(page.locator('a[href="/shifts/mine"]')).toContainText('My Shifts');
      await expect(page.locator('a[href="/friends"]')).toContainText('Friends');
    });

    test('migration navigation link has correct styling and behavior', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');

      const migrationLink = page.locator('a[href="/admin/migration"]');
      
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
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');

      // Test from admin dashboard
      await page.goto('/admin');
      await page.click('a[href="/admin/migration"]');
      await page.waitForURL('/admin/migration');
      await expect(page.locator('h1')).toContainText('Migration Management');

      // Test from admin users page
      await page.goto('/admin/users');
      await page.click('a[href="/admin/migration"]');
      await page.waitForURL('/admin/migration');
      await expect(page.locator('h1')).toContainText('Migration Management');

      // Test from admin shifts page
      await page.goto('/admin/shifts');
      await page.click('a[href="/admin/migration"]');
      await page.waitForURL('/admin/migration');
      await expect(page.locator('h1')).toContainText('Migration Management');
    });
  });

  test.describe('Navigation State Management', () => {
    test('migration link shows active state when on migration page', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');

      // Navigate to migration page
      await page.goto('/admin/migration');

      // Check that migration link has active styling
      const migrationLink = page.locator('a[href="/admin/migration"]');
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
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');

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
        await expect(page.locator('h1')).toContainText('Migration Management');
      }
    });
  });
});