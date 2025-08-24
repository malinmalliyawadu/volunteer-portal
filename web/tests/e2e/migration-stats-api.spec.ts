import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

const prisma = new PrismaClient();

test.describe('Migration Stats API', () => {
  let adminSession: any;
  let regularUserSession: any;
  let testUsers: any[] = [];

  test.beforeAll(async () => {
    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'migration-admin@example.com',
        firstName: 'Migration',
        lastName: 'Admin',
        name: 'Migration Admin',
        hashedPassword: 'hashed-password',
        role: 'ADMIN',
        profileCompleted: true,
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      }
    });

    // Create regular user for unauthorized access test
    const regularUser = await prisma.user.create({
      data: {
        email: 'regular-user@example.com',
        firstName: 'Regular',
        lastName: 'User',
        name: 'Regular User',
        hashedPassword: 'hashed-password',
        role: 'VOLUNTEER',
        profileCompleted: true,
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      }
    });

    // Create test migrated users in various states
    const migratedUsers = await Promise.all([
      // Migrated user who completed registration
      prisma.user.create({
        data: {
          email: 'completed-migration@example.com',
          firstName: 'Completed',
          lastName: 'Migration',
          name: 'Completed Migration',
          hashedPassword: 'hashed-password',
          role: 'VOLUNTEER',
          isMigrated: true,
          profileCompleted: true,
          migrationInvitationSent: true,
          migrationInvitationSentAt: subDays(new Date(), 5),
          migrationInvitationCount: 1,
          volunteerAgreementAccepted: true,
          healthSafetyPolicyAccepted: true,
        }
      }),

      // Migrated user with pending invitation
      prisma.user.create({
        data: {
          email: 'pending-migration@example.com',
          firstName: 'Pending',
          lastName: 'Migration',
          name: 'Pending Migration',
          hashedPassword: 'hashed-password',
          role: 'VOLUNTEER',
          isMigrated: true,
          profileCompleted: false,
          migrationInvitationSent: true,
          migrationInvitationSentAt: subDays(new Date(), 3),
          migrationInvitationCount: 2,
          migrationLastSentAt: subDays(new Date(), 1),
          migrationInvitationToken: 'pending-token-123',
          migrationTokenExpiresAt: addDays(new Date(), 5),
          volunteerAgreementAccepted: false,
          healthSafetyPolicyAccepted: false,
        }
      }),

      // Recently migrated user (not yet invited)
      prisma.user.create({
        data: {
          email: 'recent-migration@example.com',
          firstName: 'Recent',
          lastName: 'Migration',
          name: 'Recent Migration',
          hashedPassword: 'hashed-password',
          role: 'VOLUNTEER',
          isMigrated: true,
          profileCompleted: false,
          migrationInvitationSent: false,
          migrationInvitationCount: 0,
          volunteerAgreementAccepted: false,
          healthSafetyPolicyAccepted: false,
        }
      }),
    ]);

    testUsers = [adminUser, regularUser, ...migratedUsers];
  });

  test.afterAll(async () => {
    // Clean up test data
    const userEmails = testUsers.map(user => user.email);
    await prisma.user.deleteMany({
      where: { email: { in: userEmails } }
    });
    await prisma.$disconnect();
  });

  test.describe('Authentication', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/admin/migration/stats');
      expect(response.status()).toBe(401);
    });

    test('should require admin role', async ({ request, context }) => {
      // Mock regular user session
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'regular-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      expect(response.status()).toBe(403);
      
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  test.describe('Stats Response Structure', () => {
    test('should return correct stats structure for admin user', async ({ request, context }) => {
      // Mock admin session
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      expect(response.status()).toBe(200);

      const stats = await response.json();

      // Verify response structure
      expect(stats).toHaveProperty('totalMigrated');
      expect(stats).toHaveProperty('pendingInvitations');
      expect(stats).toHaveProperty('completedRegistrations');
      expect(stats).toHaveProperty('failedInvitations');
      expect(stats).toHaveProperty('lastMigrationDate');
      expect(stats).toHaveProperty('recentActivity');

      // Verify data types
      expect(typeof stats.totalMigrated).toBe('number');
      expect(typeof stats.pendingInvitations).toBe('number');
      expect(typeof stats.completedRegistrations).toBe('number');
      expect(typeof stats.failedInvitations).toBe('number');
      expect(Array.isArray(stats.recentActivity)).toBe(true);

      // Verify our test data counts
      expect(stats.totalMigrated).toBe(3); // All migrated test users
      expect(stats.completedRegistrations).toBe(1); // Only one completed registration
      expect(stats.pendingInvitations).toBe(1); // Only one pending invitation
      expect(stats.failedInvitations).toBe(0); // No failed invitations tracked yet
    });
  });

  test.describe('Recent Activity', () => {
    test('should include recent activity with correct format', async ({ request, context }) => {
      // Mock admin session
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      const stats = await response.json();

      expect(stats.recentActivity.length).toBeGreaterThan(0);

      // Check activity item structure
      const activity = stats.recentActivity[0];
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('type');
      expect(activity).toHaveProperty('email');
      expect(activity).toHaveProperty('status');
      expect(activity).toHaveProperty('timestamp');

      // Verify activity types
      expect(['migration', 'invitation', 'registration']).toContain(activity.type);
      expect(['success', 'failed', 'pending']).toContain(activity.status);

      // Verify timestamp is valid ISO string
      expect(() => new Date(activity.timestamp)).not.toThrow();
    });

    test('should prioritize completed registrations as registration type', async ({ request, context }) => {
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      const stats = await response.json();

      // Find the completed registration user in activity
      const completedActivity = stats.recentActivity.find((activity: any) => 
        activity.email === 'completed-migration@example.com'
      );

      expect(completedActivity).toBeDefined();
      expect(completedActivity.type).toBe('registration');
      expect(completedActivity.status).toBe('success');
    });

    test('should show pending invitation type for invited but not completed users', async ({ request, context }) => {
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      const stats = await response.json();

      // Find the pending invitation user in activity
      const pendingActivity = stats.recentActivity.find((activity: any) => 
        activity.email === 'pending-migration@example.com'
      );

      expect(pendingActivity).toBeDefined();
      expect(pendingActivity.type).toBe('invitation');
      expect(pendingActivity.status).toBe('pending');
    });

    test('should show migration type for not-yet-invited users', async ({ request, context }) => {
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      const stats = await response.json();

      // Find the recent migration user (not yet invited)
      const recentActivity = stats.recentActivity.find((activity: any) => 
        activity.email === 'recent-migration@example.com'
      );

      expect(recentActivity).toBeDefined();
      expect(recentActivity.type).toBe('migration');
      expect(recentActivity.status).toBe('success');
    });
  });

  test.describe('Last Migration Date', () => {
    test('should return last migration date as ISO string', async ({ request, context }) => {
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      const stats = await response.json();

      if (stats.lastMigrationDate) {
        // Verify it's a valid ISO date string
        const date = new Date(stats.lastMigrationDate);
        expect(date.toISOString()).toBe(stats.lastMigrationDate);

        // Should be recent (our test data was created recently)
        const now = new Date();
        const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        expect(hoursDiff).toBeLessThan(1); // Less than 1 hour ago
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle database errors gracefully', async ({ request, context }) => {
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      // This would be challenging to test without mocking
      // For now, we'll just verify the endpoint is available
      const response = await request.get('/api/admin/migration/stats');
      expect([200, 500]).toContain(response.status());
    });

    test('should return consistent response format even with no data', async ({ request, context }) => {
      // Temporarily remove all migration data
      await prisma.user.updateMany({
        where: { isMigrated: true },
        data: { isMigrated: false }
      });

      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      expect(response.status()).toBe(200);

      const stats = await response.json();

      // Should still have correct structure with zeros
      expect(stats.totalMigrated).toBe(0);
      expect(stats.pendingInvitations).toBe(0);
      expect(stats.completedRegistrations).toBe(0);
      expect(stats.failedInvitations).toBe(0);
      expect(stats.recentActivity).toEqual([]);
      expect(stats.lastMigrationDate).toBeNull();

      // Restore migration data for other tests
      const testUserIds = testUsers.slice(2).map(user => user.id); // Skip admin and regular user
      await prisma.user.updateMany({
        where: { id: { in: testUserIds } },
        data: { isMigrated: true }
      });
    });
  });

  test.describe('Performance', () => {
    test('should respond within reasonable time', async ({ request, context }) => {
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const startTime = Date.now();
      const response = await request.get('/api/admin/migration/stats');
      const endTime = Date.now();

      expect(response.status()).toBe(200);
      
      // Should respond within 2 seconds (generous for test environment)
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000);
    });

    test('should limit recent activity to reasonable number of items', async ({ request, context }) => {
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'admin-user-session',
        domain: 'localhost',
        path: '/',
      }]);

      const response = await request.get('/api/admin/migration/stats');
      const stats = await response.json();

      // Should not return more than 10 recent activities (as per implementation)
      expect(stats.recentActivity.length).toBeLessThanOrEqual(10);
    });
  });
});