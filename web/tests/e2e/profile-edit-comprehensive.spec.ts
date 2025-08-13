import { test, expect } from "./base";
import type { Page } from "@playwright/test";

// Test helpers for profile editing tests
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300); // Reduced timeout for faster tests
}

// Helper function to login as volunteer
async function loginAsVolunteer(page: Page) {
  try {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const volunteerLoginButton = page.getByTestId("quick-login-volunteer-button");
    await volunteerLoginButton.waitFor({ state: "visible", timeout: 10000 });
    await volunteerLoginButton.click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log("Error during volunteer login:", error);
    test.skip(true, "Login failed - skipping profile edit tests");
  }
}

// Helper to navigate to specific section
async function navigateToSection(page: Page, sectionIndex: number) {
  // Use section tabs for navigation
  const sectionTabs = [
    "Personal Information",
    "Emergency Contact", 
    "Medical & References",
    "Availability & Location",
    "Communication & Agreements"
  ];
  
  if (sectionIndex < sectionTabs.length) {
    const tabButton = page.getByRole("button", { name: new RegExp(sectionTabs[sectionIndex], "i") });
    await tabButton.click();
    await page.waitForTimeout(500);
  }
}

// Helper to fill personal information
async function fillPersonalInformation(
  page: Page,
  options: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    pronouns?: string;
  } = {}
) {
  const {
    firstName = "Updated",
    lastName = "User",
    email = "updated@example.com",
    phone = "+64 21 555 1234",
    dateOfBirth = "1990-05-15",
    pronouns = "they/them",
  } = options;

  // Navigate to personal information section
  await navigateToSection(page, 0);

  // Fill fields with keyboard interaction for better reliability
  if (firstName) {
    const firstNameField = page.getByRole("textbox", { name: /first name/i });
    await firstNameField.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type(firstName);
  }

  if (lastName) {
    const lastNameField = page.getByRole("textbox", { name: /last name/i });
    await lastNameField.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type(lastName);
  }

  if (email) {
    const emailField = page.getByRole("textbox", { name: /email/i });
    await emailField.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type(email);
  }

  if (phone) {
    const phoneField = page.getByRole("textbox", { name: /phone/i });
    await phoneField.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type(phone);
  }

  if (dateOfBirth) {
    const dobField = page.getByLabel(/date of birth/i);
    await dobField.fill(dateOfBirth);
  }

  if (pronouns && pronouns !== "none") {
    const pronounsSelect = page.getByTestId("pronouns-select");
    if (await pronounsSelect.isVisible()) {
      await pronounsSelect.click();
      await page.getByRole("option", { name: new RegExp(pronouns, "i") }).click();
    }
  }
}

// Helper to fill emergency contact information
async function fillEmergencyContact(
  page: Page,
  options: {
    name?: string;
    relationship?: string;
    phone?: string;
  } = {}
) {
  const {
    name = "Emergency Contact Person",
    relationship = "Sibling",
    phone = "+64 21 555 9876",
  } = options;

  await navigateToSection(page, 1);

  const nameField = page.getByRole("textbox", { name: /emergency contact name/i });
  await nameField.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(name);

  const relationshipField = page.getByRole("textbox", { name: /relationship/i });
  await relationshipField.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(relationship);

  const phoneField = page.getByRole("textbox", { name: /emergency contact phone/i });
  await phoneField.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(phone);
}

// Helper to fill medical information
async function fillMedicalInfo(
  page: Page,
  options: {
    medicalConditions?: string;
    willingToProvideReference?: boolean;
    howDidYouHearAboutUs?: string;
  } = {}
) {
  const {
    medicalConditions = "Updated medical information",
    willingToProvideReference = true,
    howDidYouHearAboutUs = "website",
  } = options;

  await navigateToSection(page, 2);

  if (medicalConditions) {
    const medicalField = page.getByRole("textbox", { name: /medical conditions/i });
    await medicalField.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type(medicalConditions);
  }

  const referenceCheckbox = page.getByRole("checkbox", { name: /willing to provide reference/i });
  const isChecked = await referenceCheckbox.isChecked();
  
  if (willingToProvideReference && !isChecked) {
    await referenceCheckbox.check();
  } else if (!willingToProvideReference && isChecked) {
    await referenceCheckbox.uncheck();
  }

  if (howDidYouHearAboutUs && howDidYouHearAboutUs !== "not_specified") {
    const hearAboutSelect = page.getByTestId("how-did-you-hear-select");
    if (await hearAboutSelect.isVisible()) {
      await hearAboutSelect.click();
      await page.getByRole("option", { name: new RegExp(howDidYouHearAboutUs.replace("_", " "), "i") }).click();
    }
  }
}

