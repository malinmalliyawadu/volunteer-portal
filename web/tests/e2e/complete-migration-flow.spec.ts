import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

test.describe('Complete Migration Flow', () => {
  let testUsers: any[] = [];
  let adminUser: any;
  let migrationToken: string;
  let migrationUser: any;

  test.beforeAll(async () => {
    // Create admin user for testing
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-migration-flow@example.com',
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        hashedPassword: 'hashed-password',
        role: 'ADMIN',
        profileCompleted: true,
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      }
    });

    // Create migrated user to test with
    migrationToken = 'flow-test-token-' + Date.now();
    migrationUser = await prisma.user.create({
      data: {
        email: 'migration-flow-user@example.com',
        firstName: 'Migration',
        lastName: 'FlowUser',
        name: 'Migration FlowUser',
        phone: '+64 21 555 0000',
        hashedPassword: 'temp-hash',
        role: 'VOLUNTEER',
        isMigrated: true,
        migrationInvitationToken: migrationToken,
        migrationTokenExpiresAt: addDays(new Date(), 7),
        profileCompleted: false,
        volunteerAgreementAccepted: false,
        healthSafetyPolicyAccepted: false,
        availableDays: 'weekdays', // Test legacy format parsing
        availableLocations: 'wellington, onehunga',
      }
    });

    testUsers = [adminUser, migrationUser];
  });

  test.afterAll(async () => {
    // Clean up test data
    const userEmails = testUsers.map(user => user.email);
    await prisma.user.deleteMany({
      where: { email: { in: userEmails } }
    });
    await prisma.$disconnect();
  });

  test.describe('Admin Migration Management', () => {
    test('admin can access migration page via header link', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');

      // Check that migration link is visible in header
      const migrationLink = page.locator('a[href="/admin/migration"]');
      await expect(migrationLink).toBeVisible();
      await expect(migrationLink).toHaveText('Migration');

      // Click migration link to navigate
      await migrationLink.click();
      await page.waitForURL('/admin/migration');

      // Verify we're on migration page
      await expect(page).toHaveTitle(/Migration/);
      await expect(page.locator('h1')).toContainText('Migration Management');
    });

    test('admin can view migrated users and generate invitation', async ({ page }) => {
      // Login and navigate to migration page
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');
      
      await page.goto('/admin/migration');

      // Switch to migrated users tab
      await page.click('[data-testid="migrated-users-tab"]');

      // Find our test user in the list
      const userRow = page.locator(`tr:has-text("${migrationUser.email}")`);
      await expect(userRow).toBeVisible();

      // Check user details are displayed correctly
      await expect(userRow).toContainText('Migration FlowUser');
      await expect(userRow).toContainText('Not Completed');
      
      // Click send invitation button
      const sendInviteButton = userRow.locator('button:has-text("Send Invitation")');
      await sendInviteButton.click();

      // Verify invitation was sent
      await expect(page.locator('.toast, [data-testid="success-message"]')).toContainText(/invitation sent|success/i);
    });
  });

  test.describe('Migration Registration Flow', () => {
    test('volunteer can complete full 6-step migration registration', async ({ page }) => {
      // Go directly to migration URL with token
      await page.goto(`/register/migrate?token=${migrationToken}`);

      // Verify we're on migration page with correct user
      await expect(page.locator('h1')).toContainText('Complete Your Registration');
      await expect(page.locator('text=Migration FlowUser')).toBeVisible();

      // Step 1: Basic Information
      await page.fill('input[name="firstName"]', 'Migration');
      await page.fill('input[name="lastName"]', 'FlowUser');
      await page.fill('input[name="password"]', 'NewSecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'NewSecurePassword123!');
      await page.click('button:has-text("Next")');

      // Step 2: Contact Information
      await page.fill('input[name="phone"]', '+64 21 555 0000');
      await page.fill('input[name="dateOfBirth"]', '1990-01-15');
      await page.click('button:has-text("Next")');

      // Step 3: Emergency Contact
      await page.fill('input[name="emergencyContactName"]', 'Emergency Person');
      await page.fill('input[name="emergencyContactRelationship"]', 'Friend');
      await page.fill('input[name="emergencyContactPhone"]', '+64 21 555 9999');
      await page.fill('textarea[name="medicalConditions"]', 'No conditions');
      await page.click('button:has-text("Next")');

      // Step 4: Profile Photo (Required for migration)
      const fileInput = page.locator('input[type="file"]');
      
      // Create a simple test image (1x1 pixel PNG)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');
      
      // Upload the test image
      await fileInput.setInputFiles({
        name: 'test-profile.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      });

      // Wait for preview to appear
      await expect(page.locator('img[alt="Profile preview"]')).toBeVisible();
      await page.click('button:has-text("Next")');

      // Step 5: Availability (should pre-populate from legacy data)
      // Check that availability was parsed from "weekdays"
      const mondayCheckbox = page.locator('input[value="Monday"]');
      const tuesdayCheckbox = page.locator('input[value="Tuesday"]');
      await expect(mondayCheckbox).toBeChecked();
      await expect(tuesdayCheckbox).toBeChecked();

      // Check locations were parsed from "wellington, onehunga"
      const wellingtonCheckbox = page.locator('input[value="Wellington"]');
      const onehungaCheckbox = page.locator('input[value="Onehunga"]');
      await expect(wellingtonCheckbox).toBeChecked();
      await expect(onehungaCheckbox).toBeChecked();

      // Select notification preferences
      await page.check('input[name="emailNewsletterSubscription"]');
      await page.selectOption('select[name="notificationPreference"]', 'EMAIL');
      await page.fill('select[name="howDidYouHearAboutUs"]', 'migration');
      await page.click('button:has-text("Next")');

      // Step 6: Review and Submit
      await page.check('input[name="volunteerAgreementAccepted"]');
      await page.check('input[name="healthSafetyPolicyAccepted"]');
      
      // Submit the form
      await page.click('button:has-text("Complete Registration")');

      // Verify success
      await expect(page.locator('text=Registration completed successfully', { timeout: 10000 })).toBeVisible();
      await expect(page).toHaveURL('/dashboard');

      // Verify user was updated in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: migrationUser.id }
      });

      expect(updatedUser).toBeTruthy();
      expect(updatedUser?.profileCompleted).toBe(true);
      expect(updatedUser?.migrationInvitationToken).toBeNull();
      expect(updatedUser?.migrationTokenExpiresAt).toBeNull();
      expect(updatedUser?.profilePhotoUrl).toBeTruthy();
      
      // Verify availability was properly parsed and stored
      if (updatedUser?.availableDays) {
        const parsedDays = JSON.parse(updatedUser.availableDays);
        expect(parsedDays).toContain('Monday');
        expect(parsedDays).toContain('Tuesday');
      }
    });

    test('migration registration requires profile photo', async ({ page }) => {
      // Create another test user for this specific test
      const testToken = 'photo-required-token-' + Date.now();
      const photoTestUser = await prisma.user.create({
        data: {
          email: 'photo-required@example.com',
          firstName: 'Photo',
          lastName: 'Required',
          name: 'Photo Required',
          hashedPassword: 'temp-hash',
          role: 'VOLUNTEER',
          isMigrated: true,
          migrationInvitationToken: testToken,
          migrationTokenExpiresAt: addDays(new Date(), 7),
          profileCompleted: false,
          volunteerAgreementAccepted: false,
          healthSafetyPolicyAccepted: false,
        }
      });

      testUsers.push(photoTestUser);

      // Go to migration page
      await page.goto(`/register/migrate?token=${testToken}`);

      // Complete steps 1-3
      await page.fill('input[name="firstName"]', 'Photo');
      await page.fill('input[name="lastName"]', 'Required');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Next")');

      await page.fill('input[name="phone"]', '+64 21 555 1111');
      await page.fill('input[name="dateOfBirth"]', '1985-05-20');
      await page.click('button:has-text("Next")');

      await page.fill('input[name="emergencyContactName"]', 'Emergency Contact');
      await page.fill('input[name="emergencyContactRelationship"]', 'Spouse');
      await page.fill('input[name="emergencyContactPhone"]', '+64 21 555 2222');
      await page.click('button:has-text("Next")');

      // Step 4: Try to proceed without photo
      await page.click('button:has-text("Next")');

      // Verify error message appears
      await expect(page.locator('text=Profile image is required for migration registration')).toBeVisible();
      
      // Verify we can't proceed
      await expect(page.locator('h2:has-text("Availability")')).not.toBeVisible();
    });

    test('migration handles expired tokens', async ({ page }) => {
      // Create user with expired token
      const expiredToken = 'expired-token-' + Date.now();
      const expiredUser = await prisma.user.create({
        data: {
          email: 'expired-token@example.com',
          firstName: 'Expired',
          lastName: 'Token',
          name: 'Expired Token',
          hashedPassword: 'temp-hash',
          role: 'VOLUNTEER',
          isMigrated: true,
          migrationInvitationToken: expiredToken,
          migrationTokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          profileCompleted: false,
          volunteerAgreementAccepted: false,
          healthSafetyPolicyAccepted: false,
        }
      });

      testUsers.push(expiredUser);

      // Try to access migration page with expired token
      await page.goto(`/register/migrate?token=${expiredToken}`);

      // Should show error message
      await expect(page.locator('text=Migration link has expired')).toBeVisible();
      await expect(page.locator('text=Please contact an administrator')).toBeVisible();
    });

    test('migration handles invalid tokens', async ({ page }) => {
      // Try to access migration page with invalid token
      await page.goto('/register/migrate?token=invalid-token-123');

      // Should show error message
      await expect(page.locator('text=Invalid migration link')).toBeVisible();
      await expect(page.locator('text=Please contact an administrator')).toBeVisible();
    });
  });

  test.describe('Migration Status Updates', () => {
    test('admin can see updated migration stats after completion', async ({ page }) => {
      // Login as admin and go to migration page
      await page.goto('/login');
      await page.fill('input[type="email"]', adminUser.email);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin');
      
      await page.goto('/admin/migration');

      // Check migration stats tab
      await page.click('[data-testid="migration-stats-tab"]');

      // Verify stats are updated (should show at least 1 completed registration)
      const completedCount = page.locator('[data-testid="completed-registrations-count"]');
      await expect(completedCount).not.toHaveText('0');

      // Check recent activity shows completed registration
      const recentActivity = page.locator('[data-testid="recent-activity-list"]');
      await expect(recentActivity).toContainText('registration');
      await expect(recentActivity).toContainText('success');
    });
  });
});