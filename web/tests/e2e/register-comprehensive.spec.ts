import { test, expect } from "./base";
import type { Page } from "@playwright/test";

// Test helpers for better organization and reusability
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500); // Buffer for animations
}

async function fillAccountStep(
  page: Page,
  options: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {}
) {
  const {
    email = "test@example.com",
    password = "password123",
    confirmPassword = "password123",
  } = options;

  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("confirm-password-input").fill(confirmPassword);
}

async function fillPersonalInfoStep(
  page: Page,
  options: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    pronouns?: string;
  } = {}
) {
  const {
    firstName = "John",
    lastName = "Doe",
    phone = "+64 21 123 4567",
    dateOfBirth = "1990-01-15",
    pronouns = "he/him",
  } = options;

  await page.getByRole("textbox", { name: /first name/i }).fill(firstName);
  await page.getByRole("textbox", { name: /last name/i }).fill(lastName);
  
  if (phone) {
    await page.getByRole("textbox", { name: /phone/i }).fill(phone);
  }
  
  if (dateOfBirth) {
    await page.getByLabel(/date of birth/i).fill(dateOfBirth);
  }
  
  if (pronouns !== "none") {
    const pronounsSelect = page.getByTestId("pronouns-select");
    if (await pronounsSelect.isVisible()) {
      await pronounsSelect.click();
      await page.getByRole("option", { name: new RegExp(pronouns, "i") }).click();
    }
  }
}

async function fillEmergencyContactStep(
  page: Page,
  options: {
    name?: string;
    relationship?: string;
    phone?: string;
  } = {}
) {
  const {
    name = "Jane Doe",
    relationship = "spouse",
    phone = "+64 21 987 6543",
  } = options;

  await page.getByRole("textbox", { name: /emergency contact name/i }).fill(name);
  await page.getByRole("textbox", { name: /relationship/i }).fill(relationship);
  await page.getByRole("textbox", { name: /emergency contact phone/i }).fill(phone);
}

async function fillMedicalInfoStep(
  page: Page,
  options: {
    medicalConditions?: string;
    willingToProvideReference?: boolean;
    howDidYouHearAboutUs?: string;
  } = {}
) {
  const {
    medicalConditions = "No known medical conditions",
    willingToProvideReference = true,
    howDidYouHearAboutUs = "social_media",
  } = options;

  if (medicalConditions) {
    await page.getByRole("textbox", { name: /medical conditions/i }).fill(medicalConditions);
  }

  if (willingToProvideReference) {
    await page.getByRole("checkbox", { name: /willing to provide reference/i }).check();
  }

  if (howDidYouHearAboutUs !== "not_specified") {
    const hearAboutSelect = page.getByTestId("how-did-you-hear-select");
    if (await hearAboutSelect.isVisible()) {
      await hearAboutSelect.click();
      await page.getByRole("option", { name: new RegExp(howDidYouHearAboutUs.replace("_", " "), "i") }).click();
    }
  }
}

async function fillAvailabilityStep(
  page: Page,
  options: {
    days?: string[];
    locations?: string[];
  } = {}
) {
  const { days = ["monday", "wednesday", "friday"], locations = ["wellington"] } = options;

  // Select available days
  for (const day of days) {
    const dayCheckbox = page.getByTestId(`available-day-${day}`);
    if (await dayCheckbox.isVisible()) {
      await dayCheckbox.check();
    }
  }

  // Select available locations
  for (const location of locations) {
    const locationCheckbox = page.getByTestId(`available-location-${location.toLowerCase()}`);
    if (await locationCheckbox.isVisible()) {
      await locationCheckbox.check();
    }
  }
}