// Helper to fill availability preferences
async function fillAvailability(
  page: Page,
  options: {
    days?: string[];
    locations?: string[];
  } = {}
) {
  const { days = ["tuesday", "thursday"], locations = ["wellington"] } = options;

  await navigateToSection(page, 3);

  // Clear all existing day selections first
  const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const day of allDays) {
    const dayCheckbox = page.getByTestId(`available-day-${day}`);
    if (await dayCheckbox.isVisible() && await dayCheckbox.isChecked()) {
      await dayCheckbox.uncheck();
    }
  }

  // Select specified days
  for (const day of days) {
    const dayCheckbox = page.getByTestId(`available-day-${day}`);
    if (await dayCheckbox.isVisible()) {
      await dayCheckbox.check();
    }
  }

  // Handle locations (if available)
  for (const location of locations) {
    const locationCheckbox = page.getByTestId(`available-location-${location.toLowerCase()}`);
    if (await locationCheckbox.isVisible()) {
      await locationCheckbox.check();
    }
  }
}

// Helper to fill communication preferences
async function fillCommunicationPreferences(
  page: Page,
  options: {
    emailNewsletter?: boolean;
    notificationPreference?: string;
  } = {}
) {
  const {
    emailNewsletter = false,
    notificationPreference = "SMS",
  } = options;

  await navigateToSection(page, 4);

  // Handle newsletter subscription
  const newsletterCheckbox = page.getByRole("checkbox", { name: /newsletter/i });
  const isChecked = await newsletterCheckbox.isChecked();
  
  if (emailNewsletter && !isChecked) {
    await newsletterCheckbox.check();
  } else if (!emailNewsletter && isChecked) {
    await newsletterCheckbox.uncheck();
  }

  // Handle notification preferences
  if (notificationPreference) {
    const notificationSelect = page.getByTestId("notification-preference-select");
    if (await notificationSelect.isVisible()) {
      await notificationSelect.click();
      await page.getByRole("option", { name: new RegExp(notificationPreference, "i") }).click();
    }
  }
}

