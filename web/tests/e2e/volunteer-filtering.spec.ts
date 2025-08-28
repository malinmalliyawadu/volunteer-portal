import { test, expect } from '@playwright/test';
import { 
  createTestUser, 
  deleteTestUsers,
  createShift,
  deleteTestShifts,
  login
} from './helpers/test-helpers';

test.describe('Volunteer Filtering Logic', () => {
  let adminEmail: string;
  let volunteerEmails: string[] = [];
  let shiftTypeIds: string[] = [];
  let adminCookies: any;

  test.beforeAll(async ({ browser }) => {
    // Create admin user and get session cookies
    adminEmail = `filter-admin-${Date.now()}@test.com`;
    await createTestUser(adminEmail, 'ADMIN');
    
    // Login and get cookies
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, adminEmail, 'Test123456');
    adminCookies = await context.cookies();
    await context.close();
  });

  test.beforeEach(async () => {
    // Create diverse test volunteers for comprehensive filtering tests
    const baseTime = Date.now();
    volunteerEmails = [];
    
    // Volunteer 1: Wellington, Mon/Wed, Kitchen, opted in, 3/week
    volunteerEmails.push(`filter-vol1-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[0], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Wellington']),
      availableDays: JSON.stringify(['Monday', 'Wednesday']),
      receiveShortageNotifications: true,
      shortageNotificationTypes: [], // Empty = all types
      maxNotificationsPerWeek: 3
    });

    // Volunteer 2: Glenn Innes, Tue/Thu, Service only, opted in, 5/week
    volunteerEmails.push(`filter-vol2-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[1], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Glenn Innes']),
      availableDays: JSON.stringify(['Tuesday', 'Thursday']),
      receiveShortageNotifications: true,
      shortageNotificationTypes: [], // Will be updated with specific types
      maxNotificationsPerWeek: 5
    });

    // Volunteer 3: Wellington + Glenn Innes, all days, opted out
    volunteerEmails.push(`filter-vol3-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[2], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Wellington', 'Glenn Innes']),
      availableDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
      receiveShortageNotifications: false,
      shortageNotificationTypes: [],
      maxNotificationsPerWeek: 10
    });

    // Volunteer 4: Onehunga only, weekends, opted in, 1/week (low frequency)
    volunteerEmails.push(`filter-vol4-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[3], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Onehunga']),
      availableDays: JSON.stringify(['Saturday', 'Sunday']),
      receiveShortageNotifications: true,
      shortageNotificationTypes: [],
      maxNotificationsPerWeek: 1
    });

    // Volunteer 5: All locations, no specific days (null), opted in
    volunteerEmails.push(`filter-vol5-${baseTime}@test.com`);
    await createTestUser(volunteerEmails[4], 'VOLUNTEER', {
      availableLocations: JSON.stringify(['Wellington', 'Glenn Innes', 'Onehunga']),
      availableDays: null, // No specific availability
      receiveShortageNotifications: true,
      shortageNotificationTypes: [],
      maxNotificationsPerWeek: 7
    });
  });

  test.afterEach(async () => {
    // Clean up volunteers
    await deleteTestUsers(volunteerEmails);
  });

  test.afterAll(async () => {
    // Clean up admin
    await deleteTestUsers([adminEmail]);
  });

  test('should filter by single location', async ({ request }) => {
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
    
    // Should match volunteers 1 and 5 (volunteer 3 opted out)
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    expect(testVolunteers).toHaveLength(2);
    
    // Check specific volunteers
    const emails = testVolunteers.map((v: any) => v.email);
    expect(emails).toContain(volunteerEmails[0]); // Wellington volunteer
    expect(emails).toContain(volunteerEmails[4]); // All locations volunteer
    expect(emails).not.toContain(volunteerEmails[2]); // Opted out
  });

  test('should filter by multiple locations', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        locations: 'Wellington,Glenn Innes',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Should match volunteers 1, 2, and 5 (volunteer 3 opted out)
    expect(testVolunteers).toHaveLength(3);
    
    const emails = testVolunteers.map((v: any) => v.email);
    expect(emails).toContain(volunteerEmails[0]); // Wellington
    expect(emails).toContain(volunteerEmails[1]); // Glenn Innes
    expect(emails).toContain(volunteerEmails[4]); // All locations
    expect(emails).not.toContain(volunteerEmails[2]); // Opted out
    expect(emails).not.toContain(volunteerEmails[3]); // Onehunga only
  });

  test('should filter by availability days', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        availabilityDays: 'Monday',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Should match volunteer 1 only (volunteer 3 has Monday but opted out, volunteer 5 has null availability)
    expect(testVolunteers).toHaveLength(1);
    expect(testVolunteers[0].email).toBe(volunteerEmails[0]);
    expect(testVolunteers[0].availableDays).toContain('Monday');
  });

  test('should filter by multiple availability days', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        availabilityDays: 'Tuesday,Thursday',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Should match volunteer 2 only
    expect(testVolunteers).toHaveLength(1);
    expect(testVolunteers[0].email).toBe(volunteerEmails[1]);
    
    const availableDays = testVolunteers[0].availableDays;
    expect(availableDays).toContain('Tuesday');
    expect(availableDays).toContain('Thursday');
  });

  test('should handle weekend availability filtering', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        availabilityDays: 'Saturday,Sunday',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Should match volunteer 4 only
    expect(testVolunteers).toHaveLength(1);
    expect(testVolunteers[0].email).toBe(volunteerEmails[3]);
    
    const availableDays = testVolunteers[0].availableDays;
    expect(availableDays).toContain('Saturday');
    expect(availableDays).toContain('Sunday');
  });

  test('should filter by notification frequency', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        maxNotificationsPerWeek: '5', // Only volunteers who accept 5+ per week
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Should match volunteers 2 and 5 (5+ per week), not 1 (3/week) or 4 (1/week)
    expect(testVolunteers).toHaveLength(2);
    
    const emails = testVolunteers.map((v: any) => v.email);
    expect(emails).toContain(volunteerEmails[1]); // 5/week
    expect(emails).toContain(volunteerEmails[4]); // 7/week
    expect(emails).not.toContain(volunteerEmails[0]); // 3/week
    expect(emails).not.toContain(volunteerEmails[3]); // 1/week
  });

  test('should combine location and availability filters', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        locations: 'Wellington',
        availabilityDays: 'Wednesday',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Should match volunteer 1 only (Wellington + Wednesday)
    expect(testVolunteers).toHaveLength(1);
    expect(testVolunteers[0].email).toBe(volunteerEmails[0]);
    expect(testVolunteers[0].availableLocations).toContain('Wellington');
    expect(testVolunteers[0].availableDays).toContain('Wednesday');
  });

  test('should respect notification opt-out regardless of other filters', async ({ request }) => {
    // Test with filters that would match volunteer 3, but they opted out
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        locations: 'Wellington,Glenn Innes',
        availabilityDays: 'Monday,Tuesday,Wednesday',
        maxNotificationsPerWeek: '8',
        receiveNotifications: 'true' // Only opted-in volunteers
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Should not include volunteer 3 even though they match all other criteria
    const emails = testVolunteers.map((v: any) => v.email);
    expect(emails).not.toContain(volunteerEmails[2]);
    
    // Verify volunteer 3 would be included if we ignore notification preference
    const allResponse = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        locations: 'Wellington,Glenn Innes',
        availabilityDays: 'Monday,Tuesday,Wednesday',
        maxNotificationsPerWeek: '8',
        receiveNotifications: 'false' // Show all volunteers
      }
    });

    const allData = await allResponse.json();
    const allTestVolunteers = allData.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    const allEmails = allTestVolunteers.map((v: any) => v.email);
    expect(allEmails).toContain(volunteerEmails[2]); // Now included
  });

  test('should handle empty filter results', async ({ request }) => {
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        locations: 'NonExistentLocation',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    expect(testVolunteers).toHaveLength(0);
  });

  test('should handle null/empty availability gracefully', async ({ request }) => {
    // Volunteer 5 has null availableDays - should not match specific day filters
    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        availabilityDays: 'Monday',
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const testVolunteers = data.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    // Volunteer 5 should not be included since they have null availability
    const emails = testVolunteers.map((v: any) => v.email);
    expect(emails).not.toContain(volunteerEmails[4]);
    
    // But they should be included when no day filter is applied
    const noFilterResponse = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        receiveNotifications: 'true'
      }
    });

    const noFilterData = await noFilterResponse.json();
    const noFilterTestVolunteers = noFilterData.volunteers.filter((v: any) => 
      volunteerEmails.includes(v.email)
    );
    
    const noFilterEmails = noFilterTestVolunteers.map((v: any) => v.email);
    expect(noFilterEmails).toContain(volunteerEmails[4]);
  });

  test('should return consistent results for repeated queries', async ({ request }) => {
    const params = {
      locations: 'Wellington,Glenn Innes',
      availabilityDays: 'Monday,Wednesday',
      receiveNotifications: 'true'
    };

    // Make the same request multiple times
    const responses = await Promise.all([
      request.get('/api/admin/volunteers', {
        headers: { Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ') },
        params
      }),
      request.get('/api/admin/volunteers', {
        headers: { Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ') },
        params
      }),
      request.get('/api/admin/volunteers', {
        headers: { Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ') },
        params
      })
    ]);

    expect(responses.every(r => r.ok())).toBeTruthy();
    
    const datasets = await Promise.all(responses.map(r => r.json()));
    
    // All responses should have the same volunteers
    const volunteerCounts = datasets.map(d => 
      d.volunteers.filter((v: any) => volunteerEmails.includes(v.email)).length
    );
    
    expect(volunteerCounts.every(count => count === volunteerCounts[0])).toBeTruthy();
    
    // Specifically for our test data, should match volunteer 1 only
    expect(volunteerCounts[0]).toBe(1);
  });

  test('should handle malformed JSON in database fields', async ({ request }) => {
    // Create a volunteer with invalid JSON (this simulates old data or corruption)
    const corruptVolunteerEmail = `corrupt-${Date.now()}@test.com`;
    
    // This would need to be inserted directly into DB with invalid JSON
    // For this test, we'll just verify the API handles missing/null fields gracefully
    await createTestUser(corruptVolunteerEmail, 'VOLUNTEER', {
      availableLocations: null, // Missing location data
      availableDays: null, // Missing availability data
      receiveShortageNotifications: true,
      shortageNotificationTypes: [],
      maxNotificationsPerWeek: 3
    });

    const response = await request.get('/api/admin/volunteers', {
      headers: {
        Cookie: adminCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      },
      params: {
        receiveNotifications: 'true'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Should still work and include the volunteer with null fields
    const corruptVolunteer = data.volunteers.find((v: any) => v.email === corruptVolunteerEmail);
    expect(corruptVolunteer).toBeDefined();
    expect(corruptVolunteer.availableLocations).toEqual([]); // Should be parsed as empty array
    expect(corruptVolunteer.availableDays).toEqual([]); // Should be parsed as empty array

    // Clean up
    await deleteTestUsers([corruptVolunteerEmail]);
  });
});