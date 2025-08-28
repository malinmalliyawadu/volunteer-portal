import { test, expect } from '@playwright/test';
import { loginAsVolunteer } from './helpers/auth';
import { 
  createTestUser, 
  deleteTestUsers,
  login
} from './helpers/test-helpers';

test.describe('User Notification Preferences', () => {
  let volunteerEmail: string;

  test.beforeEach(async () => {
    // Create a test volunteer
    volunteerEmail = `volunteer-prefs-${Date.now()}@test.com`;
    await createTestUser(volunteerEmail, 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Wellington']),
      availableDays: JSON.stringify(['Monday', 'Wednesday']),
      receiveShortageNotifications: true,
      shortageNotificationTypes: [],
      maxNotificationsPerWeek: 3
    });
  });

  test.afterEach(async () => {
    // Clean up test data
    if (volunteerEmail) {
      await deleteTestUsers([volunteerEmail]);
    }
  });

  test('should display notification preferences in profile', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Check that notification section exists
    await expect(page.getByTestId('notification-preferences-section')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Shift Shortage Notifications/i })).toBeVisible();
    
    // Check current preferences are displayed
    const notificationToggle = page.getByTestId('receive-notifications-toggle');
    await expect(notificationToggle).toBeVisible();
    await expect(notificationToggle).toBeChecked();
    
    // Check max notifications per week
    const maxNotificationsInput = page.getByTestId('max-notifications-input');
    await expect(maxNotificationsInput).toBeVisible();
    await expect(maxNotificationsInput).toHaveValue('3');
  });

  test('should edit notification preferences', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Click edit button
    await page.getByTestId('edit-notification-preferences').click();
    
    // Check edit form is visible
    await expect(page.getByTestId('notification-preferences-form')).toBeVisible();
    
    // Toggle off notifications
    await page.getByTestId('receive-notifications-toggle').click();
    
    // Change max notifications
    await page.getByTestId('max-notifications-input').clear();
    await page.getByTestId('max-notifications-input').fill('5');
    
    // Save changes
    await page.getByTestId('save-notification-preferences').click();
    
    // Check success message
    await expect(page.getByTestId('success-message')).toContainText('Notification preferences updated');
    
    // Verify changes persisted
    await page.reload();
    const notificationToggle = page.getByTestId('receive-notifications-toggle');
    await expect(notificationToggle).not.toBeChecked();
    await expect(page.getByTestId('max-notifications-input')).toHaveValue('5');
  });

  test('should manage shift type preferences', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Click edit button
    await page.getByTestId('edit-notification-preferences').click();
    
    // Open shift type preferences
    await page.getByTestId('shift-type-preferences-button').click();
    
    // Check that shift types are listed
    await expect(page.getByTestId('shift-type-list')).toBeVisible();
    
    // Select specific shift types
    await page.getByLabel('Kitchen').check();
    await page.getByLabel('Service').check();
    
    // Verify "All shift types" is unchecked when specific types selected
    const allTypesCheckbox = page.getByLabel('All shift types');
    await expect(allTypesCheckbox).not.toBeChecked();
    
    // Save changes
    await page.getByTestId('save-notification-preferences').click();
    
    // Check success message
    await expect(page.getByTestId('success-message')).toContainText('Notification preferences updated');
    
    // Verify changes persisted
    await page.reload();
    await page.getByTestId('edit-notification-preferences').click();
    await page.getByTestId('shift-type-preferences-button').click();
    
    await expect(page.getByLabel('Kitchen')).toBeChecked();
    await expect(page.getByLabel('Service')).toBeChecked();
    await expect(page.getByLabel('All shift types')).not.toBeChecked();
  });

  test('should select all shift types when "All" is selected', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Click edit button
    await page.getByTestId('edit-notification-preferences').click();
    
    // Open shift type preferences
    await page.getByTestId('shift-type-preferences-button').click();
    
    // First select some specific types
    await page.getByLabel('Kitchen').check();
    await page.getByLabel('Service').check();
    
    // Now select "All shift types"
    await page.getByLabel('All shift types').check();
    
    // Verify individual checkboxes are unchecked
    await expect(page.getByLabel('Kitchen')).not.toBeChecked();
    await expect(page.getByLabel('Service')).not.toBeChecked();
    
    // Save changes
    await page.getByTestId('save-notification-preferences').click();
    
    // Verify empty array saved (meaning all types)
    await page.reload();
    await page.getByTestId('edit-notification-preferences').click();
    await page.getByTestId('shift-type-preferences-button').click();
    
    await expect(page.getByLabel('All shift types')).toBeChecked();
  });

  test('should validate max notifications input', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Click edit button
    await page.getByTestId('edit-notification-preferences').click();
    
    // Try invalid values
    const maxNotificationsInput = page.getByTestId('max-notifications-input');
    
    // Test negative number
    await maxNotificationsInput.clear();
    await maxNotificationsInput.fill('-1');
    await page.getByTestId('save-notification-preferences').click();
    await expect(page.getByTestId('error-message')).toContainText('Must be at least 0');
    
    // Test too large number
    await maxNotificationsInput.clear();
    await maxNotificationsInput.fill('100');
    await page.getByTestId('save-notification-preferences').click();
    await expect(page.getByTestId('error-message')).toContainText('Cannot exceed 50');
    
    // Test valid number
    await maxNotificationsInput.clear();
    await maxNotificationsInput.fill('10');
    await page.getByTestId('save-notification-preferences').click();
    await expect(page.getByTestId('success-message')).toContainText('Notification preferences updated');
  });

  test('should disable all fields when notifications are turned off', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Click edit button
    await page.getByTestId('edit-notification-preferences').click();
    
    // Toggle off notifications
    await page.getByTestId('receive-notifications-toggle').click();
    
    // Check that other fields are disabled
    await expect(page.getByTestId('max-notifications-input')).toBeDisabled();
    await expect(page.getByTestId('shift-type-preferences-button')).toBeDisabled();
    
    // Save changes
    await page.getByTestId('save-notification-preferences').click();
    
    // Verify state persisted
    await page.reload();
    await page.getByTestId('edit-notification-preferences').click();
    
    await expect(page.getByTestId('receive-notifications-toggle')).not.toBeChecked();
    await expect(page.getByTestId('max-notifications-input')).toBeDisabled();
    await expect(page.getByTestId('shift-type-preferences-button')).toBeDisabled();
  });

  test('should display warning when opting out of notifications', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Click edit button
    await page.getByTestId('edit-notification-preferences').click();
    
    // Toggle off notifications
    await page.getByTestId('receive-notifications-toggle').click();
    
    // Check warning message appears
    await expect(page.getByTestId('opt-out-warning')).toBeVisible();
    await expect(page.getByTestId('opt-out-warning')).toContainText('You will not receive shortage notifications');
    
    // Toggle back on
    await page.getByTestId('receive-notifications-toggle').click();
    
    // Warning should disappear
    await expect(page.getByTestId('opt-out-warning')).not.toBeVisible();
  });

  test('should show notification frequency description', async ({ page }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Check that frequency description is shown
    await expect(page.getByTestId('notification-frequency-description')).toBeVisible();
    
    const description = page.getByTestId('notification-frequency-description');
    await expect(description).toContainText('You will receive up to 3 shortage notifications per week');
    
    // Edit and change the value
    await page.getByTestId('edit-notification-preferences').click();
    await page.getByTestId('max-notifications-input').clear();
    await page.getByTestId('max-notifications-input').fill('0');
    await page.getByTestId('save-notification-preferences').click();
    
    // Check description updates
    await expect(description).toContainText('You have opted out of shortage notifications');
  });

  test('should handle concurrent edits gracefully', async ({ page, context }) => {
    await login(page, volunteerEmail, 'Test123456');
    await page.goto('/profile');
    
    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/profile');
    
    // Start editing in both tabs
    await page.getByTestId('edit-notification-preferences').click();
    await page2.getByTestId('edit-notification-preferences').click();
    
    // Make different changes in each tab
    await page.getByTestId('max-notifications-input').clear();
    await page.getByTestId('max-notifications-input').fill('5');
    
    await page2.getByTestId('max-notifications-input').clear();
    await page2.getByTestId('max-notifications-input').fill('10');
    
    // Save first tab
    await page.getByTestId('save-notification-preferences').click();
    await expect(page.getByTestId('success-message')).toContainText('Notification preferences updated');
    
    // Try to save second tab
    await page2.getByTestId('save-notification-preferences').click();
    
    // Should either succeed (last write wins) or show conflict message
    const success = page2.getByTestId('success-message');
    const conflict = page2.getByTestId('conflict-message');
    
    // One of these should be visible
    await expect(success.or(conflict)).toBeVisible();
    
    // Close second tab
    await page2.close();
  });
});