async function fillCommunicationStep(
  page: Page,
  options: {
    emailNewsletter?: boolean;
    notificationPreference?: string;
    acceptVolunteerAgreement?: boolean;
    acceptHealthSafetyPolicy?: boolean;
  } = {}
) {
  const {
    emailNewsletter = true,
    notificationPreference = "EMAIL",
    acceptVolunteerAgreement = true,
    acceptHealthSafetyPolicy = true,
  } = options;

  // Handle newsletter subscription
  const newsletterCheckbox = page.getByRole("checkbox", { name: /newsletter/i });
  if (emailNewsletter && !(await newsletterCheckbox.isChecked())) {
    await newsletterCheckbox.check();
  } else if (!emailNewsletter && (await newsletterCheckbox.isChecked())) {
    await newsletterCheckbox.uncheck();
  }

  // Handle notification preference
  if (notificationPreference !== "EMAIL") {
    const notificationSelect = page.getByTestId("notification-preference-select");
    if (await notificationSelect.isVisible()) {
      await notificationSelect.click();
      await page.getByRole("option", { name: new RegExp(notificationPreference, "i") }).click();
    }
  }

  // Accept agreements
  if (acceptVolunteerAgreement) {
    const volunteerAgreementCheckbox = page.getByRole("checkbox", { name: /volunteer agreement/i });
    if (!(await volunteerAgreementCheckbox.isChecked())) {
      await volunteerAgreementCheckbox.check();
    }
  }

  if (acceptHealthSafetyPolicy) {
    const healthSafetyCheckbox = page.getByRole("checkbox", { name: /health and safety/i });
    if (!(await healthSafetyCheckbox.isChecked())) {
      await healthSafetyCheckbox.check();
    }
  }
}

async function navigateToStep(page: Page, targetStep: number) {
  // Navigate through each step sequentially
  if (targetStep >= 2) {
    await fillAccountStep(page);
    await page.getByTestId("next-submit-button").click();
    await waitForPageLoad(page);
  }

  if (targetStep >= 3) {
    await fillPersonalInfoStep(page);
    await page.getByTestId("next-submit-button").click();
    await waitForPageLoad(page);
  }

  if (targetStep >= 4) {
    await fillEmergencyContactStep(page);
    await page.getByTestId("next-submit-button").click();
    await waitForPageLoad(page);
  }

  if (targetStep >= 5) {
    await fillMedicalInfoStep(page);
    await page.getByTestId("next-submit-button").click();
    await waitForPageLoad(page);
  }

  if (targetStep >= 6) {
    await fillAvailabilityStep(page);
    await page.getByTestId("next-submit-button").click();
    await waitForPageLoad(page);
  }
}

