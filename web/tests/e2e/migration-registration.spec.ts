import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

test.describe('Migration Registration Flow', () => {
  let testUser: any;
  let registrationToken: string;
  let expiredToken: string;
  let testEmail: string;
  let expiredEmail: string;

  test.beforeAll(async () => {
    // Use unique emails with timestamp and random suffix to avoid conflicts
    const timestamp = Date.now();
    const randomSuffix = randomBytes(4).toString('hex');
    testEmail = `migration-test-${timestamp}-${randomSuffix}@example.com`;
    expiredEmail = `expired-migration-${timestamp}-${randomSuffix}@example.com`;

    // Clean up any existing test data first  
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { in: [testEmail, expiredEmail] } },
          { email: { startsWith: 'migration-test-' } },
          { email: { startsWith: 'expired-migration-' } }
        ]
      }
    });

    // Create test user for migration registration
    registrationToken = randomBytes(32).toString('hex');
    expiredToken = randomBytes(32).toString('hex');
    
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
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
        email: expiredEmail,
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
          in: [testEmail, expiredEmail]
        }
      }
    });
    await prisma.$disconnect();
  });

  test.describe('Token Validation', () => {
    test('should show registration form for valid token', async ({ page }) => {
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Wait for the form to load and be visible
      await expect(page.locator('[data-testid="migration-registration-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-card-title"]')).toContainText('Review Your Information');
      
      // Check user info is pre-filled
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Migration');
      await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('Tester');
      await expect(page.locator('[data-testid="phone-input"]')).toHaveValue('+64 21 555 9999');
    });

    test('should show error for invalid token', async ({ page }) => {
      await page.goto('/register/migrate?token=invalid-token-123');
      
      // Check error message is displayed
      await expect(page.locator('[data-testid="error-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-description"]')).toContainText('Please contact the volunteer coordinator');
      
      // Check registration form is not displayed
      await expect(page.locator('[data-testid="migration-registration-form"]')).not.toBeVisible();
    });

    test('should show error for expired token', async ({ page }) => {
      await page.goto(`/register/migrate?token=${expiredToken}`);
      
      // Check error message is displayed
      await expect(page.locator('[data-testid="error-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-description"]')).toContainText('Please contact the volunteer coordinator');
    });

    test('should show error when no token provided', async ({ page }) => {
      await page.goto('/register/migrate');
      
      // Check error message is displayed
      await expect(page.locator('[data-testid="no-token-title"]')).toBeVisible();
    });
  });

  test.describe('Multi-Step Registration Form', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to registration with valid token
      await page.goto(`/register/migrate?token=${registrationToken}`);
      await expect(page.locator('[data-testid="migration-registration-form"]')).toBeVisible();
    });

    test('should complete step 1: Personal Information', async ({ page }) => {
      // Check step indicator - now 6 steps with photo upload
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 1 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Review Your Information');
      
      // Form should be pre-filled, verify values
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Migration');
      await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('Tester');
      
      // Proceed to next step
      await page.click('button:has-text("Next")');
      
      // Check step 2 is now active
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 2 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Emergency Contact');
    });

    test('should validate password requirements', async ({ page }) => {
      // Navigate to password step (step 5) 
      await page.click('button:has-text("Next")'); // Step 2: Emergency Contact
      // Fill out emergency contact
      await page.fill('[data-testid="emergency-contact-name-input"]', 'John Emergency');
      await page.fill('[data-testid="emergency-contact-relationship-input"]', 'Brother');
      await page.fill('[data-testid="emergency-contact-phone-input"]', '+64 21 555 8888');
      await page.click('button:has-text("Next")'); // Step 3: Medical & Availability
      await page.click('button:has-text("Next")'); // Step 4: Profile Photo
      
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      
      // Now on Step 5: Set Password
      
      // Now we're on step 5: Set Password
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Set Password');
      
      // Try weak password
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'weak');
      await page.click('button:has-text("Next")');
      
      // Check validation error in toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Password too short');
      
      // Try mismatched passwords
      await page.fill('[data-testid="password-input"]', 'StrongPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      await page.click('button:has-text("Next")');
      
      // Check validation error in toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Passwords do not match');
    });

    test('should complete step 2: Emergency Contact', async ({ page }) => {
      // Complete step 1 first
      await page.click('button:has-text("Next")');
      
      // Fill emergency contact info
      await page.fill('[data-testid="emergency-contact-name-input"]', 'John Emergency');
      await page.fill('[data-testid="emergency-contact-relationship-input"]', 'Brother');
      await page.fill('[data-testid="emergency-contact-phone-input"]', '+64 21 555 8888');
      
      // Proceed to next step
      await page.click('button:has-text("Next")');
      
      // Check step 3 is now active - Medical & Availability
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 3 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Medical & Availability');
    });

    test('should complete step 3: Medical & Availability', async ({ page }) => {
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      await page.fill('[data-testid="emergency-contact-name-input"]', 'John Emergency');
      await page.fill('[data-testid="emergency-contact-relationship-input"]', 'Brother');
      await page.fill('[data-testid="emergency-contact-phone-input"]', '+64 21 555 8888');
      await page.click('button:has-text("Next")');
      
      // Fill medical information (optional)
      await page.fill('textarea[name="medicalConditions"]', 'No known allergies or conditions');
      
      // Select availability preferences
      await page.check('input[value="Monday"]');
      await page.check('input[value="Wednesday"]');
      await page.check('input[value="Friday"]');
      
      // Select location preferences
      await page.check('input[value="Wellington"]');
      await page.check('input[value="Glenn Innes"]');
      
      // Proceed to photo upload step
      await page.click('button:has-text("Next")');
      
      // Check step 4 is now active - Profile Photo
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 4 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Profile Photo');
    });

    test('should require profile photo upload in step 4', async ({ page }) => {
      // Navigate to photo upload step
      await page.click('button:has-text("Next")');
      await page.fill('[data-testid="emergency-contact-name-input"]', 'John Emergency');
      await page.fill('[data-testid="emergency-contact-relationship-input"]', 'Brother');
      await page.fill('[data-testid="emergency-contact-phone-input"]', '+64 21 555 8888');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      
      // Check photo upload component is visible
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Profile Photo');
      // Check profile photo upload instructions are visible
      await expect(page.locator('[data-testid="profile-image-upload"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-image-upload"]')).toBeVisible();
      
      // Try to proceed without uploading photo
      await page.click('button:has-text("Next")');
      
      // Should show validation error
      // Check validation error in toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Profile photo required');
    });

    test('should complete step 4: Profile Photo Upload', async ({ page }) => {
      // Navigate to photo upload step
      await page.click('button:has-text("Next")');
      await page.fill('[data-testid="emergency-contact-name-input"]', 'John Emergency');
      await page.fill('[data-testid="emergency-contact-relationship-input"]', 'Brother');
      await page.fill('[data-testid="emergency-contact-phone-input"]', '+64 21 555 8888');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      
      // Upload a test image (base64 data)
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      // Mock file upload
      await page.evaluate((imageData) => {
        const uploadComponent = document.querySelector('[data-testid="profile-image-upload"]');
        if (uploadComponent) {
          // Simulate image upload by triggering the onImageChange callback
          const event = new CustomEvent('imageChange', { detail: imageData });
          uploadComponent.dispatchEvent(event);
        }
      }, testImageBase64);
      
      // Proceed to next step
      await page.click('button:has-text("Next")');
      
      // Check step 5 is now active - Set Password
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 5 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Set Password');
    });

    test('should complete step 5: Set Password', async ({ page }) => {
      // Navigate to step 5 (Set Password)
      await page.click('button:has-text("Next")');
      await page.fill('[data-testid="emergency-contact-name-input"]', 'John Emergency');
      await page.fill('[data-testid="emergency-contact-relationship-input"]', 'Brother');
      await page.fill('[data-testid="emergency-contact-phone-input"]', '+64 21 555 8888');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      // Upload a dummy image
      await uploadDummyImage(page);
      await page.click('button:has-text("Next")'); // Step 5: Set Password
      
      // Now on step 5: Set Password
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 5 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Set Password');
      
      // Set password
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      
      // Proceed to final step
      await page.click('button:has-text("Next")');
      
      // Check step 6 is now active - Final Steps
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 6 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Final Steps');
    });

    test('should allow skipping optional emergency contact', async ({ page }) => {
      // Go to step 2 (Emergency Contact)
      await page.click('button:has-text("Next")');
      
      // Skip emergency contact (leave fields empty and just click Next)
      await page.click('button:has-text("Next")');
      
      // Check step 3 is now active
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 3 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Medical & Availability');
    });

    test('should navigate through availability selection', async ({ page }) => {
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      
      // Now on step 3: Medical & Availability
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 3 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Medical & Availability');
      
      // Select availability preferences
      await page.check('input[value="Monday"]');
      await page.check('input[value="Wednesday"]');
      await page.check('input[value="Friday"]');
      
      // Select location preferences
      await page.check('input[value="Wellington"]');
      await page.check('input[value="Glenn Innes"]');
      
      // Proceed to next step
      await page.click('button:has-text("Next")');
      
      // Check step 4 is now active
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 4 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Profile Photo');
    });

    test('should complete step 6: Final Steps (Terms and Agreements)', async ({ page }) => {
      // Navigate to step 6 (Final Steps)
      await page.click('button:has-text("Next")');
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      await page.click('button:has-text("Next")');
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      await page.click('button:has-text("Next")');
      
      // Now on step 6: Final Steps
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 6 of 6');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Final Steps');
      
      // Check agreements are required
      await page.click('button:has-text("Complete Registration")');
      // Check validation error in toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Please accept the required agreements');
      
      // Accept agreements
      await page.check('[data-testid="volunteer-agreement-checkbox"]');
      await page.check('[data-testid="health-safety-policy-checkbox"]');
      
      // Complete registration
      await page.click('button:has-text("Complete Registration")');
      
      // Check success and redirect
      // Check success message in toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Registration completed successfully');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should allow going back to previous steps', async ({ page }) => {
      // Go to step 2
      await page.click('button:has-text("Next")');
      
      // Go back to step 1
      await page.click('button:has-text("Previous")');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Review Your Information');
      
      // Check data is preserved
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Migration');
    });

    test('should handle form validation errors', async ({ page }) => {
      // Try to proceed without required fields
      await page.fill('[data-testid="first-name-input"]', '');
      await page.click('button:has-text("Next")');
      
      // Check validation errors
      // Check validation error in toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Required fields missing');
      
      // Fill required field and try again
      await page.fill('[data-testid="first-name-input"]', 'Migration');
      await page.click('button:has-text("Next")');
      
      // Should proceed to next step
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Emergency Contact');
    });
  });

  test.describe('Registration Flow Integration', () => {
    test('should automatically log in after successful registration', async ({ page }) => {
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Complete full registration flow
      // Step 1 -> 2
      await page.click('button:has-text("Next")');
      // Step 2 -> 3 (skip emergency contact)
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      // Step 3 -> 4 
      await page.click('button:has-text("Next")');
      // Step 4 -> 5 (skip photo)
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      // Step 5: Set password
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      await page.click('button:has-text("Next")');
      // Step 6: Final agreements
      await page.check('[data-testid="volunteer-agreement-checkbox"]');
      await page.check('[data-testid="health-safety-policy-checkbox"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Check user is logged in and redirected to dashboard
      await expect(page).toHaveURL('/dashboard');
      // Check welcome message on dashboard
      await expect(page.locator('[data-testid="user-welcome"]')).toContainText('Welcome, Migration');
      
      // Check profile completion status
      await expect(page.locator('[data-testid="profile-completion"]')).toBeVisible();
    });

    test('should invalidate token after successful registration', async ({ page }) => {
      // First, complete registration
      await page.goto(`/register/migrate?token=${registrationToken}`);
      // Step 1 -> 2
      await page.click('button:has-text("Next")');
      // Step 2 -> 3 (skip emergency contact)
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      // Step 3 -> 4 
      await page.click('button:has-text("Next")');
      // Step 4 -> 5 (skip photo)
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      // Step 5: Set password
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      await page.click('button:has-text("Next")');
      // Step 6: Final agreements
      await page.check('[data-testid="volunteer-agreement-checkbox"]');
      await page.check('[data-testid="health-safety-policy-checkbox"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out-button"]');
      
      // Try to use the same token again
      await page.goto(`/register/migrate?token=${registrationToken}`);
      
      // Should show error for used token
      await expect(page.locator('[data-testid="error-title"]')).toBeVisible();
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
      // Navigate through all steps
      await page.click('button:has-text("Next")');
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      await page.click('button:has-text("Next")');
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      await page.click('button:has-text("Next")');
      await page.check('[data-testid="volunteer-agreement-checkbox"]');
      await page.check('[data-testid="health-safety-policy-checkbox"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Check error message
      // Check error toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Registration failed');
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
      // Navigate through all steps
      await page.click('button:has-text("Next")');
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      await page.click('button:has-text("Next")');
      // Skip photo upload
      await page.click('[data-testid="skip-photo-button"]');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      await page.click('button:has-text("Next")');
      await page.check('[data-testid="volunteer-agreement-checkbox"]');
      await page.check('[data-testid="health-safety-policy-checkbox"]');
      await page.click('button:has-text("Complete Registration")');
      
      // Check server error message
      // Check server error toast
      await expect(page.locator('.toast, [data-sonner-toast]')).toContainText('Email already exists');
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
      await expect(page.locator('[data-testid="first-name-input"]')).toBeVisible();
      
      // Check continue button works
      await page.click('button:has-text("Next")');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Emergency Contact');
    });
  });
});