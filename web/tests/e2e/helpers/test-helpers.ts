import { Page, expect } from "@playwright/test";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

/**
 * Create a test user with optional notification preferences
 */
export async function createTestUser(
  email: string,
  role: "ADMIN" | "VOLUNTEER" = "VOLUNTEER",
  additionalData?: {
    availableLocations?: string;
    availableDays?: string;
    receiveShortageNotifications?: boolean;
    shortageNotificationTypes?: string[];
    maxNotificationsPerWeek?: number;
  }
): Promise<void> {
  const hashedPassword = await hash("Test123456", 12);
  await prisma.user.create({
    data: {
      email,
      hashedPassword,
      role,
      name: `Test User ${email}`,
      firstName: "Test",
      lastName: "User",
      profileCompleted: true,
      ...additionalData,
    },
  });
}

/**
 * Delete test users
 */
export async function deleteTestUsers(emails: string[]): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
}

/**
 * Login with email and password
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}

/**
 * Ensure user has admin role (for test verification)
 */
export async function ensureAdmin(page: Page): Promise<void> {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
}

/**
 * Create a test shift
 */
export async function createShift(data: {
  location: string;
  start: Date;
  capacity: number;
  shiftTypeId?: string;
}): Promise<{ id: string }> {
  // Get or create a shift type
  let shiftType = await prisma.shiftType.findFirst({
    where: { name: "Kitchen" },
  });
  
  if (!shiftType) {
    shiftType = await prisma.shiftType.create({
      data: {
        name: "Kitchen",
        description: "Kitchen duties",
      },
    });
  }

  const shift = await prisma.shift.create({
    data: {
      shiftTypeId: data.shiftTypeId || shiftType.id,
      location: data.location,
      start: data.start,
      end: new Date(data.start.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
      capacity: data.capacity,
      notes: "Test shift",
    },
  });

  return { id: shift.id };
}

/**
 * Delete test shifts
 */
export async function deleteTestShifts(shiftIds: string[]): Promise<void> {
  await prisma.shift.deleteMany({
    where: {
      id: {
        in: shiftIds,
      },
    },
  });
}

/**
 * Create a notification group
 */
export async function createNotificationGroup(data: {
  name: string;
  description?: string;
  filters: any;
  createdBy: string;
}): Promise<{ id: string }> {
  const group = await prisma.notificationGroup.create({
    data: {
      name: data.name,
      description: data.description,
      filters: data.filters,
      createdBy: data.createdBy,
      isActive: true,
    },
  });

  return { id: group.id };
}

/**
 * Delete notification groups
 */
export async function deleteNotificationGroups(names: string[]): Promise<void> {
  await prisma.notificationGroup.deleteMany({
    where: {
      name: {
        in: names,
      },
    },
  });
}