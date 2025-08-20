import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

interface Params {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;

    // Check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // Create or update resource access
    await prisma.resourceAccess.upsert({
      where: {
        userId_resourceId: {
          userId,
          resourceId: id,
        },
      },
      update: {
        accessedAt: new Date(),
      },
      create: {
        userId,
        resourceId: id,
        accessedAt: new Date(),
      },
    });

    // Increment view count
    await prisma.resource.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking resource access:", error);
    return NextResponse.json(
      { error: "Failed to track access" },
      { status: 500 }
    );
  }
}