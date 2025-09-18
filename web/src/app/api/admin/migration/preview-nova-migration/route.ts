import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createNovaScraper, NovaAuthConfig } from "@/lib/laravel-nova-scraper";

interface PreviewRequest {
  novaConfig: {
    baseUrl: string;
    email: string;
    password: string;
  };
  options?: {
    skipExistingUsers?: boolean;
  };
}

interface PreviewUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  status: 'new' | 'existing' | 'invalid';
  existingUserId?: string;
}

interface PreviewResponse {
  success: boolean;
  totalUsers: number;
  newUsers: PreviewUser[];
  existingUsers: PreviewUser[];
  invalidUsers: PreviewUser[];
  summary: {
    wouldCreate: number;
    wouldSkip: number;
    hasErrors: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: PreviewRequest = await request.json();
    const { novaConfig, options = {} } = body;
    const { skipExistingUsers = true } = options;

    if (!novaConfig.baseUrl || !novaConfig.email || !novaConfig.password) {
      return NextResponse.json(
        { error: "Missing required Nova configuration fields" },
        { status: 400 }
      );
    }

    try {
      console.log(`[PREVIEW] Starting migration preview...`);
      
      // Connect to Nova and fetch all users
      const scraper = await createNovaScraper({
        baseUrl: novaConfig.baseUrl,
        email: novaConfig.email,
        password: novaConfig.password,
      } as NovaAuthConfig);

      console.log(`[PREVIEW] Fetching all users from Nova for preview...`);
      const allNovaUsers = await scraper.scrapeUsers(); // Fetch ALL users for preview
      
      console.log(`[PREVIEW] Found ${allNovaUsers.length} users, analyzing status...`);

      const newUsers: PreviewUser[] = [];
      const existingUsers: PreviewUser[] = [];
      const invalidUsers: PreviewUser[] = [];

      // Analyze each user
      for (const novaUser of allNovaUsers) {
        try {
          // Extract email from Nova user structure
          const userEmail = novaUser.email;
          const userName = novaUser.name;
          const firstName = novaUser.first_name;
          const lastName = novaUser.last_name;
          
          const displayName = userName || 
            (firstName && lastName ? `${firstName} ${lastName}` : 'Unknown User');

          if (!userEmail) {
            invalidUsers.push({
              id: (novaUser as any).id?.value?.toString() || (novaUser as any).id?.toString() || 'unknown',
              email: 'No email',
              name: displayName,
              firstName,
              lastName,
              status: 'invalid'
            });
            continue;
          }

          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: userEmail.toLowerCase() },
            select: { id: true, email: true, name: true }
          });

          const previewUser: PreviewUser = {
            id: (novaUser as any).id?.value?.toString() || (novaUser as any).id?.toString() || 'unknown',
            email: userEmail,
            name: displayName,
            firstName,
            lastName,
            status: existingUser ? 'existing' : 'new',
            existingUserId: existingUser?.id
          };

          if (existingUser) {
            existingUsers.push(previewUser);
          } else {
            newUsers.push(previewUser);
          }

        } catch (error) {
          console.error(`[PREVIEW] Error analyzing user:`, error);
          invalidUsers.push({
            id: 'error',
            email: 'Error processing user',
            name: 'Error',
            status: 'invalid'
          });
        }
      }

      const response: PreviewResponse = {
        success: true,
        totalUsers: allNovaUsers.length,
        newUsers,
        existingUsers,
        invalidUsers,
        summary: {
          wouldCreate: newUsers.length,
          wouldSkip: skipExistingUsers ? existingUsers.length : 0,
          hasErrors: invalidUsers.length
        }
      };

      console.log(`[PREVIEW] Preview complete: ${response.summary.wouldCreate} new, ${response.summary.wouldSkip} existing, ${response.summary.hasErrors} errors`);

      return NextResponse.json(response);

    } catch (error) {
      console.error("Migration preview failed:", error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Preview failed",
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}