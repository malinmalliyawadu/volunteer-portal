import { test, expect } from '@playwright/test';
import { generateTestCSV, createTempCSVFile, cleanupTempFiles, MigrationTestHelper } from '../helpers/migration-test-utils';

test.describe('Migration API Integration', () => {
  let tempFiles: string[] = [];

  test.afterEach(async () => {
    // Clean up any temporary files created during tests
    await cleanupTempFiles(tempFiles);
    tempFiles = [];
  });

  test.describe('CSV Validation API', () => {
    test('should validate valid CSV data', async ({ request }) => {
      // Generate valid test CSV
      const csvContent = generateTestCSV([
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@api-test.com',
          phone: '021-555-0001',
          dateOfBirth: '01/15/1990'
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@api-test.com',
          phone: '027-555-0002',
          dateOfBirth: '03/22/1985'
        }
      ]);

      // Create form data
      const formData = new FormData();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('file', blob, 'test.csv');

      // Login and get session
      const loginResponse = await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      // Call validation API
      const response = await request.post('/api/admin/migration/validate', {
        multipart: {
          file: {
            name: 'test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
          }
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.totalRecords).toBe(2);
      expect(result.validRecords).toBe(2);
      expect(result.invalidRecords).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect validation errors in CSV', async ({ request }) => {
      // Generate invalid test CSV
      const csvContent = generateTestCSV([
        {
          firstName: '',
          lastName: '',
          email: 'invalid-email',
          dateOfBirth: '99/99/1990'
        },
        {
          firstName: 'Valid',
          lastName: 'User',
          email: 'duplicate@test.com'
        },
        {
          firstName: 'Another',
          lastName: 'User',
          email: 'duplicate@test.com' // Duplicate email
        }
      ]);

      // Call validation API
      const response = await request.post('/api/admin/migration/validate', {
        multipart: {
          file: {
            name: 'invalid.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
          }
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.totalRecords).toBe(3);
      expect(result.validRecords).toBeLessThan(3);
      expect(result.invalidRecords).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check specific error types
      const errorMessages = result.errors.map((error: any) => error.error);
      expect(errorMessages).toContain('At least first name or last name is required');
      expect(errorMessages).toContain('Invalid email format');
      expect(errorMessages).toContain('Invalid date format (expected MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD)');
      expect(errorMessages).toContain('Duplicate email found');
    });

    test('should reject non-CSV files', async ({ request }) => {
      const textContent = 'This is not a CSV file';

      const response = await request.post('/api/admin/migration/validate', {
        multipart: {
          file: {
            name: 'not-a-csv.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(textContent)
          }
        }
      });

      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('File must be a CSV');
    });

    test('should require authentication', async ({ request }) => {
      const csvContent = generateTestCSV([{ firstName: 'Test', lastName: 'User', email: 'test@test.com' }]);

      const response = await request.post('/api/admin/migration/validate', {
        multipart: {
          file: {
            name: 'test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
          }
        }
      });

      expect(response.status()).toBe(403);
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });
  });

  test.describe('Migration Execution API', () => {
    test('should execute migration successfully', async ({ request }) => {
      const csvContent = generateTestCSV([
        {
          firstName: 'Migration',
          lastName: 'Test1',
          email: 'migration-test-1@api.com',
          phone: '021-555-1001',
          dateOfBirth: '01/15/1990'
        },
        {
          firstName: 'Migration',
          lastName: 'Test2',
          email: 'migration-test-2@api.com',
          phone: '021-555-1002',
          dateOfBirth: '03/22/1985'
        }
      ]);

      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      // Execute migration
      const response = await request.post('/api/admin/migration/execute', {
        multipart: {
          file: {
            name: 'migration-test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
          },
          dryRun: 'false'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.totalRecords).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.createdUsers).toHaveLength(2);
      
      // Verify user data
      const user1 = result.createdUsers.find((u: any) => u.email === 'migration-test-1@api.com');
      const user2 = result.createdUsers.find((u: any) => u.email === 'migration-test-2@api.com');
      
      expect(user1).toBeDefined();
      expect(user1.firstName).toBe('Migration');
      expect(user1.lastName).toBe('Test1');
      
      expect(user2).toBeDefined();
      expect(user2.firstName).toBe('Migration');
      expect(user2.lastName).toBe('Test2');

      // Clean up created users
      await MigrationTestHelper.cleanupTestUsers(['migration-test-1@api.com', 'migration-test-2@api.com']);
    });

    test('should perform dry run without creating users', async ({ request }) => {
      const csvContent = generateTestCSV([
        {
          firstName: 'DryRun',
          lastName: 'Test',
          email: 'dryrun-test@api.com',
          phone: '021-555-2001'
        }
      ]);

      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      // Execute dry run
      const response = await request.post('/api/admin/migration/execute', {
        multipart: {
          file: {
            name: 'dryrun-test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
          },
          dryRun: 'true'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.totalRecords).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.temporaryPasswords).toBeUndefined(); // No passwords in dry run
      expect(result.createdUsers).toBeUndefined(); // No users created in dry run
    });

    test('should handle duplicate users gracefully', async ({ request }) => {
      // First, create a user
      const user = await MigrationTestHelper.createMigrationUser('duplicate-api-test@test.com');

      const csvContent = generateTestCSV([
        {
          firstName: 'Duplicate',
          lastName: 'User',
          email: 'duplicate-api-test@test.com'
        }
      ]);

      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      // Try to migrate existing user
      const response = await request.post('/api/admin/migration/execute', {
        multipart: {
          file: {
            name: 'duplicate-test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
          },
          dryRun: 'false'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.totalRecords).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('User already exists');

      // Clean up
      await MigrationTestHelper.cleanupTestUsers(['duplicate-api-test@test.com']);
    });
  });

  test.describe('User Invitations API', () => {
    let testUsers: any[] = [];

    test.beforeEach(async () => {
      // Create test migrated users
      testUsers = [
        await MigrationTestHelper.createMigrationUser('invite-test-1@api.com'),
        await MigrationTestHelper.createMigrationUser('invite-test-2@api.com')
      ];
    });

    test.afterEach(async () => {
      // Clean up test users
      const emails = testUsers.map(user => user.email);
      await MigrationTestHelper.cleanupTestUsers(emails);
      testUsers = [];
    });

    test('should fetch migrated users', async ({ request }) => {
      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      const response = await request.get('/api/admin/migration/users');
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.users).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(2);
      
      // Check our test users are included
      const emails = result.users.map((user: any) => user.email);
      expect(emails).toContain('invite-test-1@api.com');
      expect(emails).toContain('invite-test-2@api.com');
    });

    test('should send invitations to users', async ({ request }) => {
      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      const response = await request.post('/api/admin/migration/send-invitations', {
        data: {
          userIds: testUsers.map(user => user.id),
          customMessage: 'Welcome to our new volunteer portal!'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.invitations).toHaveLength(2);
      
      // Check invitation data
      const invitation1 = result.invitations.find((inv: any) => inv.email === 'invite-test-1@api.com');
      const invitation2 = result.invitations.find((inv: any) => inv.email === 'invite-test-2@api.com');
      
      expect(invitation1).toBeDefined();
      expect(invitation1.success).toBe(true);
      expect(invitation1.registrationUrl).toMatch(/\/register\/migrate\?token=/);
      
      expect(invitation2).toBeDefined();
      expect(invitation2.success).toBe(true);
      expect(invitation2.registrationUrl).toMatch(/\/register\/migrate\?token=/);
    });

    test('should handle invalid user IDs in invitation request', async ({ request }) => {
      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      const response = await request.post('/api/admin/migration/send-invitations', {
        data: {
          userIds: ['invalid-user-id-123', 'another-invalid-id'],
          customMessage: 'Test message'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  test.describe('Registration Token API', () => {
    let testUser: any;
    let validToken: string;

    test.beforeEach(async () => {
      testUser = await MigrationTestHelper.createMigrationUser('token-test@api.com');
      validToken = testUser.migrationInvitationToken;
    });

    test.afterEach(async () => {
      await MigrationTestHelper.cleanupTestUsers(['token-test@api.com']);
    });

    test('should validate and return user data for valid token', async ({ request }) => {
      const response = await request.get(`/api/register/migrate?token=${validToken}`);
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('token-test@api.com');
      expect(result.user.firstName).toBe('Test');
      expect(result.user.lastName).toBe('User');
      expect(result.user.phone).toBeTruthy();
    });

    test('should reject invalid token', async ({ request }) => {
      const response = await request.get('/api/register/migrate?token=invalid-token-123');
      
      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Invalid or expired registration token');
    });

    test('should reject expired token', async ({ request }) => {
      // Create user with expired token
      const expiredUser = await MigrationTestHelper.createMigrationUser('expired-token-test@api.com', true);
      
      const response = await request.get(`/api/register/migrate?token=${expiredUser.migrationInvitationToken}`);
      
      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Invalid or expired registration token');

      // Clean up
      await MigrationTestHelper.cleanupTestUsers(['expired-token-test@api.com']);
    });

    test('should complete registration successfully', async ({ request }) => {
      const registrationData = {
        token: validToken,
        firstName: 'Test',
        lastName: 'User',
        email: 'token-test@api.com',
        phone: '+64 21 555 0000',
        password: 'SecurePassword123!',
        emergencyContactName: 'Emergency Contact',
        emergencyContactRelationship: 'Friend',
        emergencyContactPhone: '+64 21 555 0001',
        availableDays: ['Monday', 'Wednesday'],
        availableLocations: ['Wellington'],
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true
      };

      const response = await request.post('/api/register/migrate', {
        data: registrationData
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('token-test@api.com');
      expect(result.user.profileCompleted).toBe(true);

      // Verify token is invalidated after use
      const secondAttempt = await request.get(`/api/register/migrate?token=${validToken}`);
      expect(secondAttempt.status()).toBe(400);
    });

    test('should validate required fields in registration', async ({ request }) => {
      const incompleteData = {
        token: validToken,
        firstName: '',
        lastName: 'User',
        email: 'token-test@api.com',
        password: 'weak'
      };

      const response = await request.post('/api/register/migrate', {
        data: incompleteData
      });

      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.error).toBeDefined();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle missing file in validation', async ({ request }) => {
      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      const response = await request.post('/api/admin/migration/validate');
      
      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('No file provided');
    });

    test('should handle malformed CSV content', async ({ request }) => {
      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      const malformedCsv = 'This is not a proper CSV\nwith missing commas and "unclosed quotes';

      const response = await request.post('/api/admin/migration/validate', {
        multipart: {
          file: {
            name: 'malformed.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(malformedCsv)
          }
        }
      });

      expect(response.status()).toBe(500);
      const result = await response.json();
      expect(result.error).toContain('failed');
    });

    test('should handle empty CSV files', async ({ request }) => {
      // Login first
      await request.post('/api/auth/signin', {
        form: {
          email: 'admin@everybodyeats.nz',
          password: 'admin123'
        }
      });

      const emptyCsv = 'First Name,Last Name,Email,Phone,Date of Birth,Contact Name,Contact Relationship,Contact Phone,Medical Conditions,Experience Points,Days Available,Locations,Positions\n';

      const response = await request.post('/api/admin/migration/validate', {
        multipart: {
          file: {
            name: 'empty.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(emptyCsv)
          }
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.totalRecords).toBe(0);
      expect(result.validRecords).toBe(0);
      expect(result.invalidRecords).toBe(0);
    });
  });
});