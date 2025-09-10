import { test, expect } from "./base";
import type { Page } from "@playwright/test";

// Helper function to wait for page to load completely
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(500); // Small buffer for animations
}

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await waitForPageLoad(page);

  const adminButton = page.getByTestId("quick-login-admin-button");
  await adminButton.click();

  // Wait for navigation away from login page
  await page.waitForURL(
    (url) => {
      return url.pathname !== "/login";
    },
    { timeout: 10000 }
  );
}

// Helper function to register a new underage user
async function registerUnderageUser(page: Page, email: string, birthYear: number) {
  await page.goto("/register");
  await waitForPageLoad(page);

  // Step 1: Account credentials
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("Password123!");
  await page.getByTestId("confirm-password-input").fill("Password123!");
  await page.getByTestId("next-submit-button").click();
  await waitForPageLoad(page);

  // Step 2: Personal information with underage birth date
  await page.getByRole("textbox", { name: /first name/i }).fill("Emma");
  await page.getByRole("textbox", { name: /last name/i }).fill("Parker");
  await page.getByRole("textbox", { name: /mobile number/i }).fill("(555) 123-4567");
  
  // Set birth date to make user underage (16 years old)
  const birthDate = new Date();
  birthDate.setFullYear(birthYear);
  const birthDateString = birthDate.toISOString().split('T')[0];
  await page.locator('input[type="date"]').fill(birthDateString);
  
  await page.getByTestId("next-submit-button").click();
  await waitForPageLoad(page);

  // Step 3: Emergency contact
  await page.getByRole("textbox", { name: /emergency contact name/i }).fill("Sarah Parker");
  await page.getByRole("textbox", { name: /emergency contact phone/i }).fill("(555) 987-6543");
  await page.getByTestId("next-submit-button").click();
  await waitForPageLoad(page);

  // Step 4: Agreements
  await page.getByTestId("volunteer-agreement-checkbox").check();
  await page.getByTestId("health-safety-checkbox").check();
  await page.getByTestId("complete-registration-button").click();
  await waitForPageLoad(page);
}

// Helper function to create and login as an underage user
async function createAndLoginAsUnderageUser(page: Page) {
  const userEmail = `underage.test.${Date.now()}@example.com`;
  
  // First register the underage user
  await registerUnderageUser(page, userEmail, new Date().getFullYear() - 15);
  
  // User should be logged in after registration
  // Wait for navigation away from registration completion
  await waitForPageLoad(page);
  
  return userEmail;
}

