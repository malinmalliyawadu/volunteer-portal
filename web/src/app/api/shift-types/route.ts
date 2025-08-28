import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const shiftTypes = await prisma.shiftType.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(shiftTypes);
  } catch (error) {
    console.error("Error fetching shift types:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift types" },
      { status: 500 }
    );
  }
}