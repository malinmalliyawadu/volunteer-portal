import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all unique locations from shifts that are not null
    const shifts = await prisma.shift.findMany({
      select: {
        location: true,
      },
      where: {
        location: {
          not: null,
        },
      },
    });

    // Extract unique locations, clean all whitespace, and sort them
    const uniqueLocations = [
      ...new Set(
        shifts
          .map((shift: { location: string | null }) => shift.location)
          .filter(
            (location: string | null): location is string => location !== null
          )
          .map((location: string) => location.replace(/\s+/g, " ").trim()) // Clean all whitespace
          .filter((location: string) => location.length > 0) // Remove empty strings
      ),
    ].sort();

    // Transform to the format expected by the frontend
    const locationOptions = uniqueLocations.map((location) => ({
      value: location,
      label: location,
    }));

    return NextResponse.json(locationOptions);
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
