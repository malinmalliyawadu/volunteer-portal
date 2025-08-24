import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

test.describe('Unified Registration API', () => {
  let testUsers: any[] = [];
  let migrationToken: string;

  test.beforeAll(async () => {
    migrationToken = 'test-migration-token-123';

    // Create migrated user for testing
    const migratedUser = await prisma.user.create({
      data: {
        email: 'api-migration-test@example.com',
        firstName: 'API',
        lastName: 'Migration',
        name: 'API Migration',
        phone: '+64 21 555 7777',
        hashedPassword: 'temp-hash',
        role: 'VOLUNTEER',
        isMigrated: true,
        migrationInvitationToken: migrationToken,
        migrationTokenExpiresAt: addDays(new Date(), 7),
        profileCompleted: false,
        volunteerAgreementAccepted: false,
        healthSafetyPolicyAccepted: false,
      }
    });

    testUsers.push(migratedUser);
  });

  test.afterAll(async () => {
    // Clean up test data
    const userEmails = testUsers.map(user => user.email);
    await prisma.user.deleteMany({
      where: { email: { in: userEmails } }
    });
    await prisma.$disconnect();
  });

  test.describe('Regular Registration (non-migration)', () => {
    test('should create new volunteer account', async ({ request }) => {
      const registrationData = {
        firstName: 'John',
        lastName: 'Volunteer',
        email: 'john.volunteer@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        phone: '+64 21 555 1234',
        dateOfBirth: '1990-05-15',
        emergencyContactName: 'Jane Volunteer',
        emergencyContactRelationship: 'Sister',
        emergencyContactPhone: '+64 21 555 5678',
        medicalConditions: 'No known allergies',
        availableDays: ['Monday', 'Wednesday', 'Friday'],
        availableLocations: ['Wellington', 'Glenn Innes'],
        emailNewsletterSubscription: true,
        notificationPreference: 'EMAIL',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
        howDidYouHearAboutUs: 'friend_referral',
      };

      const response = await request.post('/api/auth/register', {
        data: registrationData
      });

      expect(response.status()).toBe(201);

      const result = await response.json();
      expect(result.message).toBe('Registration successful');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(registrationData.email);
      expect(result.user.firstName).toBe(registrationData.firstName);
      expect(result.user.lastName).toBe(registrationData.lastName);
      expect(result.user.role).toBe('VOLUNTEER');

      // Verify user was created in database
      const createdUser = await prisma.user.findUnique({
        where: { email: registrationData.email }
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.isMigrated).toBe(false);
      expect(createdUser?.profileCompleted).toBe(true);

      testUsers.push(createdUser);
    });

    test('should reject registration without required agreements', async ({ request }) => {
      const registrationData = {
        firstName: 'Jane',
        lastName: 'Test',
        email: 'jane.test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        volunteerAgreementAccepted: false, // Required
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: registrationData
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('accept all required agreements');
    });

    test('should reject duplicate email registration', async ({ request }) => {
      const registrationData = {
        firstName: 'Duplicate',
        lastName: 'User',
        email: 'john.volunteer@example.com', // Same email as previous test
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: registrationData
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('user with this email already exists');
    });
  });

  test.describe('Migration Registration', () => {
    test('should complete migration registration with photo', async ({ request }) => {
      const migrationData = {
        firstName: 'API',
        lastName: 'Migration',
        email: 'api-migration-test@example.com',
        password: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!',
        phone: '+64 21 555 7777',
        dateOfBirth: '1985-03-20',
        emergencyContactName: 'Emergency Contact',
        emergencyContactRelationship: 'Friend',
        emergencyContactPhone: '+64 21 555 9999',
        medicalConditions: 'None',
        availableDays: ['Tuesday', 'Thursday'],
        availableLocations: ['Wellington'],
        emailNewsletterSubscription: true,
        notificationPreference: 'EMAIL',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
        howDidYouHearAboutUs: 'migration',
        profilePhotoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        
        // Migration-specific fields
        isMigration: true,
        userId: testUsers[0].id,
        migrationToken: migrationToken,
      };

      const response = await request.post('/api/auth/register', {
        data: migrationData
      });

      expect(response.status()).toBe(201);

      const result = await response.json();
      expect(result.message).toBe('Migration successful');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(migrationData.email);

      // Verify migration was completed in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUsers[0].id }
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.profileCompleted).toBe(true);
      expect(updatedUser?.isMigrated).toBe(true);
      expect(updatedUser?.migrationInvitationToken).toBeNull(); // Token should be cleared
      expect(updatedUser?.migrationTokenExpiresAt).toBeNull();
      expect(updatedUser?.profilePhotoUrl).toBe(migrationData.profilePhotoUrl);
    });

    test('should require profile photo for migration registration', async ({ request }) => {
      // Create another test user for this test
      const anotherMigratedUser = await prisma.user.create({
        data: {
          email: 'no-photo-migration@example.com',
          firstName: 'No',
          lastName: 'Photo',
          name: 'No Photo',
          hashedPassword: 'temp-hash',
          role: 'VOLUNTEER',
          isMigrated: true,
          migrationInvitationToken: 'no-photo-token-456',
          migrationTokenExpiresAt: addDays(new Date(), 7),
          profileCompleted: false,
          volunteerAgreementAccepted: false,
          healthSafetyPolicyAccepted: false,
        }
      });

      testUsers.push(anotherMigratedUser);

      const migrationDataWithoutPhoto = {
        firstName: 'No',
        lastName: 'Photo',
        email: 'no-photo-migration@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
        // profilePhotoUrl is missing
        
        isMigration: true,
        userId: anotherMigratedUser.id,
        migrationToken: 'no-photo-token-456',
      };

      const response = await request.post('/api/auth/register', {
        data: migrationDataWithoutPhoto
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toBe('Profile image is required for migration registration');
    });

    test('should reject migration with invalid user ID', async ({ request }) => {
      const invalidMigrationData = {
        firstName: 'Invalid',
        lastName: 'User',
        email: 'invalid@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
        profilePhotoUrl: 'data:image/png;base64,test',
        
        isMigration: true,
        userId: 'invalid-user-id-123',
        migrationToken: 'invalid-token',
      };

      const response = await request.post('/api/auth/register', {
        data: invalidMigrationData
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toBe('Invalid migration request');
    });

    test('should reject migration with email mismatch', async ({ request }) => {
      const mismatchedEmailData = {
        firstName: 'API',
        lastName: 'Migration',
        email: 'different-email@example.com', // Different from stored user email
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
        profilePhotoUrl: 'data:image/png;base64,test',
        
        isMigration: true,
        userId: testUsers[0].id, // Valid user ID but wrong email
        migrationToken: migrationToken,
      };

      const response = await request.post('/api/auth/register', {
        data: mismatchedEmailData
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toBe('Email mismatch in migration request');
    });
  });

  test.describe('Data Storage and JSON Serialization', () => {
    test('should correctly serialize availability arrays to JSON', async ({ request }) => {
      const registrationData = {
        firstName: 'JSON',
        lastName: 'Test',
        email: 'json.test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        availableDays: ['Monday', 'Wednesday', 'Friday'],
        availableLocations: ['Wellington', 'Glenn Innes', 'Onehunga'],
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: registrationData
      });

      expect(response.status()).toBe(201);

      // Verify data was stored correctly in database
      const createdUser = await prisma.user.findUnique({
        where: { email: registrationData.email }
      });

      expect(createdUser).toBeDefined();
      
      // Check JSON serialization
      if (createdUser?.availableDays) {
        const storedDays = JSON.parse(createdUser.availableDays);
        expect(storedDays).toEqual(registrationData.availableDays);
      }

      if (createdUser?.availableLocations) {
        const storedLocations = JSON.parse(createdUser.availableLocations);
        expect(storedLocations).toEqual(registrationData.availableLocations);
      }

      testUsers.push(createdUser);
    });

    test('should handle empty availability arrays', async ({ request }) => {
      const registrationData = {
        firstName: 'Empty',
        lastName: 'Arrays',
        email: 'empty.arrays@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        availableDays: [],
        availableLocations: [],
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: registrationData
      });

      expect(response.status()).toBe(201);

      // Verify empty arrays are stored as null
      const createdUser = await prisma.user.findUnique({
        where: { email: registrationData.email }
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.availableDays).toBeNull();
      expect(createdUser?.availableLocations).toBeNull();

      testUsers.push(createdUser);
    });
  });

  test.describe('Validation and Error Handling', () => {
    test('should validate password confirmation', async ({ request }) => {
      const invalidData = {
        firstName: 'Password',
        lastName: 'Mismatch',
        email: 'password.mismatch@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'DifferentPassword123!', // Doesn't match
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: invalidData
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toContain("Passwords don't match");
    });

    test('should validate email format', async ({ request }) => {
      const invalidData = {
        firstName: 'Invalid',
        lastName: 'Email',
        email: 'not-a-valid-email', // Invalid email format
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: invalidData
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('validation');
    });

    test('should validate required fields', async ({ request }) => {
      const invalidData = {
        // Missing firstName, lastName, email, password
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: invalidData
      });

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('validation');
    });
  });

  test.describe('Response Format', () => {
    test('should return consistent success response format', async ({ request }) => {
      const registrationData = {
        firstName: 'Response',
        lastName: 'Format',
        email: 'response.format@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      };

      const response = await request.post('/api/auth/register', {
        data: registrationData
      });

      expect(response.status()).toBe(201);

      const result = await response.json();

      // Verify response structure
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');

      // Verify user object structure
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('firstName');
      expect(result.user).toHaveProperty('lastName');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('createdAt');

      // Verify sensitive data is not included
      expect(result.user).not.toHaveProperty('hashedPassword');
      expect(result.user).not.toHaveProperty('migrationInvitationToken');

      testUsers.push({ email: registrationData.email });
    });
  });
});