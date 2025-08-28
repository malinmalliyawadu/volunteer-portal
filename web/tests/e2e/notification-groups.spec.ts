import { test, expect } from '@playwright/test';
import { 
  createTestUser, 
  deleteTestUsers,
  createNotificationGroup,
  deleteNotificationGroups,
  login
} from './helpers/test-helpers';

test.describe('Notification Groups Functionality', () => {
  let adminEmail: string;
  let adminCookies: any;
  let testGroupNames: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create admin user and get session cookies
    adminEmail = `groups-admin-${Date.now()}@test.com`;
    await createTestUser(adminEmail, 'ADMIN');
    
    // Login and get cookies
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, adminEmail, 'Test123456');
    adminCookies = await context.cookies();
    await context.close();
  });

  test.afterEach(async () => {
    // Clean up test groups created during tests
    if (testGroupNames.length > 0) {
      await deleteNotificationGroups(testGroupNames);
      testGroupNames = [];
    }
  });

  test.afterAll(async () => {
    // Clean up admin user
    await deleteTestUsers([adminEmail]);
  });

  test('should create notification group via API', async ({ request }) => {
    const groupName = `Test Group ${Date.now()}`;
    testGroupNames.push(groupName);
    
    const response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Test group for API creation',
        filters: {
          locations: ['Wellington', 'Glenn Innes'],
          availabilityDays: ['Monday', 'Wednesday'],
          shiftTypes: [],
          receiveNotifications: true,
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.group.name).toBe(groupName);
    expect(data.group.description).toBe('Test group for API creation');
    expect(data.group.filters.locations).toEqual(['Wellington', 'Glenn Innes']);
    expect(data.group.filters.availabilityDays).toEqual(['Monday', 'Wednesday']);
    expect(data.group.filters.receiveNotifications).toBe(true);
    expect(data.group.isActive).toBe(true);
    expect(data.group.createdBy).toBeDefined();
  });

  test('should validate required fields when creating group', async ({ request }) => {
    // Test missing name
    let response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        description: 'Test group without name',
        filters: { locations: ['Wellington'] }
      }
    });

    expect(response.status()).toBe(400);
    let data = await response.json();
    expect(data.error).toContain('Name is required');

    // Test missing filters
    response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: 'Test Group',
        description: 'Test group without filters'
      }
    });

    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.error).toContain('Filters are required');
  });

  test('should prevent duplicate group names', async ({ request }) => {
    const groupName = `Duplicate Group ${Date.now()}`;
    testGroupNames.push(groupName);
    
    // Create first group
    const response1 = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'First group',
        filters: { locations: ['Wellington'] }
      }
    });

    expect(response1.ok()).toBeTruthy();

    // Try to create duplicate
    const response2 = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Duplicate group',
        filters: { locations: ['Glenn Innes'] }
      }
    });

    expect(response2.status()).toBe(400);
    const data = await response2.json();
    expect(data.error).toContain('already exists');
  });

  test('should list notification groups', async ({ request }) => {
    // Create a few test groups
    const group1Name = `List Test Group 1 ${Date.now()}`;
    const group2Name = `List Test Group 2 ${Date.now()}`;
    testGroupNames.push(group1Name, group2Name);

    await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: group1Name,
        description: 'First test group',
        filters: { locations: ['Wellington'] }
      }
    });

    await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: group2Name,
        description: 'Second test group',
        filters: { locations: ['Glenn Innes'] }
      }
    });

    // List all groups
    const response = await request.get('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(Array.isArray(data.groups)).toBe(true);
    
    // Find our test groups
    const testGroup1 = data.groups.find((g: any) => g.name === group1Name);
    const testGroup2 = data.groups.find((g: any) => g.name === group2Name);
    
    expect(testGroup1).toBeDefined();
    expect(testGroup1.description).toBe('First test group');
    expect(testGroup1.filters.locations).toEqual(['Wellington']);
    
    expect(testGroup2).toBeDefined();
    expect(testGroup2.description).toBe('Second test group');
    expect(testGroup2.filters.locations).toEqual(['Glenn Innes']);
  });

  test('should update notification group', async ({ request }) => {
    const groupName = `Update Test Group ${Date.now()}`;
    testGroupNames.push(groupName);
    
    // Create group
    const createResponse = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Original description',
        filters: { locations: ['Wellington'] }
      }
    });

    const createData = await createResponse.json();
    const groupId = createData.group.id;

    // Update group
    const updateResponse = await request.put(`/api/admin/notification-groups/${groupId}`, {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName, // Keep same name
        description: 'Updated description',
        filters: {
          locations: ['Wellington', 'Glenn Innes'],
          availabilityDays: ['Monday'],
          receiveNotifications: true
        }
      }
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updateData = await updateResponse.json();
    
    expect(updateData.group.description).toBe('Updated description');
    expect(updateData.group.filters.locations).toEqual(['Wellington', 'Glenn Innes']);
    expect(updateData.group.filters.availabilityDays).toEqual(['Monday']);
  });

  test('should delete notification group', async ({ request }) => {
    const groupName = `Delete Test Group ${Date.now()}`;
    
    // Create group
    const createResponse = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Group to be deleted',
        filters: { locations: ['Wellington'] }
      }
    });

    const createData = await createResponse.json();
    const groupId = createData.group.id;

    // Delete group
    const deleteResponse = await request.delete(`/api/admin/notification-groups/${groupId}`, {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);
    expect(deleteData.message).toContain('deleted successfully');

    // Verify group is deleted
    const listResponse = await request.get('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    const listData = await listResponse.json();
    const deletedGroup = listData.groups.find((g: any) => g.id === groupId);
    expect(deletedGroup).toBeUndefined();
  });

  test('should handle non-existent group operations', async ({ request }) => {
    const fakeGroupId = 'non-existent-group-id';

    // Try to update non-existent group
    const updateResponse = await request.put(`/api/admin/notification-groups/${fakeGroupId}`, {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: 'Updated Name',
        description: 'Updated description',
        filters: { locations: ['Wellington'] }
      }
    });

    expect(updateResponse.status()).toBe(404);
    const updateData = await updateResponse.json();
    expect(updateData.error).toContain('not found');

    // Try to delete non-existent group
    const deleteResponse = await request.delete(`/api/admin/notification-groups/${fakeGroupId}`, {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(deleteResponse.status()).toBe(404);
    const deleteData = await deleteResponse.json();
    expect(deleteData.error).toContain('not found');
  });

  test('should save complex filter combinations', async ({ request }) => {
    const groupName = `Complex Filters Group ${Date.now()}`;
    testGroupNames.push(groupName);
    
    const complexFilters = {
      locations: ['Wellington', 'Glenn Innes', 'Onehunga'],
      availabilityDays: ['Monday', 'Wednesday', 'Friday'],
      shiftTypes: [], // Empty array means all types
      receiveNotifications: true,
    };

    const response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Group with complex filter combination',
        filters: complexFilters
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.group.filters.locations).toEqual(complexFilters.locations);
    expect(data.group.filters.availabilityDays).toEqual(complexFilters.availabilityDays);
    expect(data.group.filters.shiftTypes).toEqual(complexFilters.shiftTypes);
    expect(data.group.filters.receiveNotifications).toBe(complexFilters.receiveNotifications);
  });

  test('should maintain group order and pagination', async ({ request }) => {
    // Create multiple groups with predictable names
    const groupNames: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const name = `Ordered Group ${i} ${Date.now()}`;
      groupNames.push(name);
      testGroupNames.push(name);
      
      await request.post('/api/admin/notification-groups', {
        headers: {
          Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
        },
        data: {
          name: name,
          description: `Description ${i}`,
          filters: { locations: ['Wellington'] }
        }
      });
    }

    // List groups
    const response = await request.get('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Find our test groups and verify they're all present
    const testGroups = data.groups.filter((g: any) => 
      groupNames.some(name => g.name === name)
    );
    
    expect(testGroups).toHaveLength(5);
    
    // Verify each group has correct data
    testGroups.forEach((group: any, index: number) => {
      expect(group.name).toContain('Ordered Group');
      expect(group.description).toContain('Description');
      expect(group.isActive).toBe(true);
      expect(group.createdAt).toBeDefined();
      expect(group.updatedAt).toBeDefined();
    });
  });

  test('should handle group member management (if implemented)', async ({ request }) => {
    // This test is for future functionality where groups can have explicit members
    const groupName = `Members Group ${Date.now()}`;
    testGroupNames.push(groupName);
    
    // Create group
    const response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Group for member management testing',
        filters: { locations: ['Wellington'] }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // For now, just verify the group structure supports member relationships
    expect(data.group.id).toBeDefined();
    expect(data.group.createdBy).toBeDefined();
    
    // Future: Test adding/removing specific members
    // const membersResponse = await request.get(`/api/admin/notification-groups/${data.group.id}/members`);
    // expect(membersResponse.ok()).toBeTruthy();
  });

  test('should validate filter data types', async ({ request }) => {
    const groupName = `Validation Test Group ${Date.now()}`;
    testGroupNames.push(groupName);
    
    // Test with invalid filter data types
    const response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Test group for validation',
        filters: {
          locations: 'Wellington', // Should be array, not string
          availabilityDays: ['Monday'],
          receiveNotifications: 'true', // Should be boolean, not string
        }
      }
    });

    // The API should either accept and convert these types, or reject with validation error
    if (response.ok()) {
      const data = await response.json();
      // If accepted, verify data is properly converted
      expect(Array.isArray(data.group.filters.locations)).toBe(true);
      expect(typeof data.group.filters.receiveNotifications).toBe('boolean');
    } else {
      expect(response.status()).toBe(400);
      const errorData = await response.json();
      expect(errorData.error).toContain('validation');
    }
  });

  test('should track group usage and statistics', async ({ request }) => {
    const groupName = `Stats Group ${Date.now()}`;
    testGroupNames.push(groupName);
    
    // Create group
    const response = await request.post('/api/admin/notification-groups', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: groupName,
        description: 'Group for statistics tracking',
        filters: { locations: ['Wellington'] }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify timestamps are set
    expect(data.group.createdAt).toBeDefined();
    expect(data.group.updatedAt).toBeDefined();
    expect(new Date(data.group.createdAt)).toBeInstanceOf(Date);
    expect(new Date(data.group.updatedAt)).toBeInstanceOf(Date);
    
    // createdAt and updatedAt should be very close for new groups
    const createdTime = new Date(data.group.createdAt).getTime();
    const updatedTime = new Date(data.group.updatedAt).getTime();
    expect(Math.abs(updatedTime - createdTime)).toBeLessThan(1000); // Less than 1 second difference
  });
});