import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      pronouns,
      password,
      confirmPassword,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      medicalConditions,
      willingToProvideReference,
      howDidYouHearAboutUs,
      availableDays,
      availableLocations,
      emailNewsletterSubscription,
      volunteerAgreementAccepted,
      healthSafetyPolicyAccepted,
    } = body;

    // Validate required fields
    if (!token || !firstName || !lastName || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (!emergencyContactName || !emergencyContactRelationship || !emergencyContactPhone) {
      return NextResponse.json(
        { error: "Emergency contact information is required" },
        { status: 400 }
      );
    }

    if (!volunteerAgreementAccepted || !healthSafetyPolicyAccepted) {
      return NextResponse.json(
        { error: "You must accept the volunteer agreement and health safety policy" },
        { status: 400 }
      );
    }

    // Find the user by token (for now, we'll find migrated users with profileCompleted: false)
    // TODO: When migration is complete, use the actual migrationInvitationToken field
    const user = await prisma.user.findFirst({
      where: {
        profileCompleted: false,
        role: "VOLUNTEER",
        // TODO: Add token validation when migration fields are available
        // migrationInvitationToken: token,
        // migrationTokenExpiresAt: { gt: new Date() }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired registration token" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = hashSync(password, 12);

    // Parse date of birth
    let parsedDateOfBirth: Date | null = null;
    if (dateOfBirth) {
      parsedDateOfBirth = new Date(dateOfBirth);
      if (isNaN(parsedDateOfBirth.getTime())) {
        parsedDateOfBirth = null;
      }
    }

    // Update the user with the completed profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone: phone || null,
        dateOfBirth: parsedDateOfBirth,
        pronouns: pronouns || null,
        hashedPassword,
        emergencyContactName,
        emergencyContactRelationship,
        emergencyContactPhone,
        medicalConditions: medicalConditions || null,
        willingToProvideReference: willingToProvideReference || false,
        howDidYouHearAboutUs: howDidYouHearAboutUs || null,
        availableDays: availableDays || null,
        availableLocations: availableLocations || null,
        emailNewsletterSubscription: emailNewsletterSubscription ?? true,
        volunteerAgreementAccepted,
        healthSafetyPolicyAccepted,
        profileCompleted: true,
        // TODO: Mark migration as complete when fields are available
        // migrationInvitationToken: null,
        // migrationTokenExpiresAt: null,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Registration completed successfully",
      userId: updatedUser.id
    });

  } catch (error) {
    console.error("Migration registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}