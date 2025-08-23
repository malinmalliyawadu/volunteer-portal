import { Page, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import path from 'path';

const prisma = new PrismaClient();

export class MigrationTestHelper {
  constructor(private page: Page) {}

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    await this.page.goto('/login');
    await this.page.fill('input[name="email"]', 'admin@everybodyeats.nz');
    await this.page.fill('input[name="password"]', 'admin123');
    await this.page.click('button[type="submit"]');
    await expect(this.page).toHaveURL('/admin');
  }

  /**
   * Navigate to migration page and verify it loads
   */
  async navigateToMigrationPage() {
    await this.page.click('[data-testid="user-migration-button"]');
    await expect(this.page).toHaveURL('/admin/migration');
    await expect(this.page.locator('[data-testid="page-title"]')).toContainText('User Migration');
  }

  /**
   * Upload a CSV file and wait for validation
   */
  async uploadCSV(filename: string) {
    const csvPath = path.join(__dirname, '../fixtures', filename);
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    await expect(this.page.locator('text=Validation completed')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Execute migration and wait for completion
   */
  async executeMigration() {
    await this.page.click('button:has-text("Execute Migration")');
    
    // Handle confirmation dialog if it appears
    const confirmDialog = this.page.locator('text=Confirm Migration with Errors');
    if (await confirmDialog.isVisible()) {
      await this.page.click('button:has-text("Yes, Execute Migration")');
    }
    
    await expect(this.page.locator('text=Migration completed')).toBeVisible({ timeout: 15000 });
  }

  /**
   * Switch to a specific tab in the migration interface
   */
  async switchToTab(tabName: string) {
    await this.page.click(`text=${tabName}`);
  }

  /**
   * Send invitations to selected users
   */
  async sendInvitations(selectAll: boolean = true, customMessage?: string) {
    if (selectAll) {
      await this.page.check('input[type="checkbox"]', { force: true }); // Select all
    }

    if (customMessage) {
      await this.page.fill('textarea[placeholder*="Add a personal message"]', customMessage);
    }

    await this.page.click('button:has-text("Send Invitations")');
    await expect(this.page.locator('text=Successfully sent')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get registration URLs from the dialog
   */
  async getRegistrationUrls(): Promise<string[]> {
    await expect(this.page.locator('text=Registration URLs Generated')).toBeVisible();
    
    const urlElements = await this.page.locator('[data-testid="registration-url"]').all();
    const urls: string[] = [];
    
    for (const element of urlElements) {
      const url = await element.textContent();
      if (url) {
        urls.push(url.trim());
      }
    }
    
    return urls;
  }

  /**
   * Close any open dialogs
   */
  async closeDialogs() {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Check if validation shows specific error count
   */
  async expectValidationResults(valid: number, invalid: number) {
    await expect(this.page.locator(`text=Valid Records: ${valid}`)).toBeVisible();
    await expect(this.page.locator(`text=Invalid Records: ${invalid}`)).toBeVisible();
  }

  /**
   * Check if migration results show expected counts
   */
  async expectMigrationResults(total: number, successful: number, failed?: number) {
    await expect(this.page.locator(`text=Total Records: ${total}`)).toBeVisible();
    await expect(this.page.locator(`text=Successful: ${successful}`)).toBeVisible();
    
    if (failed !== undefined) {
      await expect(this.page.locator(`text=Failed: ${failed}`)).toBeVisible();
    }
  }

  /**
   * Create a test user with migration token
   */
  static async createMigrationUser(email: string, tokenExpired: boolean = false) {
    const token = randomBytes(32).toString('hex');
    const expiryDate = tokenExpired ? 
      addDays(new Date(), -1) : // Expired yesterday
      addDays(new Date(), 7);   // Expires in 7 days

    return await prisma.user.create({
      data: {
        email,
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        hashedPassword: 'temp-password-hash',
        role: 'VOLUNTEER',
        isMigrated: true,
        migrationInvitationToken: token,
        migrationTokenExpiresAt: expiryDate,
        profileCompleted: false,
        volunteerAgreementAccepted: false,
        healthSafetyPolicyAccepted: false,
      }
    });
  }

  /**
   * Clean up test users by email
   */
  static async cleanupTestUsers(emails: string[]) {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: emails
        }
      }
    });
  }

  /**
   * Get migration statistics from the database
   */
  static async getMigrationStats() {
    const totalMigrated = await prisma.user.count({
      where: { isMigrated: true }
    });

    const pending = await prisma.user.count({
      where: {
        isMigrated: true,
        migrationInvitationSent: false
      }
    });

    const invited = await prisma.user.count({
      where: {
        isMigrated: true,
        migrationInvitationSent: true,
        profileCompleted: false,
        migrationTokenExpiresAt: {
          gt: new Date()
        }
      }
    });

    const expired = await prisma.user.count({
      where: {
        isMigrated: true,
        migrationInvitationSent: true,
        profileCompleted: false,
        migrationTokenExpiresAt: {
          lt: new Date()
        }
      }
    });

    const completed = await prisma.user.count({
      where: {
        isMigrated: true,
        profileCompleted: true
      }
    });

    return {
      totalMigrated,
      pending,
      invited,
      expired,
      completed
    };
  }
}

export class RegistrationTestHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to migration registration page with token
   */
  async navigateToRegistration(token: string) {
    await this.page.goto(`/register/migrate?token=${token}`);
  }

  /**
   * Complete personal information step
   */
  async completePersonalInfo(password: string = 'SecurePassword123!') {
    await expect(this.page.locator('text=Personal Information')).toBeVisible();
    
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="confirmPassword"]', password);
    await this.page.click('button:has-text("Continue")');
    
    await expect(this.page.locator('text=Emergency Contact')).toBeVisible();
  }

  /**
   * Complete emergency contact step
   */
  async completeEmergencyContact(skip: boolean = false) {
    await expect(this.page.locator('text=Emergency Contact')).toBeVisible();
    
    if (skip) {
      await this.page.click('button:has-text("Skip for Now")');
    } else {
      await this.page.fill('input[name="emergencyContactName"]', 'Test Emergency Contact');
      await this.page.fill('input[name="emergencyContactRelationship"]', 'Friend');
      await this.page.fill('input[name="emergencyContactPhone"]', '+64 21 555 0000');
      await this.page.click('button:has-text("Continue")');
    }
    
    await expect(this.page.locator('text=Volunteer Preferences')).toBeVisible();
  }

  /**
   * Complete volunteer preferences step
   */
  async completeVolunteerPreferences() {
    await expect(this.page.locator('text=Volunteer Preferences')).toBeVisible();
    
    // Select some days
    await this.page.check('input[value="Monday"]');
    await this.page.check('input[value="Wednesday"]');
    
    // Select locations
    await this.page.check('input[value="Wellington"]');
    
    await this.page.click('button:has-text("Continue")');
    await expect(this.page.locator('text=Terms and Agreements')).toBeVisible();
  }

  /**
   * Complete terms and agreements step
   */
  async completeTermsAndAgreements() {
    await expect(this.page.locator('text=Terms and Agreements')).toBeVisible();
    
    await this.page.check('input[name="volunteerAgreement"]');
    await this.page.check('input[name="healthSafetyPolicy"]');
    
    await this.page.click('button:has-text("Complete Registration")');
  }

  /**
   * Complete the entire registration flow
   */
  async completeFullRegistration(password: string = 'SecurePassword123!', skipEmergencyContact: boolean = true) {
    await this.completePersonalInfo(password);
    await this.completeEmergencyContact(skipEmergencyContact);
    await this.completeVolunteerPreferences();
    await this.completeTermsAndAgreements();
    
    // Check success and redirect
    await expect(this.page.locator('text=Registration completed successfully')).toBeVisible();
    await expect(this.page).toHaveURL('/dashboard');
  }

  /**
   * Go back to previous step
   */
  async goBack() {
    await this.page.click('button:has-text("Back")');
  }

  /**
   * Check current step
   */
  async expectCurrentStep(stepNumber: number, stepName: string) {
    await expect(this.page.locator('[data-testid="step-indicator"]')).toContainText(`Step ${stepNumber} of 4`);
    await expect(this.page.locator(`text=${stepName}`)).toBeVisible();
  }

  /**
   * Check for validation error
   */
  async expectValidationError(errorText: string) {
    await expect(this.page.locator(`text=${errorText}`)).toBeVisible();
  }
}

/**
 * Generate test CSV content
 */
export function generateTestCSV(users: Array<{
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  contactName?: string;
  contactRelationship?: string;
  contactPhone?: string;
  medicalConditions?: string;
  experiencePoints?: string;
  daysAvailable?: string;
  locations?: string;
  positions?: string;
}>): string {
  const headers = [
    'First Name', 'Last Name', 'Email', 'Phone', 'Date of Birth',
    'Contact Name', 'Contact Relationship', 'Contact Phone',
    'Medical Conditions', 'Experience Points', 'Days Available',
    'Locations', 'Positions'
  ];

  const rows = users.map(user => [
    user.firstName,
    user.lastName,
    user.email,
    user.phone || '',
    user.dateOfBirth || '',
    user.contactName || '',
    user.contactRelationship || '',
    user.contactPhone || '',
    user.medicalConditions || '',
    user.experiencePoints || '',
    user.daysAvailable || '',
    user.locations || '',
    user.positions || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Create a temporary CSV file for testing
 */
export async function createTempCSVFile(filename: string, content: string): Promise<string> {
  const fs = require('fs');
  const filePath = path.join(__dirname, '../fixtures', filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(filePaths: string[]) {
  const fs = require('fs');
  for (const filePath of filePaths) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  }
}