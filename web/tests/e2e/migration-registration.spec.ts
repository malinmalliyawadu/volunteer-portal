import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

test.describe('Migration Registration Flow', () => {
  let testUser: any;
  let registrationToken: string;
  let expiredToken: string;

  test.beforeAll(async () => {
    // Create test user for migration registration
    registrationToken = randomBytes(32).toString('hex');
    expiredToken = randomBytes(32).toString('hex');
    
    testUser = await prisma.user.create({
      data: {
        email: 'migration-test@example.com',
        firstName: 'Migration',
        lastName: 'Tester',
        name: 'Migration Tester',
        phone: '+64 21 555 9999',
        hashedPassword: 'temp-password-hash',
        role: 'VOLUNTEER',
        isMigrated: true,
        migrationInvitationToken: registrationToken,
        migrationTokenExpiresAt: addDays(new Date(), 7),
        profileCompleted: false,
        volunteerAgreementAccepted: false,
        healthSafetyPolicyAccepted: false,
      }
    });

    // Create user with expired token for testing
    await prisma.user.create({
      data: {
        email: 'expired-migration@example.com',
        firstName: 'Expired',
        lastName: 'User',
        name: 'Expired User',
        hashedPassword: 'temp-password-hash',
        role: 'VOLUNTEER',
        isMigrated: true,
        migrationInvitationToken: expiredToken,
        migrationTokenExpiresAt: addDays(new Date(), -1), // Expired yesterday
        profileCompleted: false,
        volunteerAgreementAccepted: false,
        healthSafetyPolicyAccepted: false,
      }
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['migration-test@example.com', 'expired-migration@example.com']
        }
      }
    });
    await prisma.$disconnect();
  });

  test.describe('Token Validation', () => {
    test('should show registration form for valid token', async ({ page }) => {
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Check registration form is displayed
      await expect(page.locator('[data-testid="migration-registration-form"]')).toBeVisible();
      await expect(page.locator('text=Complete Your Registration')).toBeVisible();
      
      // Check user info is pre-filled
      await expect(page.locator('input[name="firstName"]')).toHaveValue('Migration');
      await expect(page.locator('input[name="lastName"]')).toHaveValue('Tester');
      await expect(page.locator('input[name="email"]')).toHaveValue('migration-test@example.com');
      await expect(page.locator('input[name="phone"]')).toHaveValue('+64 21 555 9999');
    });

    test('should show error for invalid token', async ({ page }) => {
      await page.goto('/register/migrate?token=invalid-token-123');
      
      // Check error message is displayed
      await expect(page.locator('text=Invalid or expired registration link')).toBeVisible();
      await expect(page.locator('text=Please contact support')).toBeVisible();
      
      // Check registration form is not displayed
      await expect(page.locator('[data-testid="migration-registration-form"]')).not.toBeVisible();
    });

    test('should show error for expired token', async ({ page }) => {
      await page.goto(`/register/migrate?token=${expiredToken}`);
      
      // Check error message is displayed
      await expect(page.locator('text=Invalid or expired registration link')).toBeVisible();
      await expect(page.locator('text=Please contact support')).toBeVisible();
    });

    test('should show error when no token provided', async ({ page }) => {
      await page.goto('/register/migrate');
      
      // Check error message is displayed
      await expect(page.locator('text=Invalid or expired registration link')).toBeVisible();
    });
  });

  test.describe('Multi-Step Registration Form', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to registration with valid token
      await page.goto(`/register/migrate?token=${registrationToken}`);
      await expect(page.locator('[data-testid="migration-registration-form"]')).toBeVisible();
    });

    test('should complete step 1: Personal Information', async ({ page }) => {
      // Check step indicator
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 1 of 4');
      await expect(page.locator('text=Personal Information')).toBeVisible();
      
      // Form should be pre-filled, just need to set password
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      
      // Proceed to next step
      await page.click('button:has-text("Continue")');
      
      // Check step 2 is now active
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 2 of 4');
      await expect(page.locator('text=Emergency Contact')).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      // Try weak password
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');
      await page.click('button:has-text("Continue")');
      
      // Check validation error
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
      
      // Try mismatched passwords
      await page.fill('input[name="password"]', 'StrongPassword123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
      await page.click('button:has-text("Continue")');
      
      // Check validation error
      await expect(page.locator('text=Passwords must match')).toBeVisible();
    });

    test('should complete step 2: Emergency Contact', async ({ page }) => {
      // Complete step 1 first
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      
      // Fill emergency contact info
      await page.fill('input[name="emergencyContactName"]', 'John Emergency');
      await page.fill('input[name="emergencyContactRelationship"]', 'Brother');
      await page.fill('input[name="emergencyContactPhone"]', '+64 21 555 8888');
      
      // Proceed to next step
      await page.click('button:has-text("Continue")');
      
      // Check step 3 is now active
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 3 of 4');
      await expect(page.locator('text=Volunteer Preferences')).toBeVisible();
    });

    test('should allow skipping optional emergency contact', async ({ page }) => {
      // Complete step 1 first
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      
      // Skip emergency contact (leave fields empty)
      await page.click('button:has-text("Skip for Now")');
      
      // Check step 3 is now active
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 3 of 4');
    });

    test('should complete step 3: Volunteer Preferences', async ({ page }) => {
      // Complete steps 1 and 2
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      await page.click('button:has-text("Skip for Now")');
      
      // Select availability preferences
      await page.check('input[value="Monday"]');
      await page.check('input[value="Wednesday"]');
      await page.check('input[value="Friday"]');
      
      // Select location preferences
      await page.check('input[value="Wellington"]');
      await page.check('input[value="Glenn Innes"]');
      
      // Add notes
      await page.fill('textarea[name="volunteerNotes"]', 'Excited to help with the volunteer work!');
      
      // Proceed to next step
      await page.click('button:has-text("Continue")');
      
      // Check step 4 is now active
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 4 of 4');
      await expect(page.locator('text=Terms and Agreements')).toBeVisible();
    });

    test('should complete step 4: Terms and Agreements', async ({ page }) => {
      // Complete steps 1-3
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      await page.click('button:has-text("Skip for Now")');
      await page.click('button:has-text("Continue")');
      
      // Check agreements are required
      await page.click('button:has-text("Complete Registration")');
      await expect(page.locator('text=You must accept the volunteer agreement')).toBeVisible();
      
      // Accept agreements
      await page.check('input[name="volunteerAgreement"]');
      await page.check('input[name="healthSafetyPolicy"]');
      
      // Complete registration
      await page.click('button:has-text("Complete Registration")');
      
      // Check success and redirect
      await expect(page.locator('text=Registration completed successfully')).toBeVisible();
      await expect(page).toHaveURL('/dashboard');
    });

    test('should allow going back to previous steps', async ({ page }) => {
      // Complete step 1
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      
      // Go back to step 1
      await page.click('button:has-text("Back")');
      await expect(page.locator('text=Personal Information')).toBeVisible();
      
      // Check data is preserved
      await expect(page.locator('input[name="firstName"]')).toHaveValue('Migration');
      await expect(page.locator('input[name="password"]')).toHaveValue('SecurePassword123!');
    });

    test('should handle form validation errors', async ({ page }) => {
      // Try to proceed without required fields
      await page.fill('input[name="firstName"]', '');
      await page.click('button:has-text("Continue")');
      
      // Check validation errors
      await expect(page.locator('text=First name is required')).toBeVisible();
      
      // Fill required field and try again
      await page.fill('input[name="firstName"]', 'Migration');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      
      // Should proceed to next step
      await expect(page.locator('text=Emergency Contact')).toBeVisible();
    });
  });

  test.describe('Registration Flow Integration', () => {
    test('should automatically log in after successful registration', async ({ page }) => {
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Complete full registration flow
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      
      await page.click('button:has-text("Skip for Now")');
      await page.click('button:has-text("Continue")');
      
      await page.check('input[name="volunteerAgreement"]');
      await page.check('input[name="healthSafetyPolicy"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Check user is logged in and redirected to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('text=Welcome, Migration')).toBeVisible();
      
      // Check profile completion status
      await expect(page.locator('[data-testid="profile-completion"]')).toBeVisible();
    });

    test('should invalidate token after successful registration', async ({ page }) => {
      // First, complete registration
      await page.goto(`/register/migrate?token=${registrationToken}`);
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      await page.click('button:has-text("Skip for Now")');
      await page.click('button:has-text("Continue")');
      await page.check('input[name="volunteerAgreement"]');
      await page.check('input[name="healthSafetyPolicy"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Sign out');
      
      // Try to use the same token again
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Should show error for used token
      await expect(page.locator('text=Invalid or expired registration link')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors during registration', async ({ page }) => {
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Mock network failure for registration endpoint
      await page.route('**/api/register/migrate', route => {
        route.abort('failed');
      });
      
      // Complete form and try to submit
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      await page.click('button:has-text("Skip for Now")');
      await page.click('button:has-text("Continue")');
      await page.check('input[name="volunteerAgreement"]');
      await page.check('input[name="healthSafetyPolicy"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Check error message
      await expect(page.locator('text=Registration failed')).toBeVisible();
    });

    test('should handle server validation errors', async ({ page }) => {
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Mock server validation error
      await page.route('**/api/register/migrate', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Email already exists'
          })
        });
      });
      
      // Complete form and submit
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button:has-text("Continue")');
      await page.click('button:has-text("Skip for Now")');
      await page.click('button:has-text("Continue")');
      await page.check('input[name="volunteerAgreement"]');
      await page.check('input[name="healthSafetyPolicy"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Check server error message
      await expect(page.locator('text=Email already exists')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Check form is still usable
      await expect(page.locator('[data-testid="migration-registration-form"]')).toBeVisible();
      
      // Check step indicator is visible
      await expect(page.locator('[data-testid="step-indicator"]')).toBeVisible();
      
      // Check form fields are accessible
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      
      // Check continue button works
      await page.click('button:has-text("Continue")');
      await expect(page.locator('text=Emergency Contact')).toBeVisible();
    });
  });
});