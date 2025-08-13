import { test, expect } from './base';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with all elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Volunteer Portal/);
    
    // Check main heading
    const heading = page.getByRole('heading', { name: /Welcome back/i });
    await expect(heading).toBeVisible();
    
    // Check description
    const description = page.getByText(/Sign in to your volunteer account/i);
    await expect(description).toBeVisible();
    
    // Check email input field
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    // Should have demo email pre-filled
    await expect(emailInput).toHaveValue('volunteer@example.com');
    
    // Check password input field
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    // Should have demo password pre-filled
    await expect(passwordInput).toHaveValue('volunteer123');
    
    // Check submit button
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    await expect(submitButton).toBeVisible();
    
    // Check register link
    const registerLink = page.getByRole('link', { name: /create volunteer account/i });
    await expect(registerLink).toBeVisible();
    
    // Check demo login buttons
    const volunteerLoginButton = page.getByRole('button', { name: /login as volunteer/i });
    await expect(volunteerLoginButton).toBeVisible();
    
    const adminLoginButton = page.getByRole('button', { name: /login as admin/i });
    await expect(adminLoginButton).toBeVisible();
    
    // Check OAuth buttons (they may or may not exist depending on configuration)
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    if (await googleButton.count() > 0) {
      await expect(googleButton).toBeVisible();
    }
    
    const facebookButton = page.getByRole('button', { name: /continue with facebook/i });
    if (await facebookButton.count() > 0) {
      await expect(facebookButton).toBeVisible();
    }
    
    const appleButton = page.getByRole('button', { name: /continue with apple/i });
    if (await appleButton.count() > 0) {
      await expect(appleButton).toBeVisible();
    }
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Clear the pre-filled values
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.clear();
    
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.clear();
    
    // Click submit without filling form
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    await submitButton.click();
    
    // Check for validation messages (browser native or custom)
    const emailError = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(emailError).toBeTruthy();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    // Enter invalid email
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.clear();
    await emailInput.fill('invalid-email');
    
    // Enter valid password
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.clear();
    await passwordInput.fill('ValidPassword123!');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    await submitButton.click();
    
    // Check for email validation error
    const emailError = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(emailError).toContain('@');
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.clear();
    await emailInput.fill('nonexistent@example.com');
    
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.clear();
    await passwordInput.fill('WrongPassword123!');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    await submitButton.click();
    
    // Wait for error message
    const errorMessage = page.getByText(/invalid credentials/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to register page when clicking register link', async ({ page }) => {
    // Click register link
    const registerLink = page.getByRole('link', { name: /create volunteer account/i });
    await registerLink.click();
    
    // Check navigation to register page
    await expect(page).toHaveURL(/\/register/);
    
    // Verify register page loaded - look for the main heading
    const registerHeading = page.getByRole('heading', { name: /join everybody eats/i }).first();
    await expect(registerHeading).toBeVisible();
  });

  test('should successfully login with demo credentials', async ({ page }) => {
    // The form is pre-filled with demo credentials
    // Just submit the form
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    await submitButton.click();
    
    // Wait for navigation away from login page
    await page.waitForURL((url) => {
      return url.pathname !== '/login';
    }, { timeout: 10000 });
    
    // Verify we're on dashboard or home page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should login using quick login button for volunteer', async ({ page }) => {
    // Click the quick login button for volunteer
    const volunteerLoginButton = page.getByRole('button', { name: /login as volunteer/i });
    await volunteerLoginButton.click();
    
    // Wait for navigation away from login page
    await page.waitForURL((url) => {
      return url.pathname !== '/login';
    }, { timeout: 10000 });
    
    // Verify we're logged in
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should login using quick login button for admin', async ({ page }) => {
    // Click the quick login button for admin
    const adminLoginButton = page.getByRole('button', { name: /login as admin/i });
    await adminLoginButton.click();
    
    // Wait for navigation away from login page
    await page.waitForURL((url) => {
      return url.pathname !== '/login';
    }, { timeout: 10000 });
    
    // Verify we're logged in
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should have password field as type password', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    
    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should preserve form data on validation error', async ({ page }) => {
    const emailValue = 'test@example.com';
    
    // Enter email but clear password
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.clear();
    await emailInput.fill(emailValue);
    
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.clear();
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    await submitButton.click();
    
    // Email should still be in the input
    await expect(emailInput).toHaveValue(emailValue);
  });

  test('should verify OAuth buttons exist if configured', async ({ page }) => {
    // Check if OAuth buttons exist (they're optional based on configuration)
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    const facebookButton = page.getByRole('button', { name: /continue with facebook/i });
    const appleButton = page.getByRole('button', { name: /continue with apple/i });
    
    // Count OAuth providers
    const oauthButtonCount = await googleButton.count() + await facebookButton.count() + await appleButton.count();
    
    if (oauthButtonCount > 0) {
      // If OAuth is configured, check the divider text exists
      const dividerText = page.getByText(/or continue with email/i);
      await expect(dividerText).toBeVisible();
    }
  });

  test('should be accessible', async ({ page }) => {
    // Check form exists
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // Check inputs have associated labels
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    
    // Check button has accessible name
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    await expect(submitButton).toBeVisible();
    
    // Check for focus management
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    
    // Tab to next element
    await page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
    
    // Tab to submit button
    await page.keyboard.press('Tab');
    const submitButtonFocus = page.getByRole('button', { name: /sign in with email/i });
    await expect(submitButtonFocus).toBeFocused();
  });

  test('should handle loading state during login', async ({ page }) => {
    // Use the pre-filled demo credentials
    const submitButton = page.getByRole('button', { name: /sign in with email/i });
    
    // Click and immediately check for loading state
    await submitButton.click();
    
    // The button should show "Signing in..." during loading
    const loadingButton = page.getByRole('button', { name: /signing in/i });
    
    // Check if loading state is shown (it might be very quick)
    const hasLoadingState = await loadingButton.isVisible().catch(() => false);
    
    if (hasLoadingState) {
      // Verify the button is disabled during loading
      await expect(loadingButton).toBeDisabled();
    }
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
  });
});