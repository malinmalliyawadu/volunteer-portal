import { test, expect } from './base';

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration page with all initial elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Volunteer Portal/);
    
    // Check main heading
    const heading = page.getByRole('heading', { name: /join everybody eats/i });
    await expect(heading).toBeVisible();
    
    // Check description
    const description = page.getByText(/create your volunteer account and start making a difference/i);
    await expect(description).toBeVisible();
    
    // Check "Already have an account?" link
    const loginLink = page.getByRole('link', { name: /already have an account/i });
    await expect(loginLink).toBeVisible();
    
    // Check progress indicator
    const progressHeading = page.getByRole('heading', { name: /registration progress/i });
    await expect(progressHeading).toBeVisible();
    
    // Check step counter
    const stepCounter = page.getByText(/step 1 of 6/i);
    await expect(stepCounter).toBeVisible();
    
    // Check current step heading
    const currentStepHeading = page.getByRole('heading', { name: /create account/i });
    await expect(currentStepHeading).toBeVisible();
  });

  test('should display OAuth providers if configured', async ({ page }) => {
    // Check for OAuth section
    const oauthSection = page.getByText(/quick registration with your existing account/i);
    
    if (await oauthSection.isVisible()) {
      // Check for common OAuth providers
      const googleButton = page.getByRole('button', { name: /continue with google/i });
      const facebookButton = page.getByRole('button', { name: /continue with facebook/i });
      const appleButton = page.getByRole('button', { name: /continue with apple/i });
      
      const oauthCount = await googleButton.count() + await facebookButton.count() + await appleButton.count();
      
      if (oauthCount > 0) {
        // Check divider exists
        const divider = page.getByText(/or create account with email/i);
        await expect(divider).toBeVisible();
      }
    }
  });

  test('should show Step 1: Account form fields correctly', async ({ page }) => {
    // Check welcome message
    const welcomeMessage = page.getByText(/welcome to everybody eats/i);
    await expect(welcomeMessage).toBeVisible();
    
    // Check email field
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');
    
    // Check password field
    const passwordInput = page.getByLabel(/^password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required');
    
    // Check password hint
    const passwordHint = page.getByText(/password must be at least 6 characters/i);
    await expect(passwordHint).toBeVisible();
    
    // Check confirm password field
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await expect(confirmPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('required');
    
    // Check Previous button is disabled on first step
    const previousButton = page.getByRole('button', { name: /previous/i });
    await expect(previousButton).toBeDisabled();
    
    // Check Next button
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
  });

  test('should validate required fields on Step 1', async ({ page }) => {
    // Try to proceed without filling required fields
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Should show validation error toast
    const errorToast = page.getByText(/required fields missing/i);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    
    // Should still be on step 1
    const stepCounter = page.getByText(/step 1 of 6/i);
    await expect(stepCounter).toBeVisible();
  });

  test('should validate email format on Step 1', async ({ page }) => {
    // Fill invalid email
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.fill('invalid-email');
    
    // Fill valid passwords
    const passwordInput = page.getByLabel(/^password/i);
    await passwordInput.fill('validpass123');
    
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await confirmPasswordInput.fill('validpass123');
    
    // Try to proceed
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Check for browser validation or custom validation
    const emailValidation = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(emailValidation).toBeTruthy();
  });

  test('should validate password match on Step 1', async ({ page }) => {
    // Fill valid email
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.fill('test@example.com');
    
    // Fill mismatched passwords
    const passwordInput = page.getByLabel(/^password/i);
    await passwordInput.fill('password123');
    
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await confirmPasswordInput.fill('different123');
    
    // Try to proceed
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Should show password mismatch error
    const errorToast = page.getByText(/passwords don't match/i);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('should validate password length on Step 1', async ({ page }) => {
    // Fill valid email
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.fill('test@example.com');
    
    // Fill short password
    const passwordInput = page.getByLabel(/^password/i);
    await passwordInput.fill('123');
    
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await confirmPasswordInput.fill('123');
    
    // Try to proceed
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Should show password length error
    const errorToast = page.getByText(/password too short/i);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('should proceed to Step 2 with valid Step 1 data', async ({ page }) => {
    // Fill valid Step 1 data
    await fillStep1ValidData(page);
    
    // Proceed to next step
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Should be on step 2
    const stepCounter = page.getByText(/step 2 of 6/i);
    await expect(stepCounter).toBeVisible();
    
    // Should show Personal Information step
    const stepHeading = page.getByRole('heading', { name: /personal information/i });
    await expect(stepHeading).toBeVisible();
  });

  test('should show Step 2: Personal Information form fields correctly', async ({ page }) => {
    // Navigate to step 2
    await fillStep1ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Check first name field
    const firstNameInput = page.getByLabel(/first name/i);
    await expect(firstNameInput).toBeVisible();
    await expect(firstNameInput).toHaveAttribute('required');
    
    // Check last name field
    const lastNameInput = page.getByLabel(/last name/i);
    await expect(lastNameInput).toBeVisible();
    await expect(lastNameInput).toHaveAttribute('required');
    
    // Check phone field (optional)
    const phoneInput = page.getByLabel(/phone number/i);
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute('type', 'tel');
    
    // Check date of birth field
    const dobInput = page.getByLabel(/date of birth/i);
    await expect(dobInput).toBeVisible();
    await expect(dobInput).toHaveAttribute('type', 'date');
    
    // Check pronouns field
    const pronounsField = page.getByLabel(/pronouns/i);
    await expect(pronounsField).toBeVisible();
    
    // Check Previous button is enabled
    const previousButton = page.getByRole('button', { name: /previous/i });
    await expect(previousButton).toBeEnabled();
  });

  test('should validate required fields on Step 2', async ({ page }) => {
    // Navigate to step 2
    await fillStep1ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Try to proceed without filling required fields
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Should show validation error
    const errorToast = page.getByText(/please provide your first and last name/i);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('should proceed to Step 3 with valid Step 2 data', async ({ page }) => {
    // Navigate through steps 1-2
    await fillStep1ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    await fillStep2ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Should be on step 3
    const stepCounter = page.getByText(/step 3 of 6/i);
    await expect(stepCounter).toBeVisible();
    
    // Should show Emergency Contact step
    const stepHeading = page.getByRole('heading', { name: /emergency contact/i });
    await expect(stepHeading).toBeVisible();
  });

  test('should show Step 3: Emergency Contact form fields correctly', async ({ page }) => {
    // Navigate to step 3
    await fillStep1ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    await fillStep2ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Check emergency contact notice
    const importantNotice = page.getByText(/this information is kept confidential/i);
    await expect(importantNotice).toBeVisible();
    
    // Check emergency contact name field
    const nameInput = page.getByLabel(/emergency contact name/i);
    await expect(nameInput).toBeVisible();
    
    // Check relationship field
    const relationshipInput = page.getByLabel(/relationship/i);
    await expect(relationshipInput).toBeVisible();
    
    // Check emergency contact phone field
    const phoneInput = page.getByLabel(/emergency contact phone/i);
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute('type', 'tel');
  });

  test('should proceed to Step 4 from Step 3', async ({ page }) => {
    // Navigate through steps 1-3
    await fillStep1ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    await fillStep2ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    await fillStep3ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Should be on step 4
    const stepCounter = page.getByText(/step 4 of 6/i);
    await expect(stepCounter).toBeVisible();
    
    // Should show Medical & Background step
    const stepHeading = page.getByRole('heading', { name: /medical.*background/i });
    await expect(stepHeading).toBeVisible();
  });

  test('should show Step 4: Medical & Background form fields correctly', async ({ page }) => {
    // Navigate to step 4
    await navigateToStep(page, 4);
    
    // Check medical conditions field
    const medicalInput = page.getByLabel(/medical conditions.*allergies/i);
    await expect(medicalInput).toBeVisible();
    
    // Check reference checkbox
    const referenceCheckbox = page.getByLabel(/willing to provide references/i);
    await expect(referenceCheckbox).toBeVisible();
    
    // Check how did you hear field
    const hearAboutField = page.getByLabel(/how did you hear about us/i);
    await expect(hearAboutField).toBeVisible();
  });

  test('should proceed to Step 5 from Step 4', async ({ page }) => {
    // Navigate through steps 1-4
    await navigateToStep(page, 4);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Should be on step 5
    const stepCounter = page.getByText(/step 5 of 6/i);
    await expect(stepCounter).toBeVisible();
    
    // Should show Availability step
    const stepHeading = page.getByRole('heading', { name: /availability/i });
    await expect(stepHeading).toBeVisible();
  });

  test('should show Step 5: Availability form fields correctly', async ({ page }) => {
    // Navigate to step 5
    await navigateToStep(page, 5);
    
    // Check days availability section
    const daysLabel = page.getByText(/days you're typically available/i);
    await expect(daysLabel).toBeVisible();
    
    // Check all day checkboxes
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of dayLabels) {
      const dayCheckbox = page.getByLabel(day);
      await expect(dayCheckbox).toBeVisible();
    }
    
    // Check locations section
    const locationsLabel = page.getByText(/locations where you can volunteer/i);
    await expect(locationsLabel).toBeVisible();
  });

  test('should allow selecting and deselecting availability days', async ({ page }) => {
    // Navigate to step 5
    await navigateToStep(page, 5);
    
    // Select Monday
    const mondayCheckbox = page.getByLabel('Monday');
    await mondayCheckbox.check();
    await expect(mondayCheckbox).toBeChecked();
    
    // Select Wednesday
    const wednesdayCheckbox = page.getByLabel('Wednesday');
    await wednesdayCheckbox.check();
    await expect(wednesdayCheckbox).toBeChecked();
    
    // Deselect Monday
    await mondayCheckbox.uncheck();
    await expect(mondayCheckbox).not.toBeChecked();
    await expect(wednesdayCheckbox).toBeChecked(); // Wednesday should still be checked
  });

  test('should proceed to Step 6 from Step 5', async ({ page }) => {
    // Navigate through steps 1-5
    await navigateToStep(page, 5);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Should be on step 6
    const stepCounter = page.getByText(/step 6 of 6/i);
    await expect(stepCounter).toBeVisible();
    
    // Should show Final Steps
    const stepHeading = page.getByRole('heading', { name: /final steps/i });
    await expect(stepHeading).toBeVisible();
  });

  test('should show Step 6: Final Steps form fields correctly', async ({ page }) => {
    // Navigate to step 6
    await navigateToStep(page, 6);
    
    // Check newsletter subscription checkbox
    const newsletterCheckbox = page.getByLabel(/subscribe to email newsletter/i);
    await expect(newsletterCheckbox).toBeVisible();
    
    // Check notification preference field
    const notificationField = page.getByLabel(/receive shift notifications by/i);
    await expect(notificationField).toBeVisible();
    
    // Check required agreements section
    const agreementsHeading = page.getByText(/required agreements/i);
    await expect(agreementsHeading).toBeVisible();
    
    // Check volunteer agreement checkbox
    const volunteerAgreementCheckbox = page.getByLabel(/volunteer agreement/i);
    await expect(volunteerAgreementCheckbox).toBeVisible();
    
    // Check health safety policy checkbox
    const healthSafetyCheckbox = page.getByLabel(/health and safety policy/i);
    await expect(healthSafetyCheckbox).toBeVisible();
    
    // Check Create Account button on final step
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await expect(createAccountButton).toBeVisible();
  });

  test('should validate required agreements on Step 6', async ({ page }) => {
    // Navigate to step 6
    await navigateToStep(page, 6);
    
    // Try to submit without accepting agreements
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await createAccountButton.click();
    
    // Should show validation error
    const errorToast = page.getByText(/please accept all required agreements/i);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('should open volunteer agreement dialog', async ({ page }) => {
    // Navigate to step 6
    await navigateToStep(page, 6);
    
    // Click volunteer agreement link
    const volunteerAgreementLink = page.getByRole('button', { name: /volunteer agreement/i });
    await volunteerAgreementLink.click();
    
    // Check dialog opens
    const dialogTitle = page.getByRole('heading', { name: /volunteer agreement/i });
    await expect(dialogTitle).toBeVisible();
    
    // Check dialog content loads
    const dialogContent = page.getByRole('dialog');
    await expect(dialogContent).toBeVisible();
  });

  test('should open health and safety policy dialog', async ({ page }) => {
    // Navigate to step 6
    await navigateToStep(page, 6);
    
    // Click health and safety policy link
    const healthSafetyLink = page.getByRole('button', { name: /health and safety policy/i });
    await healthSafetyLink.click();
    
    // Check dialog opens
    const dialogTitle = page.getByRole('heading', { name: /health and safety policy/i });
    await expect(dialogTitle).toBeVisible();
    
    // Check dialog content loads
    const dialogContent = page.getByRole('dialog');
    await expect(dialogContent).toBeVisible();
  });

  test('should navigate backwards through steps', async ({ page }) => {
    // Navigate to step 3
    await navigateToStep(page, 3);
    
    // Go back to step 2
    const previousButton = page.getByRole('button', { name: /previous/i });
    await previousButton.click();
    
    const step2Counter = page.getByText(/step 2 of 6/i);
    await expect(step2Counter).toBeVisible();
    
    // Go back to step 1
    await previousButton.click();
    
    const step1Counter = page.getByText(/step 1 of 6/i);
    await expect(step1Counter).toBeVisible();
    
    // Previous button should be disabled on step 1
    await expect(previousButton).toBeDisabled();
  });

  test('should preserve form data when navigating between steps', async ({ page }) => {
    const testEmail = 'test@example.com';
    const testFirstName = 'John';
    const testLastName = 'Doe';
    
    // Fill step 1
    await page.getByLabel(/email address/i).fill(testEmail);
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await page.getByRole('button', { name: /next/i }).click();
    
    // Fill step 2
    await page.getByLabel(/first name/i).fill(testFirstName);
    await page.getByLabel(/last name/i).fill(testLastName);
    await page.getByRole('button', { name: /next/i }).click();
    
    // Go back to step 1
    await page.getByRole('button', { name: /previous/i }).click();
    await page.getByRole('button', { name: /previous/i }).click();
    
    // Check data is preserved
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toHaveValue(testEmail);
    
    // Navigate forward to step 2
    await page.getByRole('button', { name: /next/i }).click();
    
    // Check step 2 data is preserved
    const firstNameInput = page.getByLabel(/first name/i);
    const lastNameInput = page.getByLabel(/last name/i);
    await expect(firstNameInput).toHaveValue(testFirstName);
    await expect(lastNameInput).toHaveValue(testLastName);
  });

  test('should show loading state during form submission', async ({ page }) => {
    // Navigate to final step and fill all required data
    await navigateToStep(page, 6);
    
    // Accept agreements
    const volunteerAgreementCheckbox = page.getByRole('checkbox').filter({ has: page.getByText(/volunteer agreement/i) });
    await volunteerAgreementCheckbox.check();
    
    const healthSafetyCheckbox = page.getByRole('checkbox').filter({ has: page.getByText(/health and safety policy/i) });
    await healthSafetyCheckbox.check();
    
    // Click create account button
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await createAccountButton.click();
    
    // Check for loading state
    const loadingButton = page.getByRole('button', { name: /creating account/i });
    const hasLoadingState = await loadingButton.isVisible().catch(() => false);
    
    if (hasLoadingState) {
      await expect(loadingButton).toBeDisabled();
    }
  });

  test('should handle duplicate email error', async ({ page }) => {
    // Navigate to final step and fill with existing email
    await fillCompleteRegistrationForm(page, 'volunteer@example.com'); // This email should exist in test data
    
    // Submit form
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await createAccountButton.click();
    
    // Should show error message
    const errorToast = page.getByText(/email already exists|already registered/i);
    await expect(errorToast).toBeVisible({ timeout: 10000 });
  });

  test('should successfully complete registration with unique email', async ({ page }) => {
    const uniqueEmail = `test.user.${Date.now()}@example.com`;
    
    // Fill complete registration form
    await fillCompleteRegistrationForm(page, uniqueEmail);
    
    // Submit form
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await createAccountButton.click();
    
    // Should show success message or redirect to login
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000 });
    
    // Check for success message on login page
    const successMessage = page.getByText(/registration successful|welcome to everybody eats/i);
    if (await successMessage.isVisible()) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('should navigate to login page when clicking login link', async ({ page }) => {
    // Click login link
    const loginLink = page.getByRole('link', { name: /already have an account/i });
    await loginLink.click();
    
    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Check login page loaded
    const loginHeading = page.getByRole('heading', { name: /welcome back/i });
    await expect(loginHeading).toBeVisible();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Check initial focus
    await page.keyboard.press('Tab');
    
    // Should be able to tab through form elements
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    const passwordInput = page.getByLabel(/^password/i);
    await expect(passwordInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await expect(confirmPasswordInput).toBeFocused();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check page still displays correctly
    const heading = page.getByRole('heading', { name: /join everybody eats/i });
    await expect(heading).toBeVisible();
    
    // Check form elements are accessible
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toBeVisible();
    
    // Check navigation buttons are accessible
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
  });
});

// Helper functions
async function fillStep1ValidData(page: any) {
  await page.getByLabel(/email address/i).fill('test@example.com');
  await page.getByLabel(/^password/i).fill('password123');
  await page.getByLabel(/confirm password/i).fill('password123');
}

async function fillStep2ValidData(page: any) {
  await page.getByLabel(/first name/i).fill('John');
  await page.getByLabel(/last name/i).fill('Doe');
  await page.getByLabel(/phone number/i).fill('(555) 123-4567');
}

async function fillStep3ValidData(page: any) {
  await page.getByLabel(/emergency contact name/i).fill('Jane Doe');
  await page.getByLabel(/relationship/i).fill('Spouse');
  await page.getByLabel(/emergency contact phone/i).fill('(555) 987-6543');
}

async function navigateToStep(page: any, stepNumber: number) {
  // Navigate through steps sequentially
  await fillStep1ValidData(page);
  await page.getByRole('button', { name: /next/i }).click();
  
  if (stepNumber >= 3) {
    await fillStep2ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
  }
  
  if (stepNumber >= 4) {
    await fillStep3ValidData(page);
    await page.getByRole('button', { name: /next/i }).click();
  }
  
  if (stepNumber >= 5) {
    await page.getByRole('button', { name: /next/i }).click();
  }
  
  if (stepNumber >= 6) {
    await page.getByRole('button', { name: /next/i }).click();
  }
}

async function fillCompleteRegistrationForm(page: any, email: string) {
  // Step 1: Account
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password/i).fill('password123');
  await page.getByLabel(/confirm password/i).fill('password123');
  await page.getByRole('button', { name: /next/i }).click();
  
  // Step 2: Personal Info
  await page.getByLabel(/first name/i).fill('Test');
  await page.getByLabel(/last name/i).fill('User');
  await page.getByLabel(/phone number/i).fill('(555) 123-4567');
  await page.getByRole('button', { name: /next/i }).click();
  
  // Step 3: Emergency Contact
  await page.getByLabel(/emergency contact name/i).fill('Emergency Contact');
  await page.getByLabel(/relationship/i).fill('Friend');
  await page.getByLabel(/emergency contact phone/i).fill('(555) 987-6543');
  await page.getByRole('button', { name: /next/i }).click();
  
  // Step 4: Medical & Background
  await page.getByRole('button', { name: /next/i }).click();
  
  // Step 5: Availability
  await page.getByRole('button', { name: /next/i }).click();
  
  // Step 6: Final Steps
  const volunteerAgreementCheckbox = page.getByRole('checkbox').filter({ has: page.getByText(/volunteer agreement/i) });
  await volunteerAgreementCheckbox.check();
  
  const healthSafetyCheckbox = page.getByRole('checkbox').filter({ has: page.getByText(/health and safety policy/i) });
  await healthSafetyCheckbox.check();
}