test.describe("Parental Consent System", () => {
  test.describe("Registration Flow for Minors", () => {
    test("should show parental consent notice during registration for users under 18", async ({ page }) => {
      await page.goto("/register");
      await waitForPageLoad(page);

      // Step 1: Account credentials
      await page.getByTestId("email-input").fill("minor.test@example.com");
      await page.getByTestId("password-input").fill("Password123!");
      await page.getByTestId("confirm-password-input").fill("Password123!");
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      // Step 2: Enter birth date that makes user 16 years old
      await page.getByRole("textbox", { name: /first name/i }).fill("Test");
      await page.getByRole("textbox", { name: /last name/i }).fill("Minor");
      await page.getByRole("textbox", { name: /mobile number/i }).fill("(555) 123-4567");
      
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 16);
      const birthDateString = birthDate.toISOString().split('T')[0];
      await page.locator('input[type="date"]').fill(birthDateString);

      // Should show parental consent notice
      await expect(page.getByTestId("parental-consent-notice")).toBeVisible();
      await expect(page.getByText("Parental Consent Required")).toBeVisible();
      await expect(page.getByText("You can continue registering now")).toBeVisible();
      await expect(page.getByTestId("download-consent-form-button")).toBeVisible();
    });

    test("should allow downloading parental consent form during registration", async ({ page }) => {
      await page.goto("/register");
      await waitForPageLoad(page);

      // Navigate to step 2 with underage user
      await page.getByTestId("email-input").fill("minor.test2@example.com");
      await page.getByTestId("password-input").fill("Password123!");
      await page.getByTestId("confirm-password-input").fill("Password123!");
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      await page.getByRole("textbox", { name: /first name/i }).fill("Test");
      await page.getByRole("textbox", { name: /last name/i }).fill("Minor");
      await page.getByRole("textbox", { name: /mobile number/i }).fill("(555) 123-4567");
      
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 17);
      const birthDateString = birthDate.toISOString().split('T')[0];
      await page.locator('input[type="date"]').fill(birthDateString);

      // Test PDF download
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId("download-consent-form-button").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('parental-consent-form.pdf');
    });

    test("should allow underage users to complete registration despite parental consent requirement", async ({ page }) => {
      // Complete full registration flow for underage user
      await registerUnderageUser(page, "complete.minor@example.com", new Date().getFullYear() - 15);

      // Should reach dashboard/success page
      await expect(page.getByText("Welcome")).toBeVisible();
    });
  });

  test.describe("Dashboard Experience for Minors", () => {
    test("should show parental consent banner for underage users without approval", async ({ page }) => {
      await createAndLoginAsUnderageUser(page);
      await waitForPageLoad(page);

      // Should show parental consent banner
      await expect(page.getByTestId("parental-consent-banner")).toBeVisible();
      await expect(page.getByText("Parental consent required")).toBeVisible();
      await expect(page.getByText("volunteers@everybodyeats.nz")).toBeVisible();
      await expect(page.getByText("Download Consent Form")).toBeVisible();
    });

    test("should allow downloading consent form from dashboard banner", async ({ page }) => {
      await createAndLoginAsUnderageUser(page);
      await waitForPageLoad(page);

      // Test PDF download from dashboard
      const downloadPromise = page.waitForEvent('download');
      await page.locator('button:has-text("Download Consent Form")').click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('parental-consent-form.pdf');
    });
  });

  test.describe("Shift Access Restrictions", () => {
    test("should prevent underage users from signing up for shifts without parental consent", async ({ page }) => {
      await createAndLoginAsUnderageUser(page);
      await waitForPageLoad(page);

      // Navigate to shifts page
      await page.getByTestId("browse-shifts-button").click();
      await waitForPageLoad(page);

      // Find an available shift and click on it
      const shiftCard = page.getByTestId(/shift-card-/).first();
      await shiftCard.click();
      await waitForPageLoad(page);

      // Should show parental consent restrictions
      await expect(page.getByTestId("parental-consent-banner")).toBeVisible();
      await expect(page.getByText("Parental Consent Required")).toBeVisible();
      await expect(page.getByText("volunteers@everybodyeats.nz")).toBeVisible();
    });

    test("should show disabled signup buttons on shifts listing page for underage users", async ({ page }) => {
      await createAndLoginAsUnderageUser(page);
      await waitForPageLoad(page);

      // Navigate to shifts calendar
      await page.getByTestId("browse-shifts-button").click();
      await waitForPageLoad(page);

      // Click on a date with shifts
      await page.locator('.fc-daygrid-day[data-date] .fc-daygrid-day-number').first().click();
      await waitForPageLoad(page);

      // Should show disabled buttons with parental consent message
      const disabledButton = page.getByTestId("shift-signup-button-disabled").first();
      await expect(disabledButton).toBeVisible();
      await expect(disabledButton).toBeDisabled();
      await expect(disabledButton).toContainText("Parental Consent Required");
    });

    test("should show parental consent banner on shifts details page", async ({ page }) => {
      await createAndLoginAsUnderageUser(page);
      await waitForPageLoad(page);

      // Navigate to shifts page and select a date
      await page.getByTestId("browse-shifts-button").click();
      await waitForPageLoad(page);
      
      // Navigate to a shifts details page
      await page.locator('.fc-daygrid-day[data-date] .fc-daygrid-day-number').first().click();
      await waitForPageLoad(page);

      // Should show parental consent banner
      await expect(page.getByTestId("parental-consent-banner")).toBeVisible();
    });
  });

  test.describe("Admin Parental Consent Management", () => {
    test("should allow admin to view parental consent requests", async ({ page }) => {
      await loginAsAdmin(page);
      await waitForPageLoad(page);

      // Navigate to admin parental consent page
      await page.getByTestId("sidebar-parental-consent").click();
      await waitForPageLoad(page);

      // Should show parental consent management page
      await expect(page.getByText("Parental Consent Management")).toBeVisible();
      await expect(page.getByText("volunteers@everybodyeats.nz")).toBeVisible();
      
      // Should show list of users requiring consent
      await expect(page.getByText("Pending Approval")).toBeVisible();
    });

    test("should show underage users in parental consent table", async ({ page }) => {
      await loginAsAdmin(page);
      await waitForPageLoad(page);

      // Navigate to parental consent management
      await page.getByTestId("sidebar-parental-consent").click();
      await waitForPageLoad(page);

      // Should show Sophia Brown (from seed data) in the table
      await expect(page.getByText("Sophia Brown")).toBeVisible();
      await expect(page.getByText("15 years old")).toBeVisible();
      await expect(page.getByText("sophia.brown@gmail.com")).toBeVisible();
    });

    test("should allow admin to approve parental consent", async ({ page }) => {
      await loginAsAdmin(page);
      await waitForPageLoad(page);

      // Navigate to parental consent management
      await page.getByTestId("sidebar-parental-consent").click();
      await waitForPageLoad(page);

      // Find Sophia Brown's row and approve consent
      const approveButton = page.getByRole("button", { name: "Approve Consent" }).first();
      await approveButton.click();

      // Confirm in dialog
      await page.getByRole("button", { name: "Yes, approve consent" }).click();
      await waitForPageLoad(page);

      // Should show success message or update status
      await expect(page.getByText("Consent approved successfully")).toBeVisible();
    });

    test("should update user status after approval", async ({ page }) => {
      await loginAsAdmin(page);
      await waitForPageLoad(page);

      // Navigate to parental consent management
      await page.getByTestId("sidebar-parental-consent").click();
      await waitForPageLoad(page);

      // Check if Jackson Smith (approved user from seed data) shows as approved
      await expect(page.getByText("Jackson Smith")).toBeVisible();
      await expect(page.getByText("Approved")).toBeVisible();
    });
  });

  test.describe("API Restrictions", () => {
    test("should prevent shift signup API calls for users without parental consent", async ({ page }) => {
      await createAndLoginAsUnderageUser(page);
      await waitForPageLoad(page);

      // Listen for API calls
      const apiResponse = page.waitForResponse('/api/shifts/*/signup');

      // Try to make an API call by directly posting (simulating bypass attempt)
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/shifts/test-shift-id/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          return {
            status: res.status,
            text: await res.text()
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      // Should receive 403 Forbidden with parental consent message
      expect(response.status).toBe(403);
      expect(response.text).toContain("Parental consent required");
    });
  });

  test.describe("Age-Based Logic", () => {
    test("should not show parental consent notices for users 18 and older", async ({ page }) => {
      // Register user who is exactly 18
      await page.goto("/register");
      await waitForPageLoad(page);

      await page.getByTestId("email-input").fill("adult.user@example.com");
      await page.getByTestId("password-input").fill("Password123!");
      await page.getByTestId("confirm-password-input").fill("Password123!");
      await page.getByTestId("next-submit-button").click();
      await waitForPageLoad(page);

      await page.getByRole("textbox", { name: /first name/i }).fill("Adult");
      await page.getByRole("textbox", { name: /last name/i }).fill("User");
      await page.getByRole("textbox", { name: /mobile number/i }).fill("(555) 123-4567");
      
      // Set birth date to exactly 18 years ago
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 18);
      const birthDateString = birthDate.toISOString().split('T')[0];
      await page.locator('input[type="date"]').fill(birthDateString);

      // Should NOT show parental consent notice
      await expect(page.getByTestId("parental-consent-notice")).not.toBeVisible();
    });
  });
});