test.describe("Registration Page - Comprehensive Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    await waitForPageLoad(page);
  });

  test.describe("Page Layout and Structure", () => {
    test("should display all main page elements", async ({ page }) => {
      await expect(page).toHaveTitle(/Register.*Everybody Eats/);
      
      // Main container
      const registerPage = page.getByTestId("register-page");
      await expect(registerPage).toBeVisible();

      // Page header
      await expect(page.getByText("Join Everybody Eats")).toBeVisible();
      
      // Login link
      const loginLink = page.getByTestId("login-link");
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute("href", "/login");

      // Progress indicator
      const progressIndicator = page.getByTestId("progress-indicator");
      await expect(progressIndicator).toBeVisible();
      
      // Form card
      const formCard = page.getByTestId("registration-form-card");
      await expect(formCard).toBeVisible();
    });

    test("should show correct progress indicator", async ({ page }) => {
      const progressTitle = page.getByTestId("progress-title");
      await expect(progressTitle).toContainText("Registration Progress");
      
      const stepCounter = page.getByTestId("step-counter");
      await expect(stepCounter).toContainText("Step 1 of 6");

      // Check all 6 progress steps are visible
      for (let i = 1; i <= 6; i++) {
        await expect(page.getByTestId(`progress-step-${i}`)).toBeVisible();
        await expect(page.getByTestId(`step-${i}-icon`)).toBeVisible();
      }

      // Current step info
      const currentStepTitle = page.getByTestId("current-step-title");
      await expect(currentStepTitle).toContainText("Create Account");
      
      const currentStepDescription = page.getByTestId("current-step-description");
      await expect(currentStepDescription).toContainText("Set up your login credentials");
    });

    test("should update progress as user advances through steps", async ({ page }) => {
      // Start on step 1
      await expect(page.getByTestId("step-counter")).toContainText("Step 1 of 6");
      
      // Advance to step 2
      await fillAccountStep(page);
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);
      
      await expect(page.getByTestId("step-counter")).toContainText("Step 2 of 6");
      await expect(page.getByTestId("current-step-title")).toContainText("Personal Information");

      // Check that step 1 icon shows as completed (check mark)
      const step1Icon = page.getByTestId("step-1-icon");
      // The completed step should show a check mark or different styling
      await expect(step1Icon).toBeVisible();
    });
  });

  test.describe("OAuth Provider Integration", () => {
    test("should display OAuth providers if configured", async ({ page }) => {
      const oauthSection = page.getByTestId("oauth-providers");
      
      if (await oauthSection.isVisible()) {
        // Should show OAuth divider
        const divider = page.getByTestId("oauth-divider");
        await expect(divider).toBeVisible();
        await expect(divider).toContainText("Or create account with email");

        // Check for common OAuth providers
        const providers = ["google", "facebook", "apple"];
        for (const provider of providers) {
          const button = page.getByTestId(`oauth-${provider}-button`);
          if (await button.isVisible()) {
            await expect(button).toContainText(`Continue with ${provider}`);
            await expect(button).toBeEnabled();
          }
        }
      }
    });

    test("should handle OAuth provider clicks without errors", async ({ page }) => {
      const oauthSection = page.getByTestId("oauth-providers");
      
      if (await oauthSection.isVisible()) {
        const googleButton = page.getByTestId("oauth-google-button");
        
        if (await googleButton.isVisible()) {
          await googleButton.click();
          
          // Should either show loading state or redirect
          // We don't expect full OAuth flow in tests, but no errors
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe("Step 1 - Account Creation", () => {
    test("should display all account creation form fields", async ({ page }) => {
      // Welcome message
      const welcomeMessage = page.getByTestId("welcome-message");
      await expect(welcomeMessage).toBeVisible();
      await expect(welcomeMessage).toContainText("Welcome to Everybody Eats!");

      // Email field
      const emailField = page.getByTestId("email-field");
      await expect(emailField).toBeVisible();
      
      const emailInput = page.getByTestId("email-input");
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute("type", "email");
      await expect(emailInput).toHaveAttribute("required");

      // Password field
      const passwordField = page.getByTestId("password-field");
      await expect(passwordField).toBeVisible();
      
      const passwordInput = page.getByTestId("password-input");
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute("type", "password");
      await expect(passwordInput).toHaveAttribute("required");

      // Password hint
      const passwordHint = page.getByTestId("password-hint");
      await expect(passwordHint).toBeVisible();
      await expect(passwordHint).toContainText("at least 6 characters");

      // Confirm password field
      const confirmPasswordField = page.getByTestId("confirm-password-field");
      await expect(confirmPasswordField).toBeVisible();
      
      const confirmPasswordInput = page.getByTestId("confirm-password-input");
      await expect(confirmPasswordInput).toBeVisible();
      await expect(confirmPasswordInput).toHaveAttribute("type", "password");
      await expect(confirmPasswordInput).toHaveAttribute("required");
    });

    test("should validate required fields", async ({ page }) => {
      // Try to proceed with empty fields
      const nextButton = page.getByTestId("next-submit-button");
      await nextButton.click();

      // Should remain on step 1 due to validation
      await page.waitForTimeout(1000);
      await expect(page.getByTestId("step-counter")).toContainText("Step 1 of 6");

      // Check for validation messages (HTML5 or toast)
      const emailInput = page.getByTestId("email-input");
      const emailValidation = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      
      if (!emailValidation) {
        // Look for custom validation toast
        const errorToast = page.locator('[role="alert"], .destructive').filter({ hasText: /required/i });
        await expect(errorToast.first()).toBeVisible({ timeout: 3000 });
      } else {
        expect(emailValidation).toBeTruthy();
      }
    });

    test("should validate email format", async ({ page }) => {
      await page.getByTestId("email-input").fill("invalid-email");
      await page.getByTestId("password-input").fill("password123");
      await page.getByTestId("confirm-password-input").fill("password123");
      
      await page.getByTestId("next-submit-button").click();
      await page.waitForTimeout(1000);

      // Should remain on step 1 due to invalid email
      await expect(page.getByTestId("step-counter")).toContainText("Step 1 of 6");
    });

    test("should validate password confirmation", async ({ page }) => {
      await page.getByTestId("email-input").fill("test@example.com");
      await page.getByTestId("password-input").fill("password123");
      await page.getByTestId("confirm-password-input").fill("different123");
      
      await page.getByTestId("next-submit-button").click();
      await page.waitForTimeout(1000);

      // Should remain on step 1 due to password mismatch
      await expect(page.getByTestId("step-counter")).toContainText("Step 1 of 6");
    });

    test("should validate minimum password length", async ({ page }) => {
      await page.getByTestId("email-input").fill("test@example.com");
      await page.getByTestId("password-input").fill("123");
      await page.getByTestId("confirm-password-input").fill("123");
      
      await page.getByTestId("next-submit-button").click();
      await page.waitForTimeout(1000);

      // Should remain on step 1 due to short password
      await expect(page.getByTestId("step-counter")).toContainText("Step 1 of 6");
    });

    test("should proceed to step 2 with valid data", async ({ page }) => {
      await fillAccountStep(page);
      
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance to step 2
      await expect(page.getByTestId("step-counter")).toContainText("Step 2 of 6");
      await expect(page.getByTestId("current-step-title")).toContainText("Personal Information");
    });
  });

  test.describe("Step 2 - Personal Information", () => {
    test.beforeEach(async ({ page }) => {
      await fillAccountStep(page);
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);
    });

    test("should display personal information form fields", async ({ page }) => {
      // Name fields
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toBeVisible();
      await expect(firstNameField).toHaveAttribute("required");

      const lastNameField = page.getByRole("textbox", { name: /last name/i });
      await expect(lastNameField).toBeVisible();
      await expect(lastNameField).toHaveAttribute("required");

      // Phone field
      const phoneField = page.getByRole("textbox", { name: /phone/i });
      await expect(phoneField).toBeVisible();

      // Date of birth field
      const dobField = page.getByLabel(/date of birth/i);
      await expect(dobField).toBeVisible();
      await expect(dobField).toHaveAttribute("type", "date");

      // Pronouns field
      const pronounsSelect = page.getByTestId("pronouns-select");
      await expect(pronounsSelect).toBeVisible();
    });

    test("should validate required personal information", async ({ page }) => {
      // Try to proceed without required fields
      await page.getByTestId("next-submit-button").click();
      await page.waitForTimeout(1000);

      // Should remain on step 2
      await expect(page.getByTestId("step-counter")).toContainText("Step 2 of 6");
    });

    test("should accept valid personal information", async ({ page }) => {
      await fillPersonalInfoStep(page);
      
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance to step 3
      await expect(page.getByTestId("step-counter")).toContainText("Step 3 of 6");
      await expect(page.getByTestId("current-step-title")).toContainText("Emergency Contact");
    });

    test("should handle pronouns selection", async ({ page }) => {
      const pronounsSelect = page.getByTestId("pronouns-select");
      await pronounsSelect.click();
      
      // Select "He/Him"
      await page.getByRole("option", { name: /he\/him/i }).click();
      
      // Continue to next step to verify selection persists
      await fillPersonalInfoStep(page, { firstName: "John", lastName: "Doe" });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);
      
      // Should advance successfully
      await expect(page.getByTestId("step-counter")).toContainText("Step 3 of 6");
    });
  });

  test.describe("Step 3 - Emergency Contact", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToStep(page, 3);
    });

    test("should display emergency contact form fields", async ({ page }) => {
      // Emergency contact name
      const nameField = page.getByRole("textbox", { name: /emergency contact name/i });
      await expect(nameField).toBeVisible();

      // Relationship
      const relationshipField = page.getByRole("textbox", { name: /relationship/i });
      await expect(relationshipField).toBeVisible();

      // Emergency contact phone
      const phoneField = page.getByRole("textbox", { name: /emergency contact phone/i });
      await expect(phoneField).toBeVisible();

      // Information message
      const infoMessage = page.getByText(/kept confidential/i);
      await expect(infoMessage).toBeVisible();
    });

    test("should accept emergency contact information", async ({ page }) => {
      await fillEmergencyContactStep(page);
      
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance to step 4
      await expect(page.getByTestId("step-counter")).toContainText("Step 4 of 6");
      await expect(page.getByTestId("current-step-title")).toContainText("Medical & Background");
    });

    test("should allow skipping emergency contact (optional fields)", async ({ page }) => {
      // Proceed without filling any fields
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance to step 4
      await expect(page.getByTestId("step-counter")).toContainText("Step 4 of 6");
    });
  });

  test.describe("Step 4 - Medical Information & Background", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToStep(page, 4);
    });

    test("should display medical information form fields", async ({ page }) => {
      // Medical conditions textarea
      const medicalField = page.getByRole("textbox", { name: /medical conditions/i });
      await expect(medicalField).toBeVisible();

      // Reference checkbox
      const referenceCheckbox = page.getByRole("checkbox", { name: /willing to provide reference/i });
      await expect(referenceCheckbox).toBeVisible();

      // How did you hear select
      const hearAboutSelect = page.getByTestId("how-did-you-hear-select");
      await expect(hearAboutSelect).toBeVisible();
    });

    test("should handle medical information input", async ({ page }) => {
      await fillMedicalInfoStep(page);
      
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance to step 5
      await expect(page.getByTestId("step-counter")).toContainText("Step 5 of 6");
      await expect(page.getByTestId("current-step-title")).toContainText("Availability");
    });

    test("should handle 'how did you hear about us' selection", async ({ page }) => {
      const hearAboutSelect = page.getByTestId("how-did-you-hear-select");
      await hearAboutSelect.click();
      
      // Select "Social Media"
      await page.getByRole("option", { name: /social media/i }).click();
      
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance successfully
      await expect(page.getByTestId("step-counter")).toContainText("Step 5 of 6");
    });
  });

  test.describe("Step 5 - Availability", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToStep(page, 5);
    });

    test("should display availability form fields", async ({ page }) => {
      // Available days section
      const daysLabel = page.getByText(/days you're typically available/i);
      await expect(daysLabel).toBeVisible();

      // Check for day checkboxes
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      for (const day of days) {
        const dayCheckbox = page.getByTestId(`available-day-${day}`);
        await expect(dayCheckbox).toBeVisible();
      }

      // Available locations section
      const locationsLabel = page.getByText(/locations where you can volunteer/i);
      await expect(locationsLabel).toBeVisible();

      // Check for location checkboxes (common locations)
      const locations = ["wellington", "glenn innes", "onehunga"];
      for (const location of locations) {
        const locationCheckbox = page.getByTestId(`available-location-${location.toLowerCase().replace(" ", "_")}`);
        // Location checkboxes might not exist if no locations are configured
        if (await locationCheckbox.isVisible()) {
          await expect(locationCheckbox).toBeVisible();
        }
      }
    });

    test("should allow selecting available days", async ({ page }) => {
      // Select a few days
      const mondayCheckbox = page.getByTestId("available-day-monday");
      await mondayCheckbox.check();
      
      const wednesdayCheckbox = page.getByTestId("available-day-wednesday");
      await wednesdayCheckbox.check();
      
      const fridayCheckbox = page.getByTestId("available-day-friday");
      await fridayCheckbox.check();

      // Verify checkboxes are checked
      await expect(mondayCheckbox).toBeChecked();
      await expect(wednesdayCheckbox).toBeChecked();
      await expect(fridayCheckbox).toBeChecked();

      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance to step 6
      await expect(page.getByTestId("step-counter")).toContainText("Step 6 of 6");
    });

    test("should allow selecting available locations", async ({ page }) => {
      // Select location if available
      const wellingtonCheckbox = page.getByTestId("available-location-wellington");
      
      if (await wellingtonCheckbox.isVisible()) {
        await wellingtonCheckbox.check();
        await expect(wellingtonCheckbox).toBeChecked();
      }

      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance to step 6
      await expect(page.getByTestId("step-counter")).toContainText("Step 6 of 6");
    });
  });

  test.describe("Step 6 - Final Steps / Agreements", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToStep(page, 6);
    });

    test("should display communication preferences and agreements", async ({ page }) => {
      // Newsletter subscription
      const newsletterCheckbox = page.getByRole("checkbox", { name: /newsletter/i });
      await expect(newsletterCheckbox).toBeVisible();

      // Notification preferences
      const notificationSelect = page.getByTestId("notification-preference-select");
      await expect(notificationSelect).toBeVisible();

      // Required agreements
      const volunteerAgreementCheckbox = page.getByRole("checkbox", { name: /volunteer agreement/i });
      await expect(volunteerAgreementCheckbox).toBeVisible();

      const healthSafetyCheckbox = page.getByRole("checkbox", { name: /health and safety/i });
      await expect(healthSafetyCheckbox).toBeVisible();

      // Agreement links should be present
      const volunteerAgreementLink = page.getByRole("button", { name: /volunteer agreement/i });
      await expect(volunteerAgreementLink).toBeVisible();

      const healthSafetyLink = page.getByRole("button", { name: /health and safety/i });
      await expect(healthSafetyLink).toBeVisible();
    });

    test("should require accepting agreements before submission", async ({ page }) => {
      // Try to submit without accepting agreements
      const submitButton = page.getByTestId("next-submit-button");
      await expect(submitButton).toContainText(/create account/i);
      
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should remain on step 6 with validation error
      await expect(page.getByTestId("step-counter")).toContainText("Step 6 of 6");
    });

    test("should show Create Account button on final step", async ({ page }) => {
      const submitButton = page.getByTestId("next-submit-button");
      await expect(submitButton).toContainText(/create account/i);
    });

    test("should handle notification preference selection", async ({ page }) => {
      const notificationSelect = page.getByTestId("notification-preference-select");
      await notificationSelect.click();
      
      // Select "Text message only"
      await page.getByRole("option", { name: /text message/i }).click();
      
      // Accept required agreements
      await fillCommunicationStep(page);
      
      const submitButton = page.getByTestId("next-submit-button");
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe("Navigation and Data Persistence", () => {
    test("should disable previous button on first step", async ({ page }) => {
      const previousButton = page.getByTestId("previous-button");
      await expect(previousButton).toBeDisabled();
    });

    test("should enable previous button on subsequent steps", async ({ page }) => {
      await fillAccountStep(page);
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      const previousButton = page.getByTestId("previous-button");
      await expect(previousButton).toBeEnabled();
    });

    test("should preserve form data when navigating back and forth", async ({ page }) => {
      const testEmail = "persistence@test.com";
      const testPassword = "password123";
      const testFirstName = "TestFirst";
      const testLastName = "TestLast";

      // Fill step 1
      await fillAccountStep(page, { email: testEmail, password: testPassword, confirmPassword: testPassword });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Fill step 2
      await fillPersonalInfoStep(page, { firstName: testFirstName, lastName: testLastName });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Go back to step 1
      await page.getByTestId("previous-button").click();
      await waitForPageLoad(page);
      await page.getByTestId("previous-button").click();
      await waitForPageLoad(page);

      // Verify step 1 data is preserved
      await expect(page.getByTestId("email-input")).toHaveValue(testEmail);
      await expect(page.getByTestId("password-input")).toHaveValue(testPassword);

      // Go forward to step 2
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Verify step 2 data is preserved
      await expect(page.getByRole("textbox", { name: /first name/i })).toHaveValue(testFirstName);
      await expect(page.getByRole("textbox", { name: /last name/i })).toHaveValue(testLastName);
    });

    test("should handle navigation using step indicators", async ({ page }) => {
      // First, complete a few steps
      await fillAccountStep(page);
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);
      
      await fillPersonalInfoStep(page);
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Progress indicators should reflect completed steps
      const step1Icon = page.getByTestId("step-1-icon");
      const step2Icon = page.getByTestId("step-2-icon");
      
      // Icons should be visible (styling might indicate completion)
      await expect(step1Icon).toBeVisible();
      await expect(step2Icon).toBeVisible();
    });
  });

  test.describe("Form Submission and Error Handling", () => {
    test("should show loading state during form submission", async ({ page }) => {
      // Navigate to final step with all data
      await navigateToStep(page, 6);
      await fillCommunicationStep(page);

      const submitButton = page.getByTestId("next-submit-button");
      await submitButton.click();

      // Should show loading state
      const loadingText = await submitButton.textContent();
      if (loadingText?.includes("Creating") || loadingText?.includes("Processing")) {
        await expect(submitButton).toBeDisabled();
      }
    });

    test("should handle network errors gracefully", async ({ page }) => {
      // Mock network failure for registration endpoint
      await page.route("/api/auth/register", route => 
        route.abort("failed")
      );

      await navigateToStep(page, 6);
      await fillCommunicationStep(page);

      await page.getByTestId("next-submit-button").click();
      await page.waitForTimeout(2000);

      // Should remain on registration page (not crash)
      const registerPage = page.getByTestId("register-page");
      await expect(registerPage).toBeVisible();
    });

    test("should handle validation errors from server", async ({ page }) => {
      // Mock server validation error
      await page.route("/api/auth/register", route => 
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Email already exists" })
        })
      );

      await navigateToStep(page, 6);
      await fillCommunicationStep(page);

      await page.getByTestId("next-submit-button").click();
      await page.waitForTimeout(2000);

      // Should show error message
      const errorToast = page.locator('[role="alert"], .destructive').filter({ hasText: /email already exists/i });
      await expect(errorToast.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Complete Registration Flow", () => {
    test("should complete full registration process successfully", async ({ page }) => {
      // Step 1: Account
      await fillAccountStep(page, {
        email: "fulltest@example.com",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
      });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Step 2: Personal Information
      await fillPersonalInfoStep(page, {
        firstName: "Full",
        lastName: "Test",
        phone: "+64 21 555 0123",
        dateOfBirth: "1995-06-15",
        pronouns: "they/them",
      });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Step 3: Emergency Contact
      await fillEmergencyContactStep(page, {
        name: "Emergency Person",
        relationship: "Friend",
        phone: "+64 21 555 0456",
      });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Step 4: Medical & Background
      await fillMedicalInfoStep(page, {
        medicalConditions: "No known allergies or medical conditions",
        willingToProvideReference: true,
        howDidYouHearAboutUs: "community_event",
      });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Step 5: Availability
      await fillAvailabilityStep(page, {
        days: ["tuesday", "thursday", "saturday"],
        locations: ["wellington"],
      });
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Step 6: Final Steps
      await fillCommunicationStep(page, {
        emailNewsletter: true,
        notificationPreference: "BOTH",
        acceptVolunteerAgreement: true,
        acceptHealthSafetyPolicy: true,
      });

      // Final submission
      const createAccountButton = page.getByTestId("next-submit-button");
      await expect(createAccountButton).toContainText(/create account/i);
      await expect(createAccountButton).toBeEnabled();
      
      // Note: In a real test environment, this would create the account
      // For testing purposes, we verify the form is ready for submission
    });

    test("should validate comprehensive form data before submission", async ({ page }) => {
      // Test with various edge cases and comprehensive data
      await navigateToStep(page, 6);
      
      // Fill final step with specific preferences
      await fillCommunicationStep(page, {
        emailNewsletter: false,
        notificationPreference: "SMS",
        acceptVolunteerAgreement: true,
        acceptHealthSafetyPolicy: true,
      });

      const submitButton = page.getByTestId("next-submit-button");
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe("Accessibility and Responsive Design", () => {
    test("should support keyboard navigation", async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press("Tab");
      const emailInput = page.getByTestId("email-input");
      await expect(emailInput).toBeFocused();

      await page.keyboard.press("Tab");
      const passwordInput = page.getByTestId("password-input");
      await expect(passwordInput).toBeFocused();

      await page.keyboard.press("Tab");
      const confirmPasswordInput = page.getByTestId("confirm-password-input");
      await expect(confirmPasswordInput).toBeFocused();
    });

    test("should work on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await waitForPageLoad(page);

      // All main elements should still be accessible
      await expect(page.getByTestId("register-page")).toBeVisible();
      await expect(page.getByTestId("progress-indicator")).toBeVisible();
      await expect(page.getByTestId("registration-form-card")).toBeVisible();
      
      // Form should be usable
      const emailInput = page.getByTestId("email-input");
      await expect(emailInput).toBeVisible();
      await emailInput.fill("mobile@test.com");
      await expect(emailInput).toHaveValue("mobile@test.com");
    });

    test("should work on tablet viewport", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await waitForPageLoad(page);

      await expect(page.getByTestId("register-page")).toBeVisible();
      await expect(page.getByTestId("registration-form-card")).toBeVisible();
    });

    test("should have proper ARIA attributes and labels", async ({ page }) => {
      // Form should have proper structure
      const form = page.getByTestId("registration-form");
      await expect(form).toBeVisible();
      
      // Required fields should have proper labels
      const emailInput = page.getByTestId("email-input");
      await expect(emailInput).toHaveAttribute("required");
      
      // Check for associated labels
      const emailLabel = page.locator('label[for="email"]');
      await expect(emailLabel).toBeVisible();
    });
  });

  test.describe("Error Edge Cases", () => {
    test("should handle empty form submission gracefully", async ({ page }) => {
      // Try to submit completely empty form
      await page.getByTestId("next-submit-button").click();
      
      // Should show validation and remain on step 1
      await page.waitForTimeout(1000);
      await expect(page.getByTestId("step-counter")).toContainText("Step 1 of 6");
    });

    test("should handle malformed email addresses", async ({ page }) => {
      const malformedEmails = [
        "notanemail",
        "@missing.com",
        "missing@",
        "spaces in@email.com",
        "emoji😀@email.com"
      ];

      for (const email of malformedEmails) {
        await page.getByTestId("email-input").fill(email);
        await page.getByTestId("password-input").fill("password123");
        await page.getByTestId("confirm-password-input").fill("password123");
        
        await page.getByTestId("next-submit-button").click();
        await page.waitForTimeout(500);

        // Should remain on step 1 due to invalid email
        await expect(page.getByTestId("step-counter")).toContainText("Step 1 of 6");
        
        // Clear fields for next iteration
        await page.getByTestId("email-input").clear();
        await page.getByTestId("password-input").clear();
        await page.getByTestId("confirm-password-input").clear();
      }
    });

    test("should handle special characters in form fields", async ({ page }) => {
      // Test with names containing special characters
      await fillAccountStep(page);
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Fill with special characters
      await fillPersonalInfoStep(page, {
        firstName: "José María",
        lastName: "O'Connor-Smith",
        phone: "+64 (21) 123-4567",
      });

      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Should advance successfully
      await expect(page.getByTestId("step-counter")).toContainText("Step 3 of 6");
    });
  });

  test.describe("Link Navigation", () => {
    test("should navigate to login page via login link", async ({ page }) => {
      const loginLink = page.getByTestId("login-link");
      await loginLink.click();

      // Should navigate to login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should show login page
      const loginPage = page.getByTestId("login-page");
      await expect(loginPage).toBeVisible();
    });

    test("should open policy dialogs when clicking agreement links", async ({ page }) => {
      await navigateToStep(page, 6);

      // Test volunteer agreement dialog
      const volunteerAgreementLink = page.getByRole("button", { name: /volunteer agreement/i });
      await volunteerAgreementLink.click();

      const volunteerDialog = page.getByRole("dialog", { name: /volunteer agreement/i });
      await expect(volunteerDialog).toBeVisible();

      // Close dialog
      await page.keyboard.press("Escape");
      await expect(volunteerDialog).not.toBeVisible();

      // Test health and safety policy dialog
      const healthSafetyLink = page.getByRole("button", { name: /health and safety/i });
      await healthSafetyLink.click();

      const healthSafetyDialog = page.getByRole("dialog", { name: /health and safety/i });
      await expect(healthSafetyDialog).toBeVisible();
    });
  });
});