import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// GET /api/admin/users - List all users (for admin use)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = searchParams.get("limit");

  try {
    // Fetch all users first, then filter in memory for better search flexibility
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        profileCompleted: true,
        profilePhotoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: "asc" }, // Admins first
        { email: "asc" },
      ],
    });

    let users = allUsers;

    // Filter users if query exists
    if (query) {
      const queryLower = query.toLowerCase();
      console.log(`[USER SEARCH] Query: "${query}" (lowercase: "${queryLower}")`);
      console.log(`[USER SEARCH] Total users to search: ${allUsers.length}`);
      
      // Log some sample user data to see the structure
      if (allUsers.length > 0) {
        console.log(`[USER SEARCH] Sample user structure:`, {
          id: allUsers[0].id,
          email: allUsers[0].email,
          name: allUsers[0].name,
          firstName: allUsers[0].firstName,
          lastName: allUsers[0].lastName,
        });
      }
      
      users = allUsers.filter(user => {
        const userInfo = {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
        };
        
        // Check email
        if (user.email?.toLowerCase().includes(queryLower)) {
          console.log(`[USER SEARCH] Match found in EMAIL for user:`, userInfo);
          return true;
        }
        
        // Check name field
        if (user.name?.toLowerCase().includes(queryLower)) {
          console.log(`[USER SEARCH] Match found in NAME for user:`, userInfo);
          return true;
        }
        
        // Check firstName
        if (user.firstName?.toLowerCase().includes(queryLower)) {
          console.log(`[USER SEARCH] Match found in FIRSTNAME for user:`, userInfo);
          return true;
        }
        
        // Check lastName  
        if (user.lastName?.toLowerCase().includes(queryLower)) {
          console.log(`[USER SEARCH] Match found in LASTNAME for user:`, userInfo);
          return true;
        }
        
        // Check concatenated firstName + lastName
        if (user.firstName && user.lastName) {
          const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
          if (fullName.includes(queryLower)) {
            console.log(`[USER SEARCH] Match found in FULLNAME ("${fullName}") for user:`, userInfo);
            return true;
          }
        }
        
        // Check concatenated lastName + firstName  
        if (user.firstName && user.lastName) {
          const reverseName = `${user.lastName} ${user.firstName}`.toLowerCase();
          if (reverseName.includes(queryLower)) {
            console.log(`[USER SEARCH] Match found in REVERSENAME ("${reverseName}") for user:`, userInfo);
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`[USER SEARCH] Found ${users.length} matching users`);
    }

    // Apply limit if specified
    if (limit) {
      users = users.slice(0, parseInt(limit));
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
