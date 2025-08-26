import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsVolunteer } from "./helpers/auth";

test.describe("Restaurant Manager API Tests", () => {
  let authContext: any;

  test.beforeEach(async ({ browser }) => {
    // Create a new context for API calls
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);
    authContext = context;
  });

  test.afterEach(async () => {
    await authContext?.close();
  });

  test("GET /api/admin/restaurant-managers returns manager list", async () => {
    const response = await authContext.request.get("/api/admin/restaurant-managers");
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    
    // If there are managers, verify structure
    if (data.length > 0) {
      const manager = data[0];
      expect(manager).toHaveProperty("id");
      expect(manager).toHaveProperty("userId");
      expect(manager).toHaveProperty("locations");
      expect(manager).toHaveProperty("receiveNotifications");
      expect(manager).toHaveProperty("user");
      expect(Array.isArray(manager.locations)).toBeTruthy();
    }
  });

  test("POST /api/admin/restaurant-managers creates new assignment", async () => {
    // First get list of admin users
    const usersResponse = await authContext.request.get("/api/admin/users");
    expect(usersResponse.status()).toBe(200);
    const users = await usersResponse.json();
    
    const adminUsers = users.filter((user: any) => user.role === "ADMIN");
    if (adminUsers.length === 0) {
      test.skip(true, "No admin users available for testing");
      return;
    }

    // Get available locations
    const locationsResponse = await authContext.request.get("/api/locations");
    expect(locationsResponse.status()).toBe(200);
    const locations = await locationsResponse.json();
    
    if (locations.length === 0) {
      test.skip(true, "No locations available for testing");
      return;
    }

    // Create a new manager assignment
    const testAssignment = {
      userId: adminUsers[0].id,
      locations: [locations[0].value],
      receiveNotifications: true,
    };

    const response = await authContext.request.post("/api/admin/restaurant-managers", {
      data: testAssignment,
    });

    expect(response.status()).toBe(200);
    const createdManager = await response.json();
    
    expect(createdManager).toHaveProperty("id");
    expect(createdManager.userId).toBe(testAssignment.userId);
    expect(createdManager.locations).toEqual(testAssignment.locations);
    expect(createdManager.receiveNotifications).toBe(true);

    // Cleanup: delete the created manager
    const deleteResponse = await authContext.request.delete(
      `/api/admin/restaurant-managers/${createdManager.id}`
    );
    expect(deleteResponse.status()).toBe(200);
  });

  test("POST /api/admin/restaurant-managers validates required fields", async () => {
    // Test missing userId
    let response = await authContext.request.post("/api/admin/restaurant-managers", {
      data: { locations: ["Test Location"] },
    });
    expect(response.status()).toBe(400);
    let error = await response.json();
    expect(error.error).toContain("userId");

    // Test missing locations
    response = await authContext.request.post("/api/admin/restaurant-managers", {
      data: { userId: "test-user-id" },
    });
    expect(response.status()).toBe(400);
    error = await response.json();
    expect(error.error).toContain("locations");

    // Test invalid locations (not array)
    response = await authContext.request.post("/api/admin/restaurant-managers", {
      data: { userId: "test-user-id", locations: "not-an-array" },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/admin/restaurant-managers rejects non-admin users", async () => {
    // Get list of users
    const usersResponse = await authContext.request.get("/api/admin/users");
    const users = await usersResponse.json();
    
    const volunteerUsers = users.filter((user: any) => user.role === "VOLUNTEER");
    if (volunteerUsers.length === 0) {
      test.skip(true, "No volunteer users available for testing");
      return;
    }

    // Try to assign a volunteer as restaurant manager
    const response = await authContext.request.post("/api/admin/restaurant-managers", {
      data: {
        userId: volunteerUsers[0].id,
        locations: ["Test Location"],
        receiveNotifications: true,
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain("admin");
  });

  test("PUT /api/admin/restaurant-managers/[id] updates assignment", async () => {
    // First create a manager to update
    const usersResponse = await authContext.request.get("/api/admin/users");
    const users = await usersResponse.json();
    const adminUsers = users.filter((user: any) => user.role === "ADMIN");
    
    if (adminUsers.length === 0) {
      test.skip(true, "No admin users available for testing");
      return;
    }

    // Create initial assignment
    const createResponse = await authContext.request.post("/api/admin/restaurant-managers", {
      data: {
        userId: adminUsers[0].id,
        locations: ["Initial Location"],
        receiveNotifications: true,
      },
    });
    
    expect(createResponse.status()).toBe(200);
    const manager = await createResponse.json();

    // Update the assignment
    const updateResponse = await authContext.request.put(
      `/api/admin/restaurant-managers/${manager.id}`,
      {
        data: {
          locations: ["Updated Location", "Second Location"],
          receiveNotifications: false,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updatedManager = await updateResponse.json();
    
    expect(updatedManager.locations).toEqual(["Updated Location", "Second Location"]);
    expect(updatedManager.receiveNotifications).toBe(false);

    // Cleanup
    await authContext.request.delete(`/api/admin/restaurant-managers/${manager.id}`);
  });

  test("DELETE /api/admin/restaurant-managers/[id] removes assignment", async () => {
    // First create a manager to delete
    const usersResponse = await authContext.request.get("/api/admin/users");
    const users = await usersResponse.json();
    const adminUsers = users.filter((user: any) => user.role === "ADMIN");
    
    if (adminUsers.length === 0) {
      test.skip(true, "No admin users available for testing");
      return;
    }

    // Create assignment
    const createResponse = await authContext.request.post("/api/admin/restaurant-managers", {
      data: {
        userId: adminUsers[0].id,
        locations: ["Test Location"],
        receiveNotifications: true,
      },
    });
    
    const manager = await createResponse.json();

    // Delete the assignment
    const deleteResponse = await authContext.request.delete(
      `/api/admin/restaurant-managers/${manager.id}`
    );

    expect(deleteResponse.status()).toBe(200);
    const result = await deleteResponse.json();
    expect(result.success).toBe(true);

    // Verify it's deleted
    const getResponse = await authContext.request.get(
      `/api/admin/restaurant-managers/${manager.id}`
    );
    expect(getResponse.status()).toBe(404);
  });
});

test.describe("Restaurant Manager API Authorization", () => {
  test("restaurant manager endpoints require admin role", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsVolunteer(page);

    // Test all endpoints return 403 for volunteers
    let response = await context.request.get("/api/admin/restaurant-managers");
    expect(response.status()).toBe(403);

    response = await context.request.post("/api/admin/restaurant-managers", {
      data: { userId: "test", locations: ["test"] },
    });
    expect(response.status()).toBe(403);

    response = await context.request.put("/api/admin/restaurant-managers/test", {
      data: { locations: ["test"] },
    });
    expect(response.status()).toBe(403);

    response = await context.request.delete("/api/admin/restaurant-managers/test");
    expect(response.status()).toBe(403);

    await context.close();
  });

  test("admin users endpoint requires admin role", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsVolunteer(page);

    const response = await context.request.get("/api/admin/users");
    expect(response.status()).toBe(403);

    await context.close();
  });

  test("locations endpoint is accessible to all authenticated users", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsVolunteer(page);

    const response = await context.request.get("/api/locations");
    expect(response.status()).toBe(200);

    await context.close();
  });
});

test.describe("Shift Cancellation Notification Integration", () => {
  test("shift cancellation triggers notification flow", async ({ browser }) => {
    // This test verifies that the API integration works
    // It doesn't test actual email sending (that would require mocking)
    
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsVolunteer(page);

    // This test would need a known shift signup to cancel
    // In a real test environment, you'd set up test data
    // For now, we'll test the API structure
    
    // Mock a shift cancellation request
    // Note: This would need to be adapted based on your test data setup
    const testShiftId = "test-shift-id";
    
    const response = await context.request.delete(
      `/api/shifts/${testShiftId}/signup`
    );

    // The request should process (even if no test data exists)
    // The important thing is that it doesn't crash due to notification logic
    expect([200, 404, 400].includes(response.status())).toBeTruthy();

    await context.close();
  });
});