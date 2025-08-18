import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const withFriends = searchParams.get("withFriends") === "true";

  let friendIds: string[] = [];

  // If user is authenticated and wants friend info
  if (session?.user?.email && withFriends) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (user) {
      
      // Get user's friends
      const friendships = await prisma.friendship.findMany({
        where: {
          AND: [
            {
              OR: [{ userId: user.id }, { friendId: user.id }],
            },
            { status: "ACCEPTED" },
          ],
        },
        select: {
          userId: true,
          friendId: true,
        },
      });

      friendIds = friendships.map((friendship) =>
        friendship.userId === user.id ? friendship.friendId : friendship.userId
      );
    }
  }

  const shifts = withFriends 
    ? await prisma.shift.findMany({
        orderBy: { start: "asc" },
        include: { 
          shiftType: true, 
          signups: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  profilePhotoUrl: true,
                  friendVisibility: true,
                },
              },
            },
          }
        },
      })
    : await prisma.shift.findMany({
        orderBy: { start: "asc" },
        include: { 
          shiftType: true, 
          signups: true,
        },
      });

  type ShiftItem = {
    id: string;
    start: Date;
    end: Date;
    location: string | null;
    notes: string | null;
    capacity: number;
    remaining: number;
    shiftType: { id: string; name: string };
    friendsSignedUp?: Array<{
      id: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      profilePhotoUrl: string | null;
      status: string;
    }>;
  };

  const result: ShiftItem[] = [];
  for (const s of shifts) {
    let confirmedCount = 0;
    const friendsSignedUp: ShiftItem["friendsSignedUp"] = [];

    for (const signup of s.signups) {
      if (signup.status === "CONFIRMED") confirmedCount += 1;

      // Add friend information if requested and user is a friend
      if (withFriends && "user" in signup && signup.user && friendIds.includes(signup.user.id)) {
        // Check if friend allows visibility
        const allowVisibility = 
          signup.user.friendVisibility === "PUBLIC" || 
          signup.user.friendVisibility === "FRIENDS_ONLY";

        if (allowVisibility) {
          friendsSignedUp.push({
            id: signup.user.id,
            name: signup.user.name,
            firstName: signup.user.firstName,
            lastName: signup.user.lastName,
            profilePhotoUrl: signup.user.profilePhotoUrl,
            status: signup.status,
          });
        }
      }
    }

    const shiftItem: ShiftItem = {
      id: s.id,
      start: s.start,
      end: s.end,
      location: s.location,
      notes: s.notes,
      capacity: s.capacity,
      remaining: Math.max(0, s.capacity - confirmedCount),
      shiftType: { id: s.shiftType.id, name: s.shiftType.name },
    };

    if (withFriends) {
      shiftItem.friendsSignedUp = friendsSignedUp;
    }

    result.push(shiftItem);
  }

  return NextResponse.json(result);
}
