import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const checkUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/check-user
 * Checks if a user exists and their email verification status
 * Used by login page to provide better error messages
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = checkUserSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          exists: false,
          emailVerified: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        exists: true,
        emailVerified: user.emailVerified,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Check user error:", error);

    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to check user status" },
      { status: 500 }
    );
  }
}