import { test, expect } from './base';
import { readFileSync } from 'fs';
import path from 'path';
import { loginAsAdmin } from './helpers/auth';

test.describe('Admin Migration System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    
    // Navigate to migration page
    await page.click('[data-testid="user-migration-button"]');
    await expect(page).toHaveURL('/admin/migration');
  });

  test.describe('CSV Upload and Validation', () => {
    test('should display migration page with correct tabs', async ({ page }) => {
      // Check all tabs are present using test IDs
      await expect(page.getByTestId('tab-upload-csv')).toBeVisible();
      await expect(page.getByTestId('tab-upload-csv')).toContainText('Upload CSV');
      await expect(page.getByTestId('tab-migration-status')).toBeVisible();
      await expect(page.getByTestId('tab-migration-status')).toContainText('Migration Status');
      await expect(page.getByTestId('tab-user-invitations')).toBeVisible();
      await expect(page.getByTestId('tab-user-invitations')).toContainText('User Invitations');
      await expect(page.getByTestId('tab-migrated-users')).toBeVisible();
      await expect(page.getByTestId('tab-migrated-users')).toContainText('Migrated Users');
      
      // Check page header
      await expect(page.getByTestId('page-header')).toContainText('User Migration');
    });

    test('should show CSV format requirements', async ({ page }) => {
      // Check upload section is visible
      await expect(page.getByTestId('csv-upload-title')).toBeVisible();
      await expect(page.getByTestId('csv-upload-title')).toContainText('Upload Legacy User Data');
      
      // Check CSV format information is present
      await expect(page.locator('text=/Required CSV Format|CSV Format|Required Fields/i')).toBeVisible();
      await expect(page.locator('text=/Email/i').first()).toBeVisible();
    });

    test('should validate and upload valid CSV file', async ({ page }) => {
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      
      // Upload valid CSV file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(validCsvPath);
      
      // Wait for validation to complete
      await expect(page.locator('text=Validation completed')).toBeVisible({ timeout: 10000 });
      
      // Check validation results
      await expect(page.locator('text=Valid Records: 5')).toBeVisible();
      await expect(page.locator('text=Invalid Records: 0')).toBeVisible();
      
      // Check execute migration button is enabled
      const executeButton = page.locator('button:has-text("Execute Migration")');
      await expect(executeButton).toBeEnabled();
    });

    test('should show validation errors for invalid CSV', async ({ page }) => {
      const invalidCsvPath = path.join(__dirname, '../fixtures/migration-invalid-data.csv');
      
      // Upload invalid CSV file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(invalidCsvPath);
      
      // Wait for validation to complete
      await expect(page.locator('text=Validation completed')).toBeVisible({ timeout: 10000 });
      
      // Check validation shows errors
      await expect(page.locator('text=Invalid Records:')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Invalid email format')).toBeVisible();
      await expect(page.locator('text=Invalid date format')).toBeVisible();
      await expect(page.locator('text=Duplicate email found')).toBeVisible();
      
      // Check errors section is expanded
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
    });

    test('should allow dry run migration', async ({ page }) => {
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      
      // Upload and validate CSV
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await expect(page.locator('text=Validation completed')).toBeVisible({ timeout: 10000 });
      
      // Click dry run button
      await page.click('button:has-text("Dry Run")');
      
      // Wait for dry run to complete
      await expect(page.locator('text=Dry run completed')).toBeVisible({ timeout: 10000 });
      
      // Check dry run results
      await expect(page.locator('text=Total Records: 5')).toBeVisible();
      await expect(page.locator('text=Successful: 5')).toBeVisible();
      await expect(page.locator('text=Failed: 0')).toBeVisible();
    });

    test('should execute migration with confirmation', async ({ page }) => {
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      
      // Upload and validate CSV
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await expect(page.locator('text=Validation completed')).toBeVisible({ timeout: 10000 });
      
      // Execute migration
      await page.click('button:has-text("Execute Migration")');
      
      // Wait for migration to complete
      await expect(page.locator('text=Migration completed')).toBeVisible({ timeout: 15000 });
      
      // Check migration results
      await expect(page.locator('text=Total Records: 5')).toBeVisible();
      await expect(page.locator('text=Successful: 5')).toBeVisible();
      
      // Check created users are displayed
      await expect(page.locator('[data-testid="created-users"]')).toBeVisible();
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
      await expect(page.locator('text=sarah.smith@test.com')).toBeVisible();
    });

    test('should show confirmation dialog for migration with errors', async ({ page }) => {
      const invalidCsvPath = path.join(__dirname, '../fixtures/migration-invalid-data.csv');
      
      // Upload invalid CSV
      await page.locator('input[type="file"]').setInputFiles(invalidCsvPath);
      await expect(page.locator('text=Validation completed')).toBeVisible({ timeout: 10000 });
      
      // Try to execute migration
      await page.click('button:has-text("Execute Migration")');
      
      // Check confirmation dialog appears
      await expect(page.locator('text=Confirm Migration with Errors')).toBeVisible();
      await expect(page.locator('text=There are validation errors in your data')).toBeVisible();
      
      // Cancel migration
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('text=Confirm Migration with Errors')).not.toBeVisible();
      
      // Try again and confirm
      await page.click('button:has-text("Execute Migration")');
      await page.click('button:has-text("Yes, Execute Migration")');
      
      // Wait for migration to complete
      await expect(page.locator('text=Migration completed')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Migration Status Tab', () => {
    test('should display migration statistics', async ({ page }) => {
      // Switch to migration status tab
      await page.click('text=Migration Status');
      
      // Check statistics cards are visible
      await expect(page.locator('text=Total Migrations')).toBeVisible();
      await expect(page.locator('text=Successful')).toBeVisible();
      await expect(page.locator('text=Failed')).toBeVisible();
      await expect(page.locator('text=Last Migration')).toBeVisible();
    });

    test('should show recent migration activity', async ({ page }) => {
      // Switch to migration status tab
      await page.click('text=Migration Status');
      
      // Check recent activity section
      await expect(page.locator('text=Recent Migration Activity')).toBeVisible();
    });
  });

  test.describe('User Invitations Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we have migrated users by running a quick migration
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await expect(page.locator('text=Validation completed')).toBeVisible({ timeout: 10000 });
      await page.click('button:has-text("Execute Migration")');
      await expect(page.locator('text=Migration completed')).toBeVisible({ timeout: 15000 });
      
      // Switch to invitations tab
      await page.click('text=User Invitations');
    });

    test('should display invitation statistics', async ({ page }) => {
      // Check statistics cards
      await expect(page.locator('text=Total Migrated')).toBeVisible();
      await expect(page.locator('text=Pending')).toBeVisible();
      await expect(page.locator('text=Invited')).toBeVisible();
      await expect(page.locator('text=Expired')).toBeVisible();
      await expect(page.locator('text=Completed')).toBeVisible();
    });

    test('should show migrated users list', async ({ page }) => {
      // Check users are displayed
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
      await expect(page.locator('text=sarah.smith@test.com')).toBeVisible();
      
      // Check status badges
      await expect(page.locator('text=Pending')).toBeVisible();
    });

    test('should filter users by status', async ({ page }) => {
      // Test filter dropdown
      await page.selectOption('select', 'pending');
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
      
      await page.selectOption('select', 'all');
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
    });

    test('should search users by email', async ({ page }) => {
      // Test search functionality
      await page.fill('input[placeholder*="Search by name or email"]', 'john.doe');
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
      await expect(page.locator('text=sarah.smith@test.com')).not.toBeVisible();
      
      // Clear search
      await page.fill('input[placeholder*="Search by name or email"]', '');
      await expect(page.locator('text=sarah.smith@test.com')).toBeVisible();
    });

    test('should select and send invitations', async ({ page }) => {
      // Select users
      await page.check('input[type="checkbox"]', { force: true }); // Select all checkbox
      
      // Check send button is enabled
      const sendButton = page.locator('button:has-text("Send Invitations")');
      await expect(sendButton).toBeEnabled();
      
      // Send invitations
      await sendButton.click();
      
      // Wait for invitations to be sent
      await expect(page.locator('text=Successfully sent')).toBeVisible({ timeout: 10000 });
      
      // Check registration URLs dialog appears
      await expect(page.locator('text=Registration URLs Generated')).toBeVisible();
      await expect(page.locator('text=invitation')).toBeVisible();
      
      // Check copy functionality
      await expect(page.locator('button:has-text("Copy All URLs")')).toBeVisible();
      
      // Close dialog
      await page.keyboard.press('Escape');
      await expect(page.locator('text=Registration URLs Generated')).not.toBeVisible();
    });

    test('should show custom message option', async ({ page }) => {
      // Check custom message textarea
      await expect(page.locator('textarea[placeholder*="Add a personal message"]')).toBeVisible();
      
      // Add custom message
      await page.fill('textarea[placeholder*="Add a personal message"]', 'Welcome to our new volunteer portal!');
      
      // Select a user and send invitation
      await page.check('input[type="checkbox"]:nth-of-type(2)'); // Select first user
      await page.click('button:has-text("Send Invitations")');
      
      // Verify invitation sent with custom message
      await expect(page.locator('text=Successfully sent 1 invitations')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle file upload errors', async ({ page }) => {
      // Try to upload non-CSV file
      const textFilePath = path.join(__dirname, '../fixtures/test.txt');
      
      // Create a temporary text file for testing
      require('fs').writeFileSync(textFilePath, 'This is not a CSV file');
      
      try {
        await page.locator('input[type="file"]').setInputFiles(textFilePath);
        await expect(page.locator('text=File must be a CSV')).toBeVisible();
      } finally {
        // Clean up
        require('fs').unlinkSync(textFilePath);
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure for validation endpoint
      await page.route('**/api/admin/migration/validate', route => {
        route.abort('failed');
      });
      
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      
      // Check error message appears
      await expect(page.locator('text=Failed to validate CSV file')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check tabs are still functional
      await expect(page.locator('text=Upload CSV')).toBeVisible();
      
      // Check file upload area is accessible
      await expect(page.locator('input[type="file"]')).toBeVisible();
      
      // Check statistics cards stack properly
      await page.click('text=User Invitations');
      await expect(page.locator('text=Total Migrated')).toBeVisible();
    });
  });
});