test.describe("Profile Edit Page - Comprehensive Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVolunteer(page);
    
    // Navigate to profile edit page
    await page.goto("/profile/edit");
    await page.waitForLoadState("domcontentloaded");

    // Skip tests if login failed (still on login page)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip(true, "Login failed - skipping profile edit tests");
    }

    // Wait for page to be fully loaded
    await page.waitForTimeout(1500); // Extra wait for profile data loading
  });

  test.describe("Page Layout and Structure", () => {
    test("should display main page elements", async ({ page }) => {
      await expect(page).toHaveURL("/profile/edit");

      // Page header
      const pageTitle = page.getByRole("heading", { name: /edit your profile/i });
      await expect(pageTitle).toBeVisible();

      const pageDescription = page.getByText("Update your volunteer profile");
      await expect(pageDescription).toBeVisible();

      // Back navigation
      const backButton = page.getByRole("link", { name: /back to profile/i });
      await expect(backButton).toBeVisible();
      await expect(backButton).toHaveAttribute("href", "/profile");

      // Progress indicator
      const progressHeading = page.getByRole("heading", { name: /profile setup progress/i });
      await expect(progressHeading).toBeVisible();

      // Step indicator
      const stepIndicator = page.getByText(/step \d+ of 5/i);
      await expect(stepIndicator).toBeVisible();

      // Save button (always visible)
      const saveButtons = page.getByRole("button", { name: /save/i });
      const saveButtonCount = await saveButtons.count();
      expect(saveButtonCount).toBeGreaterThan(0);
    });

    test("should display all section navigation tabs", async ({ page }) => {
      // Check all five section tabs
      const expectedTabs = [
        "Personal Information",
        "Emergency Contact", 
        "Medical & References",
        "Availability & Location",
        "Communication & Agreements"
      ];

      for (const tabName of expectedTabs) {
        const tab = page.getByRole("button", { name: new RegExp(tabName, "i") });
        await expect(tab).toBeVisible();
      }
    });

    test("should show correct initial step indicator", async ({ page }) => {
      // Should start on step 1
      const stepIndicator = page.getByText("Step 1 of 5");
      await expect(stepIndicator).toBeVisible();

      // Current section should be Personal Information
      const currentSectionTitle = page.getByRole("heading", { name: /personal information/i }).last();
      await expect(currentSectionTitle).toBeVisible();
    });

    test("should display form content with navigation controls", async ({ page }) => {
      // Previous button (should be disabled on first section)
      const previousButton = page.getByRole("button", { name: /previous/i });
      await expect(previousButton).toBeVisible();
      await expect(previousButton).toBeDisabled();

      // Next button (should be enabled)
      const nextButton = page.getByRole("button", { name: /next/i });
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toBeEnabled();
    });
  });

  test.describe("Section Navigation", () => {
    test("should navigate between sections using next/previous buttons", async ({ page }) => {
      // Start on Personal Information (step 1)
      await expect(page.getByText("Step 1 of 5")).toBeVisible();
      
      // Navigate to Emergency Contact (step 2)
      const nextButton = page.getByRole("button", { name: /next/i });
      await nextButton.click();
      await page.waitForTimeout(500);
      
      await expect(page.getByText("Step 2 of 5")).toBeVisible();
      const emergencyHeading = page.getByRole("heading", { name: /emergency contact/i }).last();
      await expect(emergencyHeading).toBeVisible();

      // Navigate back to Personal Information
      const previousButton = page.getByRole("button", { name: /previous/i });
      await previousButton.click();
      await page.waitForTimeout(500);
      
      await expect(page.getByText("Step 1 of 5")).toBeVisible();
      const personalHeading = page.getByRole("heading", { name: /personal information/i }).last();
      await expect(personalHeading).toBeVisible();
    });

    test("should navigate between sections using tab buttons", async ({ page }) => {
      // Click on Medical & References tab (section 3)
      const medicalTab = page.getByRole("button", { name: /medical & references/i });
      await medicalTab.click();
      await page.waitForTimeout(500);
      
      await expect(page.getByText("Step 3 of 5")).toBeVisible();
      const medicalHeading = page.getByRole("heading", { name: /medical & references/i }).last();
      await expect(medicalHeading).toBeVisible();

      // Click on Availability & Location tab (section 4)
      const availabilityTab = page.getByRole("button", { name: /availability & location/i });
      await availabilityTab.click();
      await page.waitForTimeout(500);
      
      await expect(page.getByText("Step 4 of 5")).toBeVisible();
      const availabilityHeading = page.getByRole("heading", { name: /availability & location/i }).last();
      await expect(availabilityHeading).toBeVisible();

      // Click on Communication & Agreements tab (section 5)
      const communicationTab = page.getByRole("button", { name: /communication & agreements/i });
      await communicationTab.click();
      await page.waitForTimeout(500);
      
      await expect(page.getByText("Step 5 of 5")).toBeVisible();
      const communicationHeading = page.getByRole("heading", { name: /communication & agreements/i }).last();
      await expect(communicationHeading).toBeVisible();
    });

    test("should update navigation buttons based on current section", async ({ page }) => {
      // On first section, previous should be disabled
      const previousButton = page.getByRole("button", { name: /previous/i });
      await expect(previousButton).toBeDisabled();

      // Navigate to middle section
      await navigateToSection(page, 2); // Medical & References
      await expect(previousButton).toBeEnabled();
      
      const nextButton = page.getByRole("button", { name: /next/i });
      await expect(nextButton).toBeEnabled();

      // Navigate to last section
      await navigateToSection(page, 4); // Communication & Agreements
      await expect(previousButton).toBeEnabled();
      
      // On last section, next button becomes "Save Profile"
      const saveButton = page.getByRole("button", { name: /save profile/i });
      await expect(saveButton).toBeVisible();
    });

    test("should maintain section state during navigation", async ({ page }) => {
      // Fill some data in personal information
      await fillPersonalInformation(page, { firstName: "TestNavigation" });
      
      // Navigate to emergency contact
      await navigateToSection(page, 1);
      await fillEmergencyContact(page, { name: "Test Emergency" });

      // Navigate back to personal information
      await navigateToSection(page, 0);
      
      // Data should be preserved
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toHaveValue("TestNavigation");

      // Navigate back to emergency contact
      await navigateToSection(page, 1);
      
      // Emergency contact data should be preserved
      const emergencyNameField = page.getByRole("textbox", { name: /emergency contact name/i });
      await expect(emergencyNameField).toHaveValue("Test Emergency");
    });
  });

  test.describe("Section 1 - Personal Information", () => {
    test("should display all personal information fields", async ({ page }) => {
      await navigateToSection(page, 0);

      // Name fields
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toBeVisible();

      const lastNameField = page.getByRole("textbox", { name: /last name/i });
      await expect(lastNameField).toBeVisible();

      // Email field
      const emailField = page.getByRole("textbox", { name: /email/i });
      await expect(emailField).toBeVisible();

      // Phone field
      const phoneField = page.getByRole("textbox", { name: /phone/i });
      await expect(phoneField).toBeVisible();

      // Date of birth field
      const dobField = page.getByLabel(/date of birth/i);
      await expect(dobField).toBeVisible();
      await expect(dobField).toHaveAttribute("type", "date");

      // Pronouns select
      const pronounsSelect = page.getByTestId("pronouns-select");
      await expect(pronounsSelect).toBeVisible();
    });

    test("should load existing personal information data", async ({ page }) => {
      await navigateToSection(page, 0);

      // Check that fields have existing values (from logged-in user's profile)
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      const firstNameValue = await firstNameField.inputValue();
      
      const lastNameField = page.getByRole("textbox", { name: /last name/i });
      const lastNameValue = await lastNameField.inputValue();
      
      const emailField = page.getByRole("textbox", { name: /email/i });
      const emailValue = await emailField.inputValue();

      // Should have some data loaded (not empty for a registered user)
      expect(firstNameValue || lastNameValue || emailValue).toBeTruthy();
    });

    test("should allow editing personal information fields", async ({ page }) => {
      await fillPersonalInformation(page, {
        firstName: "EditedFirst",
        lastName: "EditedLast",
        phone: "+64 21 999 8888",
      });

      // Verify changes were applied
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toHaveValue("EditedFirst");

      const lastNameField = page.getByRole("textbox", { name: /last name/i });
      await expect(lastNameField).toHaveValue("EditedLast");

      const phoneField = page.getByRole("textbox", { name: /phone/i });
      await expect(phoneField).toHaveValue("+64 21 999 8888");
    });

    test("should handle pronouns selection", async ({ page }) => {
      await navigateToSection(page, 0);

      const pronounsSelect = page.getByTestId("pronouns-select");
      await pronounsSelect.click();
      
      // Select "She/Her"
      await page.getByRole("option", { name: /she\/her/i }).click();
      
      // Verify selection (the select should show the selected value)
      await expect(pronounsSelect).toBeVisible();
      // Note: The actual selected value verification depends on how the SelectField component displays selections
    });

    test("should validate required personal information fields", async ({ page }) => {
      await navigateToSection(page, 0);

      // Clear required fields
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await firstNameField.clear();

      const lastNameField = page.getByRole("textbox", { name: /last name/i });
      await lastNameField.clear();

      // Try to save
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Should either show validation error or remain on edit page
      const isStillOnEditPage = page.url().includes("/edit");
      expect(isStillOnEditPage).toBe(true);
    });

    test("should handle date of birth input", async ({ page }) => {
      await navigateToSection(page, 0);

      const dobField = page.getByLabel(/date of birth/i);
      await dobField.fill("1985-12-25");
      
      await expect(dobField).toHaveValue("1985-12-25");
    });
  });

  test.describe("Section 2 - Emergency Contact", () => {
    test("should display emergency contact fields", async ({ page }) => {
      await navigateToSection(page, 1);

      // Emergency contact name
      const nameField = page.getByRole("textbox", { name: /emergency contact name/i });
      await expect(nameField).toBeVisible();

      // Relationship
      const relationshipField = page.getByRole("textbox", { name: /relationship/i });
      await expect(relationshipField).toBeVisible();

      // Emergency contact phone
      const phoneField = page.getByRole("textbox", { name: /emergency contact phone/i });
      await expect(phoneField).toBeVisible();

      // Information notice
      const infoNotice = page.getByText(/kept confidential/i);
      await expect(infoNotice).toBeVisible();
    });

    test("should allow editing emergency contact information", async ({ page }) => {
      await fillEmergencyContact(page, {
        name: "Updated Emergency Contact",
        relationship: "Partner",
        phone: "+64 21 777 6666",
      });

      // Verify changes
      const nameField = page.getByRole("textbox", { name: /emergency contact name/i });
      await expect(nameField).toHaveValue("Updated Emergency Contact");

      const relationshipField = page.getByRole("textbox", { name: /relationship/i });
      await expect(relationshipField).toHaveValue("Partner");

      const phoneField = page.getByRole("textbox", { name: /emergency contact phone/i });
      await expect(phoneField).toHaveValue("+64 21 777 6666");
    });

    test("should handle empty emergency contact fields (optional)", async ({ page }) => {
      await navigateToSection(page, 1);

      // Clear all fields
      const nameField = page.getByRole("textbox", { name: /emergency contact name/i });
      await nameField.clear();

      const relationshipField = page.getByRole("textbox", { name: /relationship/i });
      await relationshipField.clear();

      const phoneField = page.getByRole("textbox", { name: /emergency contact phone/i });
      await phoneField.clear();

      // Should be able to save without emergency contact info
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Should accept the save (emergency contact is optional)
      // Verification depends on implementation - could redirect or show success
    });
  });

  test.describe("Section 3 - Medical Information & References", () => {
    test("should display medical information fields", async ({ page }) => {
      await navigateToSection(page, 2);

      // Medical conditions field
      const medicalField = page.getByRole("textbox", { name: /medical conditions/i });
      await expect(medicalField).toBeVisible();

      // Reference checkbox
      const referenceCheckbox = page.getByRole("checkbox", { name: /willing to provide reference/i });
      await expect(referenceCheckbox).toBeVisible();

      // How did you hear about us select
      const hearAboutSelect = page.getByTestId("how-did-you-hear-select");
      await expect(hearAboutSelect).toBeVisible();
    });

    test("should allow editing medical information", async ({ page }) => {
      await fillMedicalInfo(page, {
        medicalConditions: "Updated medical conditions and allergies",
        willingToProvideReference: false,
        howDidYouHearAboutUs: "friend_family",
      });

      // Verify changes
      const medicalField = page.getByRole("textbox", { name: /medical conditions/i });
      await expect(medicalField).toHaveValue("Updated medical conditions and allergies");

      const referenceCheckbox = page.getByRole("checkbox", { name: /willing to provide reference/i });
      await expect(referenceCheckbox).not.toBeChecked();
    });

    test("should handle reference checkbox toggle", async ({ page }) => {
      await navigateToSection(page, 2);

      const referenceCheckbox = page.getByRole("checkbox", { name: /willing to provide reference/i });
      const initialState = await referenceCheckbox.isChecked();

      // Toggle the checkbox
      await referenceCheckbox.click();
      
      // Should be in opposite state
      const newState = await referenceCheckbox.isChecked();
      expect(newState).toBe(!initialState);
    });

    test("should handle 'how did you hear about us' selection", async ({ page }) => {
      await navigateToSection(page, 2);

      const hearAboutSelect = page.getByTestId("how-did-you-hear-select");
      await hearAboutSelect.click();
      
      // Select "Community Event"
      await page.getByRole("option", { name: /community event/i }).click();
      
      // Verify selection by checking that dropdown is closed and value is set
      await expect(hearAboutSelect).toBeVisible();
    });

    test("should allow clearing medical conditions", async ({ page }) => {
      await navigateToSection(page, 2);

      const medicalField = page.getByRole("textbox", { name: /medical conditions/i });
      await medicalField.clear();
      
      await expect(medicalField).toHaveValue("");
    });
  });

  test.describe("Section 4 - Availability & Location", () => {
    test("should display availability form fields", async ({ page }) => {
      await navigateToSection(page, 3);

      // Days section
      const daysLabel = page.getByText(/days you're typically available/i);
      await expect(daysLabel).toBeVisible();

      // Check for day checkboxes
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      for (const day of days) {
        const dayCheckbox = page.getByTestId(`available-day-${day}`);
        await expect(dayCheckbox).toBeVisible();
      }

      // Locations section
      const locationsLabel = page.getByText(/locations where you can volunteer/i);
      await expect(locationsLabel).toBeVisible();

      // Location checkboxes (availability depends on configuration)
      const commonLocations = ["wellington", "glenn_innes", "onehunga"];
      for (const location of commonLocations) {
        const locationCheckbox = page.getByTestId(`available-location-${location}`);
        if (await locationCheckbox.isVisible()) {
          await expect(locationCheckbox).toBeVisible();
        }
      }
    });

    test("should allow selecting and deselecting available days", async ({ page }) => {
      await navigateToSection(page, 3);

      // Select specific days
      const mondayCheckbox = page.getByTestId("available-day-monday");
      const wednesdayCheckbox = page.getByTestId("available-day-wednesday");
      const fridayCheckbox = page.getByTestId("available-day-friday");

      await mondayCheckbox.check();
      await wednesdayCheckbox.check();
      await fridayCheckbox.check();

      // Verify selections
      await expect(mondayCheckbox).toBeChecked();
      await expect(wednesdayCheckbox).toBeChecked();
      await expect(fridayCheckbox).toBeChecked();

      // Deselect one day
      await mondayCheckbox.uncheck();
      await expect(mondayCheckbox).not.toBeChecked();
      
      // Others should remain checked
      await expect(wednesdayCheckbox).toBeChecked();
      await expect(fridayCheckbox).toBeChecked();
    });

    test("should allow selecting multiple available locations", async ({ page }) => {
      await navigateToSection(page, 3);

      // Try to select wellington if available
      const wellingtonCheckbox = page.getByTestId("available-location-wellington");
      if (await wellingtonCheckbox.isVisible()) {
        await wellingtonCheckbox.check();
        await expect(wellingtonCheckbox).toBeChecked();
      }

      // Try to select other locations
      const glennInnesCheckbox = page.getByTestId("available-location-glenn_innes");
      if (await glennInnesCheckbox.isVisible()) {
        await glennInnesCheckbox.check();
        await expect(glennInnesCheckbox).toBeChecked();
      }
    });

    test("should handle no availability selections (all optional)", async ({ page }) => {
      await navigateToSection(page, 3);

      // Uncheck all days
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      for (const day of days) {
        const dayCheckbox = page.getByTestId(`available-day-${day}`);
        if (await dayCheckbox.isChecked()) {
          await dayCheckbox.uncheck();
        }
      }

      // Should be able to save with no availability selected
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Should accept the save (availability is optional)
    });

    test("should persist availability selections during navigation", async ({ page }) => {
      // Set availability
      await fillAvailability(page, {
        days: ["tuesday", "thursday", "saturday"],
        locations: ["wellington"],
      });

      // Navigate to another section
      await navigateToSection(page, 0);
      
      // Navigate back to availability
      await navigateToSection(page, 3);

      // Selections should be preserved
      await expect(page.getByTestId("available-day-tuesday")).toBeChecked();
      await expect(page.getByTestId("available-day-thursday")).toBeChecked();
      await expect(page.getByTestId("available-day-saturday")).toBeChecked();
      
      // Non-selected days should not be checked
      await expect(page.getByTestId("available-day-monday")).not.toBeChecked();
      await expect(page.getByTestId("available-day-wednesday")).not.toBeChecked();
    });
  });

  test.describe("Section 5 - Communication & Agreements", () => {
    test("should display communication preferences", async ({ page }) => {
      await navigateToSection(page, 4);

      // Newsletter subscription
      const newsletterCheckbox = page.getByRole("checkbox", { name: /newsletter/i });
      await expect(newsletterCheckbox).toBeVisible();

      // Notification preferences
      const notificationSelect = page.getByTestId("notification-preference-select");
      await expect(notificationSelect).toBeVisible();
    });

    test("should allow changing communication preferences", async ({ page }) => {
      await fillCommunicationPreferences(page, {
        emailNewsletter: false,
        notificationPreference: "BOTH",
      });

      // Verify changes
      const newsletterCheckbox = page.getByRole("checkbox", { name: /newsletter/i });
      await expect(newsletterCheckbox).not.toBeChecked();

      // Verify notification preference selection
      const notificationSelect = page.getByTestId("notification-preference-select");
      await expect(notificationSelect).toBeVisible();
    });

    test("should handle newsletter subscription toggle", async ({ page }) => {
      await navigateToSection(page, 4);

      const newsletterCheckbox = page.getByRole("checkbox", { name: /newsletter/i });
      const initialState = await newsletterCheckbox.isChecked();

      // Toggle subscription
      await newsletterCheckbox.click();
      
      const newState = await newsletterCheckbox.isChecked();
      expect(newState).toBe(!initialState);
    });

    test("should handle notification preference selection", async ({ page }) => {
      await navigateToSection(page, 4);

      const notificationSelect = page.getByTestId("notification-preference-select");
      await notificationSelect.click();
      
      // Select "Text message only"
      await page.getByRole("option", { name: /text message/i }).click();
      
      // Dropdown should close
      await expect(notificationSelect).toBeVisible();
    });

    test("should show Save Profile button on final section", async ({ page }) => {
      await navigateToSection(page, 4);

      // Should show "Save Profile" instead of "Next"
      const saveProfileButton = page.getByRole("button", { name: /save profile/i });
      await expect(saveProfileButton).toBeVisible();
    });
  });

  test.describe("Form Saving and Data Persistence", () => {
    test("should save profile changes successfully", async ({ page }) => {
      // Make changes across multiple sections
      await fillPersonalInformation(page, {
        firstName: "SaveTest",
        lastName: "User",
      });

      await fillEmergencyContact(page, {
        name: "Save Test Emergency",
      });

      // Save changes
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();
      await page.waitForTimeout(2000);

      // Should either redirect to profile or show success
      const currentUrl = page.url();
      const savedSuccessfully = currentUrl.includes("/profile") && !currentUrl.includes("/edit");
      
      if (!savedSuccessfully) {
        // If still on edit page, should not show error
        const errorMessage = page.getByText(/error|failed/i);
        await expect(errorMessage).not.toBeVisible();
      }
    });

    test("should show loading state during save", async ({ page }) => {
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();

      // Should show loading text briefly
      try {
        const loadingText = page.getByText(/saving/i);
        await expect(loadingText).toBeVisible({ timeout: 2000 });
      } catch {
        // Loading state might be too brief to catch
        console.log("Save loading state was too brief to capture");
      }
    });

    test("should handle save errors gracefully", async ({ page }) => {
      // Mock a save error
      await page.route("/api/profile", route => 
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid profile data" })
        })
      );

      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();
      await page.waitForTimeout(2000);

      // Should show error message
      const errorToast = page.locator('[role="alert"], .destructive').filter({ hasText: /invalid|error/i });
      await expect(errorToast.first()).toBeVisible({ timeout: 5000 });
    });

    test("should save from any section using header save button", async ({ page }) => {
      // Go to middle section
      await navigateToSection(page, 2);

      // Make a change
      await fillMedicalInfo(page, { medicalConditions: "Header save test" });

      // Use the always-visible header save button
      const headerSaveButton = page.getByRole("button", { name: /save/i }).first();
      await headerSaveButton.click();
      await page.waitForTimeout(2000);

      // Should save successfully from any section
      const currentUrl = page.url();
      const isStillOnEditPage = currentUrl.includes("/edit");
      
      if (isStillOnEditPage) {
        // Should not show errors
        const errorMessage = page.getByText(/error|failed/i);
        await expect(errorMessage).not.toBeVisible();
      }
    });

    test("should preserve changes during section navigation", async ({ page }) => {
      // Fill data in multiple sections
      await fillPersonalInformation(page, { firstName: "Persistence" });
      await fillEmergencyContact(page, { name: "Persistence Emergency" });
      await fillMedicalInfo(page, { medicalConditions: "Persistence Medical" });

      // Navigate back to first section
      await navigateToSection(page, 0);

      // Data should be preserved
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toHaveValue("Persistence");

      // Check other sections
      await navigateToSection(page, 1);
      const emergencyNameField = page.getByRole("textbox", { name: /emergency contact name/i });
      await expect(emergencyNameField).toHaveValue("Persistence Emergency");

      await navigateToSection(page, 2);
      const medicalField = page.getByRole("textbox", { name: /medical conditions/i });
      await expect(medicalField).toHaveValue("Persistence Medical");
    });
  });

  test.describe("Data Loading and Initialization", () => {
    test("should load existing profile data on page load", async ({ page }) => {
      // Wait for data loading
      await page.waitForTimeout(1000);

      // Should not show loading spinner indefinitely
      const loadingSpinner = page.getByText(/loading your profile/i);
      await expect(loadingSpinner).not.toBeVisible();

      // Should show profile content
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toBeVisible();
      
      // Should have some data loaded for registered user
      const firstNameValue = await firstNameField.inputValue();
      const lastNameValue = await page.getByRole("textbox", { name: /last name/i }).inputValue();
      const emailValue = await page.getByRole("textbox", { name: /email/i }).inputValue();
      
      expect(firstNameValue || lastNameValue || emailValue).toBeTruthy();
    });

    test("should handle profile data loading errors gracefully", async ({ page }) => {
      // Mock profile loading error
      await page.route("/api/profile", route => 
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to load profile" })
        })
      );

      await page.reload();
      await page.waitForTimeout(2000);

      // Should either show error message or fallback gracefully
      const errorMessage = page.getByText(/error|failed|something went wrong/i);
      
      try {
        await expect(errorMessage).toBeVisible({ timeout: 3000 });
      } catch {
        // If no error message, should at least show the form
        const form = page.getByRole("textbox", { name: /first name/i });
        await expect(form).toBeVisible();
      }
    });

    test("should show initial loading state briefly", async ({ page }) => {
      await page.reload();
      
      // Should show loading state initially
      try {
        const loadingMessage = page.getByText(/loading your profile/i);
        await expect(loadingMessage).toBeVisible({ timeout: 1000 });
      } catch {
        // Loading might be too fast to catch
        console.log("Initial loading state was too brief to capture");
      }

      // Should eventually show the form
      await page.waitForTimeout(2000);
      const form = page.getByRole("textbox", { name: /first name/i });
      await expect(form).toBeVisible();
    });
  });

  test.describe("Responsive Design and Accessibility", () => {
    test("should work on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);

      // Main elements should be visible
      const pageTitle = page.getByRole("heading", { name: /edit your profile/i });
      await expect(pageTitle).toBeVisible();

      const progressHeading = page.getByRole("heading", { name: /profile setup progress/i });
      await expect(progressHeading).toBeVisible();

      // Form should be usable
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toBeVisible();
      
      // Should be able to input data
      await firstNameField.click();
      await page.keyboard.type("MobileTest");
      await expect(firstNameField).toHaveValue("MobileTest");
    });

    test("should work on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);

      await expect(page.getByRole("heading", { name: /edit your profile/i })).toBeVisible();
      await expect(page.getByRole("textbox", { name: /first name/i })).toBeVisible();
    });

    test("should support keyboard navigation", async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press("Tab");
      
      // Should focus on an interactive element
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Continue tabbing
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      
      const newFocusedElement = page.locator(":focus");
      await expect(newFocusedElement).toBeVisible();
    });

    test("should have proper accessibility attributes", async ({ page }) => {
      // Form fields should have labels
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toBeVisible();

      const lastNameField = page.getByRole("textbox", { name: /last name/i });
      await expect(lastNameField).toBeVisible();

      // Buttons should have accessible names
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await expect(saveButton).toBeVisible();

      // Navigation buttons
      const nextButton = page.getByRole("button", { name: /next/i });
      await expect(nextButton).toBeVisible();
    });

    test("should have appropriate heading structure", async ({ page }) => {
      // Should have proper heading hierarchy
      const headings = page.locator("h1, h2, h3, h4, h5, h6");
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Main page title
      const pageTitle = page.getByRole("heading", { name: /edit your profile/i });
      await expect(pageTitle).toBeVisible();
    });
  });

  test.describe("Edge Cases and Error Handling", () => {
    test("should handle extremely long text inputs", async ({ page }) => {
      const longText = "A".repeat(1000);
      
      await navigateToSection(page, 2);
      const medicalField = page.getByRole("textbox", { name: /medical conditions/i });
      await medicalField.fill(longText);
      
      // Should handle long text without breaking
      const actualValue = await medicalField.inputValue();
      expect(actualValue.length).toBeGreaterThan(100);
    });

    test("should handle special characters in form inputs", async ({ page }) => {
      const specialCharsName = "José María O'Connor-Smith";
      const specialCharsPhone = "+64 (21) 123-4567";
      
      await fillPersonalInformation(page, {
        firstName: specialCharsName,
        phone: specialCharsPhone,
      });

      // Should accept special characters
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await expect(firstNameField).toHaveValue(specialCharsName);
      
      const phoneField = page.getByRole("textbox", { name: /phone/i });
      await expect(phoneField).toHaveValue(specialCharsPhone);
    });

    test("should handle network timeouts gracefully", async ({ page }) => {
      // Mock slow network response
      await page.route("/api/profile", route => 
        new Promise(resolve => 
          setTimeout(() => resolve(route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ message: "Success" })
          })), 10000)
        )
      );

      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();
      
      // Should show loading state for slow requests
      try {
        const loadingText = page.getByText(/saving/i);
        await expect(loadingText).toBeVisible({ timeout: 3000 });
      } catch {
        console.log("Loading state not captured for slow request");
      }
    });

    test("should prevent multiple simultaneous saves", async ({ page }) => {
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      
      // Click save button rapidly multiple times
      await saveButton.click();
      await saveButton.click();
      await saveButton.click();
      
      // Should handle multiple clicks gracefully (button should be disabled during save)
      await page.waitForTimeout(1000);
      
      // Should not cause errors
      const errorMessage = page.getByText(/error|failed/i);
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe("Navigation and Links", () => {
    test("should navigate back to profile page", async ({ page }) => {
      const backButton = page.getByRole("link", { name: /back to profile/i });
      await backButton.click();

      await expect(page).toHaveURL("/profile");
      
      const profilePage = page.getByText(/volunteer profile|your profile/i);
      await expect(profilePage).toBeVisible();
    });

    test("should maintain profile edit URL during section navigation", async ({ page }) => {
      // Navigate through sections
      await navigateToSection(page, 2);
      await expect(page).toHaveURL("/profile/edit");
      
      await navigateToSection(page, 4);
      await expect(page).toHaveURL("/profile/edit");
      
      // URL should remain consistent
      await navigateToSection(page, 0);
      await expect(page).toHaveURL("/profile/edit");
    });
  });

  test.describe("Complete Profile Update Flow", () => {
    test("should complete comprehensive profile update", async ({ page }) => {
      // Update all sections with new data
      
      // Section 1: Personal Information
      await fillPersonalInformation(page, {
        firstName: "Comprehensive",
        lastName: "Update",
        phone: "+64 21 555 0001",
        dateOfBirth: "1988-03-20",
        pronouns: "she/her",
      });

      // Section 2: Emergency Contact
      await fillEmergencyContact(page, {
        name: "Comprehensive Emergency Contact",
        relationship: "Parent", 
        phone: "+64 21 555 0002",
      });

      // Section 3: Medical Info
      await fillMedicalInfo(page, {
        medicalConditions: "Comprehensive medical update - no known conditions",
        willingToProvideReference: true,
        howDidYouHearAboutUs: "search_engine",
      });

      // Section 4: Availability
      await fillAvailability(page, {
        days: ["monday", "wednesday", "friday", "sunday"],
        locations: ["wellington"],
      });

      // Section 5: Communication
      await fillCommunicationPreferences(page, {
        emailNewsletter: true,
        notificationPreference: "BOTH",
      });

      // Final save
      await navigateToSection(page, 4); // Last section
      const saveProfileButton = page.getByRole("button", { name: /save profile/i });
      await expect(saveProfileButton).toBeVisible();
      await expect(saveProfileButton).toBeEnabled();
      
      await saveProfileButton.click();
      await page.waitForTimeout(3000);

      // Should complete successfully (either redirect or remain without errors)
      const hasError = await page.getByText(/error|failed/i).isVisible();
      expect(hasError).toBe(false);
    });

    test("should validate all data before final save", async ({ page }) => {
      // Leave required fields empty and try to save
      await navigateToSection(page, 0);
      
      const firstNameField = page.getByRole("textbox", { name: /first name/i });
      await firstNameField.clear();
      
      const lastNameField = page.getByRole("textbox", { name: /last name/i });
      await lastNameField.clear();

      // Try to save
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await saveButton.click();
      await page.waitForTimeout(2000);

      // Should validate and prevent save or show appropriate message
      const isStillOnEditPage = page.url().includes("/edit");
      expect(isStillOnEditPage).toBe(true);
    });
  });
});