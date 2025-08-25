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
      
      // Click validate button to trigger validation
      await page.getByText('Validate CSV').click();
      
      // Wait for validation to complete with longer timeout
      await expect(page.getByTestId('validation-title')).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId('validation-title')).toContainText('Validation completed');
      
      // Check validation results
      await expect(page.getByTestId('valid-records')).toContainText('Valid Records: 5');
      await expect(page.getByTestId('invalid-records')).toContainText('Invalid Records: 0');
      
      // Check execute migration button is enabled
      const executeButton = page.getByTestId('execute-migration-button');
      await expect(executeButton).toBeEnabled();
    });

    test('should show validation errors for invalid CSV', async ({ page }) => {
      const invalidCsvPath = path.join(__dirname, '../fixtures/migration-invalid-data.csv');
      
      // Upload invalid CSV file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(invalidCsvPath);
      
      // Click validate button
      await page.getByText('Validate CSV').click();
      
      // Wait for validation to complete
      await expect(page.getByTestId('validation-title')).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId('validation-title')).toContainText('Validation completed');
      
      // Check validation shows errors
      await expect(page.getByTestId('invalid-records')).toContainText('Invalid Records:');
      
      // Check errors section is visible and expand the errors details
      const errorsSection = page.getByTestId('validation-errors');
      await expect(errorsSection).toBeVisible();
      
      // Click to expand the errors details
      await errorsSection.locator('summary:has-text("View Errors")').click();
      
      // Check for common error messages (at least some should be present)
      await expect(errorsSection.locator('text=Invalid email format').first()).toBeVisible();
      await expect(errorsSection.locator('text=Invalid date format').first()).toBeVisible(); 
      await expect(errorsSection.locator('text=Duplicate email found').first()).toBeVisible();
    });

    test('should allow dry run migration', async ({ page }) => {
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      
      // Upload and validate CSV
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await page.getByText('Validate CSV').click();
      await expect(page.getByTestId('validation-title')).toBeVisible({ timeout: 30000 });
      
      // Click dry run button
      await page.getByTestId('dry-run-button').click();
      
      // Wait for dry run to complete
      await expect(page.getByTestId('migration-results-title')).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId('migration-results-title')).toContainText('Dry run completed');
      
      // Check dry run results
      await expect(page.getByTestId('total-migration-records')).toContainText('Total Records: 5');
      
      // Dry runs show all records as successful since no actual database checks are made
      const successfulText = await page.getByTestId('successful-migrations').textContent();
      const skippedText = await page.getByTestId('skipped-migrations').textContent();
      const failedText = await page.getByTestId('failed-migrations').textContent();
      
      const successful = parseInt(successfulText?.match(/(\d+)/)?.[1] || '0');
      const skipped = parseInt(skippedText?.match(/(\d+)/)?.[1] || '0');
      const failed = parseInt(failedText?.match(/(\d+)/)?.[1] || '0');
      
      expect(successful + skipped + failed).toBe(5);
      expect(failed).toBe(0); // Dry runs with valid data should not fail
    });

    test('should execute migration with confirmation', async ({ page }) => {
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      
      // Upload and validate CSV
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await page.getByText('Validate CSV').click();
      await expect(page.getByTestId('validation-title')).toBeVisible({ timeout: 30000 });
      
      // Execute migration
      await page.getByTestId('execute-migration-button').click();
      
      // Wait for migration to complete
      await expect(page.getByTestId('migration-results-title')).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId('migration-results-title')).toContainText('Migration completed');
      
      // Check migration results
      await expect(page.getByTestId('total-migration-records')).toContainText('Total Records: 5');
      
      // Migration should either succeed or skip users (if they already exist from previous tests)
      // The total of successful + skipped + failed should equal total records
      const successfulText = await page.getByTestId('successful-migrations').textContent();
      const skippedText = await page.getByTestId('skipped-migrations').textContent();
      const failedText = await page.getByTestId('failed-migrations').textContent();
      
      // Extract numbers from text like "Successful: 5" or "5Successful: 5"
      const successful = parseInt(successfulText?.match(/(\d+)/)?.[1] || '0');
      const skipped = parseInt(skippedText?.match(/(\d+)/)?.[1] || '0');
      const failed = parseInt(failedText?.match(/(\d+)/)?.[1] || '0');
      
      expect(successful + skipped + failed).toBe(5);
      
      // Check created users section appears if there were successful migrations
      if (successful > 0) {
        await expect(page.getByTestId('created-users')).toBeVisible();
      }
    });

    test('should show confirmation dialog for migration with errors', async ({ page }) => {
      const invalidCsvPath = path.join(__dirname, '../fixtures/migration-invalid-data.csv');
      
      // Upload invalid CSV
      await page.locator('input[type="file"]').setInputFiles(invalidCsvPath);
      await page.getByText('Validate CSV').click();
      await expect(page.getByTestId('validation-title')).toBeVisible({ timeout: 30000 });
      
      // Try to execute migration
      await page.getByTestId('execute-migration-button').click();
      
      // Check confirmation dialog appears
      await expect(page.getByTestId('confirmation-title')).toBeVisible();
      await expect(page.getByTestId('confirmation-title')).toContainText('Confirm Migration with Errors');
      await expect(page.getByTestId('confirmation-description')).toContainText('There are validation errors in your data');
      
      // Cancel migration
      await page.getByTestId('cancel-button').click();
      await expect(page.getByTestId('confirmation-dialog')).not.toBeVisible();
      
      // Try again and confirm
      await page.getByTestId('execute-migration-button').click();
      await page.getByTestId('confirm-migration-button').click();
      
      // Wait for migration to complete
      await expect(page.getByTestId('migration-results-title')).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId('migration-results-title')).toContainText('Migration completed');
    });
  });

  test.describe('Migration Status Tab', () => {
    test('should display migration statistics', async ({ page }) => {
      // Switch to migration status tab
      await page.getByTestId('tab-migration-status').click();
      
      // Wait for the stats to load
      await expect(page.getByTestId('total-migrations-card')).toBeVisible({ timeout: 10000 });
      
      // Check statistics cards are visible
      await expect(page.getByTestId('total-migrations-card').locator('text=Total Migrations')).toBeVisible();
      await expect(page.getByTestId('successful-migrations-card').locator('text=Successful')).toBeVisible();
      await expect(page.getByTestId('failed-migrations-card').locator('text=Failed')).toBeVisible();
      await expect(page.getByTestId('last-migration-card').locator('text=Last Migration')).toBeVisible();
    });

    test('should show recent migration activity', async ({ page }) => {
      // Switch to migration status tab
      await page.getByTestId('tab-migration-status').click();
      
      // Check recent activity section
      await expect(page.getByTestId('recent-migration-activity')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Recent Migration Activity')).toBeVisible();
    });
  });

  test.describe('User Invitations Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we have migrated users by running a quick migration
      const validCsvPath = path.join(__dirname, '../fixtures/migration-test-data.csv');
      await page.locator('input[type="file"]').setInputFiles(validCsvPath);
      await page.getByText('Validate CSV').click();
      await expect(page.getByTestId('validation-title')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('execute-migration-button').click();
      await expect(page.getByTestId('migration-results-title')).toBeVisible({ timeout: 15000 });
      
      // Switch to invitations tab
      await page.getByTestId('tab-user-invitations').click();
    });

    test('should display invitation statistics', async ({ page }) => {
      // Wait for the statistics cards to load
      await expect(page.getByTestId('total-migrated-card')).toBeVisible({ timeout: 10000 });
      
      // Check statistics cards are present
      await expect(page.getByTestId('total-migrated-card').locator('text=Total Migrated')).toBeVisible();
      await expect(page.getByTestId('pending-invitations-card').locator('text=Pending')).toBeVisible();
      await expect(page.getByTestId('invited-users-card').locator('text=Invited')).toBeVisible();
      await expect(page.getByTestId('expired-invitations-card').locator('text=Expired')).toBeVisible();
      await expect(page.getByTestId('completed-registrations-card').locator('text=Completed')).toBeVisible();
    });

    test('should show migrated users list', async ({ page }) => {
      // Wait for users to load
      await expect(page.getByTestId('total-migrated-card')).toBeVisible({ timeout: 10000 });
      
      // Check users are displayed
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
      await expect(page.locator('text=sarah.smith@test.com')).toBeVisible();
      
      // Check status badges (look for badge with pending status)
      await expect(page.locator('[data-slot="badge"]').locator('text=Pending').first()).toBeVisible();
    });

    test('should filter users by status', async ({ page }) => {
      // Wait for users to load first
      await expect(page.getByTestId('total-migrated-card')).toBeVisible({ timeout: 10000 });
      
      // Test filter dropdown
      await page.getByTestId('filter-status-select').selectOption('pending');
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
      
      await page.getByTestId('filter-status-select').selectOption('all');
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
    });

    test('should search users by email', async ({ page }) => {
      // Wait for users to load first
      await expect(page.getByTestId('total-migrated-card')).toBeVisible({ timeout: 10000 });
      
      // Test search functionality
      await page.getByTestId('search-users-input').fill('john.doe');
      await expect(page.locator('text=john.doe@test.com')).toBeVisible();
      await expect(page.locator('text=sarah.smith@test.com')).not.toBeVisible();
      
      // Clear search
      await page.getByTestId('search-users-input').fill('');
      await expect(page.locator('text=sarah.smith@test.com')).toBeVisible();
    });

    test('should select and send invitations', async ({ page }) => {
      // Wait for users to load first
      await expect(page.getByTestId('total-migrated-card')).toBeVisible({ timeout: 10000 });
      
      // Skip if no migrated users exist
      const totalMigratedCard = page.getByTestId('total-migrated-card');
      const totalText = await totalMigratedCard.textContent();
      const totalUsers = parseInt(totalText?.match(/\d+/)?.[0] || '0');
      
      if (totalUsers === 0) {
        test.skip(true, 'No migrated users available to send invitations to');
      }
      
      // Check if there are user checkboxes available
      const userCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await userCheckboxes.count();
      
      if (checkboxCount <= 1) {
        test.skip(true, 'No user checkboxes available - no migrated users found');
      }
      
      // Select first user checkbox (skip select all checkbox)
      await userCheckboxes.nth(1).check({ force: true });
      
      // Check send button is enabled
      const sendButton = page.getByTestId('send-invitations-button');
      await expect(sendButton).toBeEnabled();
      
      // Send invitations
      await sendButton.click();
      
      // Wait for invitations to be sent
      await expect(page.locator('text=Successfully sent')).toBeVisible({ timeout: 10000 });
      
      // Check registration URLs dialog appears
      await expect(page.getByTestId('registration-urls-dialog')).toBeVisible();
      await expect(page.locator('text=Registration URLs Generated')).toBeVisible();
      
      // Check copy functionality
      await expect(page.getByTestId('copy-all-urls-button')).toBeVisible();
      
      // Close dialog
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('registration-urls-dialog')).not.toBeVisible();
    });

    test('should send invitations without custom message template', async ({ page }) => {
      // Wait for users to load first
      await expect(page.getByTestId('total-migrated-card')).toBeVisible({ timeout: 10000 });
      
      // Verify custom message textarea is NOT present (removed functionality)
      await expect(page.getByTestId('custom-message-textarea')).not.toBeVisible();
      
      // Skip if no migrated users exist
      const totalMigratedCard = page.getByTestId('total-migrated-card');
      const totalText = await totalMigratedCard.textContent();
      const totalUsers = parseInt(totalText?.match(/\d+/)?.[0] || '0');
      
      if (totalUsers === 0) {
        test.skip(true, 'No migrated users available to send invitations to');
      }
      
      // Check if there are user checkboxes available
      const userCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await userCheckboxes.count();
      
      if (checkboxCount <= 1) {
        test.skip(true, 'No user checkboxes available - no migrated users found');
      }
      
      // Select first user checkbox (skip select all checkbox)
      await userCheckboxes.nth(1).check({ force: true });
      
      await page.getByTestId('send-invitations-button').click();
      
      // Verify invitation sent successfully (using Campaign Monitor templates)
      await expect(page.locator('text=Successfully sent')).toBeVisible({ timeout: 10000 });
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
        // The error message now appears as a toast notification
        await expect(page.locator('text=Please select a CSV file')).toBeVisible();
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
      await page.getByText('Validate CSV').click();
      
      // Check error message appears as toast
      await expect(page.locator('text=Failed to validate CSV file')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check tabs are still functional
      await expect(page.locator('text=Upload CSV')).toBeVisible();
      
      // The file input is hidden by design, so check that it's present in DOM but not visible
      await expect(page.locator('input[type="file"]')).toBeHidden();
      
      // Check that the drag/drop area is visible instead
      await expect(page.locator('text=Drop your CSV file here')).toBeVisible();
      
      // Check statistics cards stack properly
      await page.getByTestId('tab-user-invitations').click();
      await expect(page.locator('text=Total Migrated')).toBeVisible({ timeout: 10000 });
    });
  });
});