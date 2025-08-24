import type { Page } from "@playwright/test";

/**
 * Helper function to login as admin user
 * Uses the quick-login button with test ID for reliability
 */
export async function loginAsAdmin(page: Page) {
  try {
    await page.goto("/login");
    await page.waitForLoadState("load");

    const adminLoginButton = page.getByTestId("quick-login-admin-button");
    await adminLoginButton.waitFor({ state: "visible", timeout: 10000 });
    await adminLoginButton.click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    await page.waitForLoadState("load");
  } catch (error) {
    console.log("Error during admin login:", error);
    throw error;
  }
}

/**
 * Helper function to login as volunteer user
 * Uses the quick-login button with test ID for reliability
 */
export async function loginAsVolunteer(page: Page) {
  try {
    await page.goto("/login");
    await page.waitForLoadState("load");

    const volunteerLoginButton = page.getByTestId("quick-login-volunteer-button");
    await volunteerLoginButton.waitFor({ state: "visible", timeout: 10000 });
    await volunteerLoginButton.click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    await page.waitForLoadState("load");
  } catch (error) {
    console.log("Error during volunteer login:", error);
    throw error;
  }
}

/**
 * Helper function to logout
 */
export async function logout(page: Page) {
  try {
    // Click user menu
    await page.getByTestId("user-menu-button").click();
    
    // Click logout
    await page.getByText("Logout").click();
    
    // Wait for redirect to login page
    await page.waitForURL("**/login");
  } catch (error) {
    console.log("Error during logout:", error);
    throw error;
  }
}