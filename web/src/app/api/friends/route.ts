import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const sendFriendRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  message: z.string().optional(),
});

export async function GET() {
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
    // Get user's friends (accepted friendships)
    const friends = await prisma.friendship.findMany({
      where: {
        AND: [
          {
            OR: [{ userId: user.id }, { friendId: user.id }],
          },
          { status: "ACCEPTED" },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
        friend: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    // Get pending friend requests received
    const pendingRequests = await prisma.friendRequest.findMany({
      where: {
        toEmail: user.email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    // Get sent friend requests
    const sentRequests = await prisma.friendRequest.findMany({
      where: {
        fromUserId: user.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    // Format friends list - get the other person in the friendship
    const formattedFriends = friends.map((friendship) => {
      const friend =
        friendship.userId === user.id ? friendship.friend : friendship.user;
      return {
        friendshipId: friendship.id,
        id: friend.id,
        name: friend.name,
        firstName: friend.firstName,
        lastName: friend.lastName,
        email: friend.email,
        profilePhotoUrl: friend.profilePhotoUrl,
        friendsSince: friendship.createdAt,
      };
    });

    return NextResponse.json({
      friends: formattedFriends,
      pendingRequests,
      sentRequests,
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
    const body = await req.json();
    const { email, message } = sendFriendRequestSchema.parse(body);

    // Check if trying to add themselves
    if (email === user.email) {
      return NextResponse.json(
        { error: "Cannot send friend request to yourself" },
        { status: 400 }
      );
    }

    // Check if user allows friend requests
    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, allowFriendRequests: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!targetUser.allowFriendRequests) {
      return NextResponse.json(
        { error: "User is not accepting friend requests" },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: targetUser.id },
          { userId: targetUser.id, friendId: user.id },
        ],
      },
    });

    if (existingFriendship) {
      return NextResponse.json(
        { error: "Friendship already exists or is pending" },
        { status: 400 }
      );
    }

    // Check if friend request already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        fromUserId: user.id,
        toEmail: email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Friend request already sent" },
        { status: 400 }
      );
    }

    // Create friend request
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    const friendRequest = await prisma.friendRequest.create({
      data: {
        fromUserId: user.id,
        toEmail: email,
        message: message || null,
        expiresAt,
      },
      include: {
        fromUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send email notification to target user
    // This would integrate with your email service

    return NextResponse.json(
      {
        message: "Friend request sent successfully",
        requestId: friendRequest.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error sending friend request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}