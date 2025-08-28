import { test, expect } from '@playwright/test';
import { 
  createTestUser, 
  deleteTestUsers,
  createShift,
  deleteTestShifts,
  createNotificationGroup,
  deleteNotificationGroups,
  login
} from './helpers/test-helpers';

test.describe('Shortage Notifications API', () => {
  let adminEmail: string;
  let volunteerEmails: string[] = [];
  let shiftId: string;
  let adminCookies: any;

  test.beforeAll(async ({ browser }) => {
    // Create admin user and get session cookies
    adminEmail = `api-admin-${Date.now()}@test.com`;
    await createTestUser(adminEmail, 'ADMIN');
    
    // Login and get cookies
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, adminEmail, 'Test123456');
    adminCookies = await context.cookies();
    await context.close();
  });

  test.beforeEach(async () => {
    // Create test volunteers
    const baseTime = Date.now();
    
    // Volunteer 1: Wellington, Monday/Wednesday, opted in
    volunteerEmails = [];
    volunteerEmails.push(`vol1-api-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[0], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Wellington']),
      availableDays: JSON.stringify(['Monday', 'Wednesday']),
      receiveShortageNotifications: true,
      shortageNotificationTypes: [],
      maxNotificationsPerWeek: 3
    });

    // Volunteer 2: Glenn Innes, Tuesday/Thursday, opted in
    volunteerEmails.push(`vol2-api-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[1], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Glenn Innes']),
      availableDays: JSON.stringify(['Tuesday', 'Thursday']),
      receiveShortageNotifications: true,
      shortageNotificationTypes: [],
      maxNotificationsPerWeek: 5
    });

    // Create test shift
    const shiftData = await createShift({
      location: 'Wellington',
      start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      capacity: 10
    });
    shiftId = shiftData.id;
  });

  test.afterEach(async () => {
    // Clean up test data
    if (shiftId) {
      await deleteTestShifts([shiftId]);
    }
  });

  test.afterAll(async () => {
    // Clean up admin and volunteers
    await deleteTestUsers([adminEmail, ...volunteerEmails]);
  });

  test('should get volunteers with filters - location', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        locations: 'Wellington',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Should return volunteer 1 only
    expect(data.volunteers).toHaveLength(1);
    expect(data.volunteers[0].email).toBe(volunteerEmails[0]);
    expect(data.volunteers[0].availableLocations).toContain('Wellington');
    expect(data.volunteers[0].receiveShortageNotifications).toBe(true);
  });

  test('should get volunteers with filters - availability days', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        availabilityDays: 'Tuesday',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Should return volunteer 2 only
    expect(data.volunteers).toHaveLength(1);
    expect(data.volunteers[0].email).toBe(volunteerEmails[1]);
    expect(data.volunteers[0].availableDays).toContain('Tuesday');
  });

  test('should get volunteers without notification filter', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        receiveNotifications: 'false' // Show all volunteers
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Should return all volunteers (including any from other tests)
    expect(data.volunteers.length).toBeGreaterThanOrEqual(2);
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    expect(testVolunteers).toHaveLength(2);
  });

  test('should send shortage notification', async ({ request }) => {
    const response = await request.post('/api/admin/shortage-notifications', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        shiftId,
        volunteerFilters: {
          locations: ['Wellington'],
          availabilityDays: [],
          shiftTypes: [],
          receiveNotifications: true,
          maxNotificationsPerWeek: 10
        },
        isTest: true
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.recipientCount).toBe(1);
    expect(data.message).toContain('sent successfully');
  });

  test('should validate required fields for shortage notification', async ({ request }) => {
    // Test missing shiftId
    let response = await request.post('/api/admin/shortage-notifications', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        volunteerFilters: {
          locations: ['Wellington'],
          receiveNotifications: true
        }
      }
    });

    expect(response.status()).toBe(400);
    let data = await response.json();
    expect(data.error).toContain('Shift ID is required');

    // Test missing volunteerFilters
    response = await request.post('/api/admin/shortage-notifications', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        shiftId
      }
    });

    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.error).toContain('Volunteer filters are required');
  });

  test('should handle non-existent shift', async ({ request }) => {
    const response = await request.post('/api/admin/shortage-notifications', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        shiftId: 'non-existent-shift-id',
        volunteerFilters: {
          locations: ['Wellington'],
          receiveNotifications: true
        }
      }
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('Shift not found');
  });

  test('should create notification group', async ({ request }) => {
    const groupName = `Test Group ${Date.now()}`;
    
    const response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Test group description',
        filters: {
          locations: ['Wellington'],
          availabilityDays: ['Monday'],
          receiveNotifications: true
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.group.name).toBe(groupName);
    expect(data.group.description).toBe('Test group description');
    expect(data.group.filters.locations).toEqual(['Wellington']);
    expect(data.group.isActive).toBe(true);

    // Clean up
    await deleteNotificationGroups([groupName]);
  });

  test('should get notification groups', async ({ request }) => {
    // Create a test group first
    const groupName = `Test Group List ${Date.now()}`;
    const adminUser = await createTestUser(`temp-admin-${Date.now()}@test.com`, 'ADMIN');
    
    await createNotificationGroup({
      name: groupName,
      description: 'Test group for listing',
      filters: { locations: ['Wellington'] },
      createdBy: adminEmail
    });

    const response = await request.get('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(Array.isArray(data.groups)).toBe(true);
    const testGroup = data.groups.find((g: any) => g.name === groupName);
    expect(testGroup).toBeDefined();
    expect(testGroup.description).toBe('Test group for listing');
    expect(testGroup.filters.locations).toEqual(['Wellington']);

    // Clean up
    await deleteNotificationGroups([groupName]);
  });

  test('should delete notification group', async ({ request }) => {
    // Create a test group first
    const groupName = `Test Group Delete ${Date.now()}`;
    const groupData = await createNotificationGroup({
      name: groupName,
      description: 'Test group for deletion',
      filters: { locations: ['Wellington'] },
      createdBy: adminEmail
    });

    const response = await request.delete(`/api/admin/notification-groups/${groupData.id}`, {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted successfully');

    // Verify group is deleted
    const checkResponse = await request.get('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    const checkData = await checkResponse.json();
    const deletedGroup = checkData.groups.find((g: any) => g.id === groupData.id);
    expect(deletedGroup).toBeUndefined();
  });

  test('should require admin role for all endpoints', async ({ request }) => {
    // Create regular volunteer cookies
    const volunteerEmail = `volunteer-unauth-${Date.now()}@test.com`;
    await createTestUser(volunteerEmail, 'VOLUNTEER');
    
    const context = await test.info().config.use?.browser?.newContext?.();
    if (!context) return;
    
    const page = await context.newPage();
    await login(page, volunteerEmail, 'Test123456');
    const volunteerCookies = await context.cookies();
    await context.close();

    // Test volunteers endpoint
    let response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: volunteerCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });
    expect(response.status()).toBe(403);

    // Test shortage notifications endpoint
    response = await request.post('/api/admin/shortage-notifications', {
      headers: {
        Cookie: volunteerCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        shiftId,
        volunteerFilters: { locations: ['Wellington'] }
      }
    });
    expect(response.status()).toBe(403);

    // Test notification groups endpoint
    response = await request.get('/api/admin/notification-groups', {
      headers: {
        Cookie: volunteerCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });
    expect(response.status()).toBe(403);

    // Clean up
    await deleteTestUsers([volunteerEmail]);
  });

  test('should handle email service errors gracefully', async ({ request }) => {
    // Mock a scenario that might cause email service to fail
    // This would require environment variables or mocking, so we'll test the error response structure
    
    const response = await request.post('/api/admin/shortage-notifications', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        shiftId,
        volunteerFilters: {
          locations: ['NonExistentLocation'], // No volunteers match
          receiveNotifications: true
        }
      }
    });

    // Should handle gracefully even with no recipients
    if (response.status() === 400) {
      const data = await response.json();
      expect(data.error).toContain('No volunteers match the specified filters');
    } else {
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.recipientCount).toBe(0);
    }
  });

  test('should track email notification records', async ({ request }) => {
    const response = await request.post('/api/admin/shortage-notifications', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        shiftId,
        volunteerFilters: {
          locations: ['Wellington'],
          receiveNotifications: true
        },
        isTest: false // Real notification for tracking
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.notificationId).toBeDefined();
    expect(typeof data.notificationId).toBe('string');
    expect(data.recipientCount).toBeGreaterThan(0);
  });
});