import { test, expect } from '@playwright/test';
import { 
  login, 
  ensureAdmin, 
  createTestUser, 
  deleteTestUsers,
  createShift,
  deleteTestShifts 
} from './helpers/test-helpers';

test.describe('Admin Shift Shortage Notifications', () => {
  let adminEmail: string;
  let volunteerEmails: string[] = [];
  let shiftId: string;

  test.beforeEach(async ({ page }) => {
    // Create admin user
    adminEmail = `admin-notify-${Date.now()}@test.com`;
    await createTestUser(adminEmail, 'ADMIN');

    // Create test volunteers with different preferences
    const baseTime = Date.now();
    
    // Volunteer 1: Wellington, Monday/Wednesday, opted in
    volunteerEmails.push(`volunteer1-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[0], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Wellington']),
      availableDays: JSON.stringify(['Monday', 'Wednesday']),
      receiveShortageNotifications: true,
      excludedShortageNotificationTypes: [],
    });

    // Volunteer 2: Glenn Innes, Tuesday/Thursday, opted in
    volunteerEmails.push(`volunteer2-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[1], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Glenn Innes']),
      availableDays: JSON.stringify(['Tuesday', 'Thursday']),
      receiveShortageNotifications: true,
      excludedShortageNotificationTypes: [],
    });

    // Volunteer 3: Wellington, Monday, opted out
    volunteerEmails.push(`volunteer3-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[2], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Wellington']),
      availableDays: JSON.stringify(['Monday']),
      receiveShortageNotifications: false,
      excludedShortageNotificationTypes: [],
    });

    // Create a test shift
    const shiftData = await createShift({
      location: 'Wellington',
      start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      capacity: 10
    });
    shiftId = shiftData.id;

    // Login as admin
    await login(page, adminEmail, 'Test123456');
    await ensureAdmin(page);
  });

  test.afterEach(async () => {
    // Clean up test data
    await deleteTestUsers([adminEmail, ...volunteerEmails]);
    if (shiftId) {
      await deleteTestShifts([shiftId]);
    }
  });

  test('should load notifications page and show filters', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Check page title
    await expect(page.getByRole('heading', { name: 'Shift Shortage Notifications' })).toBeVisible();
    
    // Check filter sections
    await expect(page.getByTestId('shift-filter-section')).toBeVisible();
    await expect(page.getByTestId('volunteer-filter-section')).toBeVisible();
    
    // Check shift selection dropdown
    await expect(page.getByTestId('shift-select')).toBeVisible();
    
    // Check volunteer filters
    await expect(page.getByTestId('location-filter')).toBeVisible();
    await expect(page.getByTestId('availability-filter')).toBeVisible();
    await expect(page.getByTestId('shift-type-filter')).toBeVisible();
  });

  test('should filter volunteers based on location', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Filter by Wellington location
    await page.getByTestId('location-filter').click();
    await page.getByLabel('Wellington').check();
    await page.keyboard.press('Escape');
    
    // Check volunteer count - should show 1 (volunteer1, not volunteer3 who opted out)
    await expect(page.getByTestId('volunteer-count')).toContainText('1 volunteers match filters');
    
    // Filter by Glenn Innes location
    await page.getByTestId('location-filter').click();
    await page.getByLabel('Wellington').uncheck();
    await page.getByLabel('Glenn Innes').check();
    await page.keyboard.press('Escape');
    
    // Check volunteer count - should show 1 (volunteer2)
    await expect(page.getByTestId('volunteer-count')).toContainText('1 volunteers match filters');
  });

  test('should filter volunteers based on availability', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Filter by Monday availability
    await page.getByTestId('availability-filter').click();
    await page.getByLabel('Monday').check();
    await page.keyboard.press('Escape');
    
    // Check volunteer count - should show 1 (volunteer1, not volunteer3 who opted out)
    await expect(page.getByTestId('volunteer-count')).toContainText('1 volunteers match filters');
    
    // Add Wednesday availability
    await page.getByTestId('availability-filter').click();
    await page.getByLabel('Wednesday').check();
    await page.keyboard.press('Escape');
    
    // Should still show 1 (volunteer1 has both days)
    await expect(page.getByTestId('volunteer-count')).toContainText('1 volunteers match filters');
  });

  test('should only show volunteers who opted in for notifications', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Toggle notification filter off to see all volunteers
    await page.getByTestId('notification-filter-toggle').click();
    
    // Should now include opted-out volunteers
    await expect(page.getByTestId('volunteer-count')).toContainText('3 volunteers match filters');
    
    // Toggle back on
    await page.getByTestId('notification-filter-toggle').click();
    
    // Should exclude opted-out volunteers
    await expect(page.getByTestId('volunteer-count')).toContainText('2 volunteers match filters');
  });

  test('should show email preview with correct recipient count', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Filter to get specific volunteers
    await page.getByTestId('location-filter').click();
    await page.getByLabel('Wellington').check();
    await page.keyboard.press('Escape');
    
    // Check email preview section
    await expect(page.getByTestId('email-preview-section')).toBeVisible();
    await expect(page.getByTestId('email-preview-recipient-count')).toContainText('1 recipient');
    
    // Check preview content includes shift details
    const previewContent = page.getByTestId('email-preview-content');
    await expect(previewContent).toContainText('Wellington');
    await expect(previewContent).toContainText('We need your help!');
  });

  test('should save and load notification groups', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Set up filters
    await page.getByTestId('location-filter').click();
    await page.getByLabel('Wellington').check();
    await page.keyboard.press('Escape');
    
    // Save as group
    await page.getByTestId('save-group-button').click();
    await page.getByTestId('group-name-input').fill('Wellington Monday Volunteers');
    await page.getByTestId('group-description-input').fill('Volunteers available in Wellington on Mondays');
    await page.getByTestId('confirm-save-group').click();
    
    // Check success message
    await expect(page.getByTestId('success-message')).toContainText('Group saved successfully');
    
    // Clear filters
    await page.getByTestId('clear-filters-button').click();
    
    // Load the saved group
    await page.getByTestId('load-group-select').click();
    await page.getByRole('option', { name: 'Wellington Monday Volunteers' }).click();
    await page.getByTestId('load-group-button').click();
    
    // Verify filters are restored
    await expect(page.getByTestId('volunteer-count')).toContainText('1 volunteers match filters');
  });

  test('should send test notification email', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Set up filters to get at least one volunteer
    await page.getByTestId('location-filter').click();
    await page.getByLabel('Wellington').check();
    await page.keyboard.press('Escape');
    
    // Send test email
    await page.getByTestId('send-test-email-button').click();
    
    // Confirm in dialog
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await expect(page.getByTestId('confirm-dialog-message')).toContainText('send a test email to 1 volunteer');
    await page.getByTestId('confirm-send-button').click();
    
    // Check success message
    await expect(page.getByTestId('success-message')).toContainText('Test email sent successfully');
  });

  test('should handle send notification with confirmation', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Set up filters
    await page.getByTestId('location-filter').click();
    await page.getByLabel('Glenn Innes').check();
    await page.keyboard.press('Escape');
    
    // Click send notification
    await page.getByTestId('send-notification-button').click();
    
    // Check confirmation dialog shows correct count
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await expect(page.getByTestId('confirm-dialog-message')).toContainText('send shortage notification to 1 volunteer');
    
    // Cancel first
    await page.getByTestId('cancel-send-button').click();
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible();
    
    // Send again and confirm
    await page.getByTestId('send-notification-button').click();
    await page.getByTestId('confirm-send-button').click();
    
    // Check success message
    await expect(page.getByTestId('success-message')).toContainText('Notifications sent successfully');
  });

  test('should show appropriate message when no volunteers match', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Select a shift
    await page.getByTestId('shift-select').click();
    await page.getByRole('option').first().click();
    
    // Set filters that match no one
    await page.getByTestId('location-filter').click();
    await page.getByLabel('Onehunga').check();
    await page.keyboard.press('Escape');
    
    await page.getByTestId('availability-filter').click();
    await page.getByLabel('Saturday').check();
    await page.keyboard.press('Escape');
    
    // Check no volunteers message
    await expect(page.getByTestId('volunteer-count')).toContainText('0 volunteers match filters');
    await expect(page.getByTestId('no-volunteers-message')).toBeVisible();
    
    // Send button should be disabled
    await expect(page.getByTestId('send-notification-button')).toBeDisabled();
  });

  test('should handle notification groups when empty', async ({ page }) => {
    await page.goto('/admin/notifications');
    
    // Check that load group shows empty state
    await page.getByTestId('load-group-select').click();
    await expect(page.getByRole('option', { name: 'No saved groups' })).toBeVisible();
    
    // Load button should be disabled
    await expect(page.getByTestId('load-group-button')).toBeDisabled();
  });
});