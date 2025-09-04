import { test, expect } from "./base";
import { loginAsAdmin } from "./helpers/auth";
import { randomUUID } from "crypto";

test.describe("Shift Types API", () => {
  const testId = randomUUID().slice(0, 8);

  test.describe("POST /api/admin/shift-types", () => {
    test("should create new shift type with valid data", async ({ page, request }) => {
      // Login to get session cookies
      await loginAsAdmin(page);
      
      // Get cookies for API request
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

      const response = await request.post('/api/admin/shift-types', {
        data: {
          name: `Test Kitchen Helper ${testId}`,
          description: "Assists with kitchen preparation and cleanup"
        },
        headers: sessionCookie ? {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        } : {}
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.name).toBe(`Test Kitchen Helper ${testId}`);
      expect(data.description).toBe("Assists with kitchen preparation and cleanup");
      expect(data.id).toBeDefined();
    });

    test("should return 400 for invalid data", async ({ page, request }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

      // Missing required name field
      const response = await request.post('/api/admin/shift-types', {
        data: {
          description: "Missing name field"
        },
        headers: sessionCookie ? {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        } : {}
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid input");
    });

    test("should return 409 for duplicate name", async ({ page, request }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

      const duplicateName = `Duplicate Test ${testId}`;
      
      // Create first shift type
      await request.post('/api/admin/shift-types', {
        data: {
          name: duplicateName,
          description: "First one"
        },
        headers: sessionCookie ? {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        } : {}
      });

      // Try to create duplicate
      const response = await request.post('/api/admin/shift-types', {
        data: {
          name: duplicateName,
          description: "Duplicate attempt"
        },
        headers: sessionCookie ? {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        } : {}
      });

      expect(response.status()).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("A shift type with this name already exists");
    });

    test("should return 401 for unauthenticated request", async ({ request }) => {
      const response = await request.post('/api/admin/shift-types', {
        data: {
          name: "Unauthorized Test",
          description: "Should fail"
        }
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    test("should return 403 for non-admin user", async ({ page, request }) => {
      // This test would require a non-admin user, but since we're avoiding database operations
      // in the test setup, we'll skip this test for now
      // TODO: Implement this test when we have a better way to handle test users
      test.skip("Requires database setup for non-admin user");
    });

    test("should handle optional description field", async ({ page, request }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

      const response = await request.post('/api/admin/shift-types', {
        data: {
          name: `No Description ${testId}`
          // description intentionally omitted
        },
        headers: sessionCookie ? {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        } : {}
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.name).toBe(`No Description ${testId}`);
      expect(data.description).toBeNull();
    });

    test("should handle empty string description as null", async ({ page, request }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

      const response = await request.post('/api/admin/shift-types', {
        data: {
          name: `Empty Description ${testId}`,
          description: ""
        },
        headers: sessionCookie ? {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        } : {}
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.description).toBeNull();
    });
  });

  test.describe("GET /api/admin/shift-types", () => {
    test("should return list of shift types for admin", async ({ page, request }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

      const response = await request.get('/api/admin/shift-types', {
        headers: sessionCookie ? {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        } : {}
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('name');
      }
    });

    test("should return 401 for unauthenticated GET request", async ({ request }) => {
      const response = await request.get('/api/admin/shift-types');
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });
});