import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

/**
 * Validation schema for user registration
 * Matches the UserProfileFormData interface from the form component
 */
const registerSchema = z
  .object({
    // Basic account info
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),

    // Personal information
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    name: z.string().optional(), // Generated from firstName + lastName
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    pronouns: z.string().nullable().optional(),

    // Emergency contact
    emergencyContactName: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    emergencyContactPhone: z.string().optional(),

    // Medical & references
    medicalConditions: z.string().optional(),
    willingToProvideReference: z.boolean().optional(),
    howDidYouHearAboutUs: z.string().nullable().optional(),

    // Availability
    availableDays: z.array(z.string()).optional(),
    availableLocations: z.array(z.string()).optional(),

    // Communication & agreements
    emailNewsletterSubscription: z.boolean().optional(),
    notificationPreference: z.enum(["EMAIL", "SMS", "BOTH", "NONE"]).optional(),
    volunteerAgreementAccepted: z.boolean(),
    healthSafetyPolicyAccepted: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * POST /api/auth/register
 * Creates a new volunteer account with comprehensive profile information
 *
 * @example
 * ```tsx
 * const response = await fetch("/api/auth/register", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({
 *     email: "volunteer@example.com",
 *     password: "password123",
 *     confirmPassword: "password123",
 *     firstName: "John",
 *     lastName: "Doe",
 *     volunteerAgreementAccepted: true,
 *     healthSafetyPolicyAccepted: true
 *   })
 * });
 * ```
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Validate required agreements
    if (
      !validatedData.volunteerAgreementAccepted ||
      !validatedData.healthSafetyPolicyAccepted
    ) {
      return NextResponse.json(
        { error: "Please accept all required agreements to continue" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Prepare data for database insertion
    const userData = {
      email: validatedData.email,
      hashedPassword,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      name:
        validatedData.name ||
        `${validatedData.firstName} ${validatedData.lastName}`.trim(),
      phone: validatedData.phone || null,
      dateOfBirth: validatedData.dateOfBirth
        ? new Date(validatedData.dateOfBirth)
        : null,
      pronouns: validatedData.pronouns || null,
      role: "VOLUNTEER" as const,

      // Emergency contact
      emergencyContactName: validatedData.emergencyContactName || null,
      emergencyContactRelationship:
        validatedData.emergencyContactRelationship || null,
      emergencyContactPhone: validatedData.emergencyContactPhone || null,

      // Medical & references
      medicalConditions: validatedData.medicalConditions || null,
      willingToProvideReference:
        validatedData.willingToProvideReference || false,
      howDidYouHearAboutUs: validatedData.howDidYouHearAboutUs || null,

      // Availability - store as JSON strings
      availableDays: validatedData.availableDays
        ? JSON.stringify(validatedData.availableDays)
        : null,
      availableLocations: validatedData.availableLocations
        ? JSON.stringify(validatedData.availableLocations)
        : null,

      // Communication & agreements
      emailNewsletterSubscription:
        validatedData.emailNewsletterSubscription ?? true,
      notificationPreference: validatedData.notificationPreference || "EMAIL",
      volunteerAgreementAccepted: validatedData.volunteerAgreementAccepted,
      healthSafetyPolicyAccepted: validatedData.healthSafetyPolicyAccepted,
    };

    // Create the user
    const newUser = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Registration successful",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
