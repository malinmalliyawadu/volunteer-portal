import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const blockFriendSchema = z.object({
  blocked: z.boolean(),
});

export async function DELETE(
  req: Request,
  { params }: { params: { friendId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { friendId } = params;

    // Find and delete both directions of the friendship
    const result = await prisma.$transaction(async (tx) => {
      const deletedFriendships = await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId: user.id, friendId },
            { userId: friendId, friendId: user.id },
          ],
          status: "ACCEPTED",
        },
      });

      return deletedFriendships;
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Friendship removed successfully",
    });
  } catch (error) {
    console.error("Error removing friendship:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { friendId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { friendId } = params;
    const body = await req.json();
    const { blocked } = blockFriendSchema.parse(body);

    // Update friendship status
    const updatedFriendship = await prisma.friendship.updateMany({
      where: {
        userId: user.id,
        friendId,
      },
      data: {
        status: blocked ? "BLOCKED" : "ACCEPTED",
      },
    });

    if (updatedFriendship.count === 0) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: blocked ? "Friend blocked successfully" : "Friend unblocked successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating friendship:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}