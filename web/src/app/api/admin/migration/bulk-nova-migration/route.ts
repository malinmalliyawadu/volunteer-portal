import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createNovaScraper, NovaAuthConfig, NovaUserResource } from "@/lib/laravel-nova-scraper";
import { HistoricalDataTransformer } from "@/lib/historical-data-transformer";
import { sendProgress as sendProgressUpdate } from "../progress/route";

interface BulkMigrationRequest {
  novaConfig: {
    baseUrl: string;
    email: string;
    password: string;
  };
  options?: {
    skipExistingUsers?: boolean;
    includeHistoricalData?: boolean;
    batchSize?: number;
  };
  sessionId?: string;
}

interface BulkMigrationResponse {
  success: boolean;
  totalUsers: number;
  usersProcessed: number;
  usersCreated: number;
  usersSkipped: number;
  usersWithHistory: number;
  totalShifts: number;
  totalSignups: number;
  errors: string[];
  duration: number;
}

// Helper function to send progress updates
async function sendProgress(sessionId: string | undefined, data: any) {
  if (!sessionId) return;
  
  try {
    sendProgressUpdate(sessionId, data);
  } catch (error) {
    console.log('Failed to send progress update:', error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: BulkMigrationRequest = await request.json();
    const { novaConfig, options = {}, sessionId } = body;

    if (!novaConfig.baseUrl || !novaConfig.email || !novaConfig.password) {
      return NextResponse.json(
        { error: "Missing required Nova configuration" },
        { status: 400 }
      );
    }

    const {
      skipExistingUsers = true,
      includeHistoricalData = true,
      batchSize = 50,
    } = options;

    const response: BulkMigrationResponse = {
      success: false,
      totalUsers: 0,
      usersProcessed: 0,
      usersCreated: 0,
      usersSkipped: 0,
      usersWithHistory: 0,
      totalShifts: 0,
      totalSignups: 0,
      errors: [],
      duration: 0,
    };

    console.log(`[BULK] Starting bulk Nova migration`);
    
    await sendProgress(sessionId, {
      type: 'status',
      message: 'Starting bulk migration...',
      stage: 'connecting'
    });

    try {
      // Create Nova scraper instance and authenticate
      await sendProgress(sessionId, {
        type: 'status',
        message: 'Authenticating with Nova...',
        stage: 'connecting'
      });
      
      const scraper = await createNovaScraper({
        baseUrl: novaConfig.baseUrl,
        email: novaConfig.email,
        password: novaConfig.password,
      } as NovaAuthConfig);

      // Step 1: Scrape users from Nova (limited for dev)
      console.log(`[BULK] Step 1: Scraping users from Nova (limited to ${batchSize} for dev)...`);
      await sendProgress(sessionId, {
        type: 'status',
        message: 'Fetching users from Nova...',
        stage: 'fetching'
      });
      
      // For actual migration, respect batch size limit
      const allNovaUsers = await scraper.scrapeUsers(batchSize);
      response.totalUsers = allNovaUsers.length;
      console.log(`[BULK] Found ${allNovaUsers.length} users to process`);
      
      await sendProgress(sessionId, {
        type: 'status',
        message: `Found ${allNovaUsers.length} users to migrate`,
        stage: 'processing',
        totalUsers: allNovaUsers.length
      });

      // Step 2: Process users in batches
      const transformer = new HistoricalDataTransformer({
        dryRun: false,
        skipExistingUsers,
        markAsMigrated: true,
      });

      for (let i = 0; i < allNovaUsers.length; i += batchSize) {
        const batch = allNovaUsers.slice(i, i + batchSize);
        console.log(`[BULK] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allNovaUsers.length / batchSize)} (${batch.length} users)`);

        for (const novaUser of batch) {
          try {
            response.usersProcessed++;

            // Extract email from Nova user structure
            const novaUserResource = novaUser as NovaUserResource;
            const emailField = novaUserResource.fields?.find((f) => f.attribute === 'email');
            const userEmail = emailField?.value;

            if (!userEmail) {
              response.errors.push(`User ${novaUserResource.id.value} has no email address`);
              continue;
            }

            // Send progress update for current user
            await sendProgress(sessionId, {
              type: 'progress',
              message: `Processing user: ${userEmail}`,
              stage: 'processing',
              currentUser: userEmail,
              usersProcessed: response.usersProcessed,
              totalUsers: response.totalUsers,
              usersCreated: response.usersCreated,
              usersSkipped: response.usersSkipped
            });

            // Check if user already exists
            if (skipExistingUsers) {
              const existingUser = await prisma.user.findUnique({
                where: { email: userEmail.toLowerCase() },
              });

              if (existingUser) {
                response.usersSkipped++;
                console.log(`[BULK] Skipping existing user: ${userEmail}`);
                continue;
              }
            }

            // Create user in our system (pass scraper for photo downloads)
            const userData = await transformer.transformUser(novaUser, scraper);
            const newUser = await prisma.user.create({
                data: userData,
              });

              response.usersCreated++;
              console.log(`[BULK] Created user: ${newUser.email}`);

            // Step 3: Import historical data if requested
            if (includeHistoricalData) {
              try {
                const novaUserId = novaUserResource.id.value;
                
                // Get user's event applications with pagination
                let allSignups = [];
                let page = 1;
                let hasMorePages = true;

                // For development, just get first few signups
                const signupsResponse = await scraper.novaApiRequest(
                  `/event-applications?viaResource=users&viaResourceId=${novaUserId}&viaRelationship=event_applications&perPage=3&page=1`
                );

                if (signupsResponse.resources && signupsResponse.resources.length > 0) {
                  allSignups = signupsResponse.resources;
                  console.log(`[BULK] Found ${signupsResponse.resources.length} signups for user (limited to 3 for dev)`);
                }

                if (allSignups.length > 0) {
                  response.usersWithHistory++;
                  
                  // Extract event IDs
                  const eventIds = new Set<number>();
                  for (const signup of allSignups) {
                    const eventField = signup.fields.find((f: any) => f.attribute === 'event');
                    if (eventField?.belongsToId) {
                      eventIds.add(eventField.belongsToId);
                    }
                  }

                  // Import shifts and signups
                  let shiftsImported = 0;
                  let signupsImported = 0;

                  for (const eventId of eventIds) {
                    try {
                      // Get event details
                      const eventResponse = await scraper.novaApiRequest(`/events/${eventId}`);
                      if (eventResponse.resource) {
                        // Get signups for this event to determine position/shift type
                        const eventSignups = allSignups.filter((s: any) => {
                          const eventField = s.fields.find((f: any) => f.attribute === 'event');
                          return eventField?.belongsToId === eventId;
                        });
                        
                        // Extract signup data with positions
                        const signupData = eventSignups.map((signup: any) => ({
                          positionName: signup.fields.find((f: any) => f.attribute === 'position')?.value || 'General Volunteering'
                        }));

                        // Transform event to shift with signup position data
                        const shiftData = transformer.transformEvent(eventResponse.resource, signupData);
                        
                        // Create or find shift type
                        let shiftType = await prisma.shiftType.findUnique({
                          where: { name: shiftData.shiftTypeName },
                        });

                        if (!shiftType) {
                          shiftType = await prisma.shiftType.create({
                            data: {
                              name: shiftData.shiftTypeName,
                              description: `Migrated from Nova - ${shiftData.shiftTypeName}`,
                            },
                          });
                        }

                        // Check if shift already exists
                        const existingShift = await prisma.shift.findFirst({
                          where: {
                            notes: { contains: `Nova Event ID: ${eventId}` },
                          },
                        });

                        let shift = existingShift;
                        if (!existingShift) {
                          const { shiftTypeName, ...shiftCreateData } = shiftData;
                          shift = await prisma.shift.create({
                            data: {
                              ...shiftCreateData,
                              shiftTypeId: shiftType.id,
                              notes: `${shiftData.notes || ''} Nova Event ID: ${eventId}`.trim(),
                            },
                          });
                          shiftsImported++;
                        }

                        // Create signups for this shift
                        if (shift) {
                          const userSignups = allSignups.filter((s: any) => {
                            const eventField = s.fields.find((f: any) => f.attribute === 'event');
                            return eventField?.belongsToId === eventId;
                          });

                          for (const signupInfo of userSignups) {
                            const existingSignup = await prisma.signup.findUnique({
                              where: {
                                userId_shiftId: {
                                  userId: newUser.id,
                                  shiftId: shift.id,
                                },
                              },
                            });

                            if (!existingSignup) {
                              await prisma.signup.create({
                                data: transformer.transformSignup(signupInfo, newUser.id, shift.id),
                              });
                              signupsImported++;
                            }
                          }
                        }
                      }
                    } catch (error) {
                      response.errors.push(`Error processing event ${eventId} for user ${userEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }

                  response.totalShifts += shiftsImported;
                  response.totalSignups += signupsImported;
                  
                  console.log(`[BULK] Imported ${shiftsImported} shifts and ${signupsImported} signups for ${userEmail}`);
                }
              } catch (error) {
                response.errors.push(`Error importing historical data for ${userEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }

          } catch (error) {
            const novaUserResource = novaUser as NovaUserResource;
            const emailField = novaUserResource.fields?.find((f) => f.attribute === 'email');
            const userEmail = emailField?.value || 'unknown';
            response.errors.push(`Error processing user ${userEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Add small delay between batches to avoid overwhelming the system
        if (i + batchSize < allNovaUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      response.success = true;
      response.duration = Date.now() - startTime;

      console.log(`[BULK] Migration completed in ${response.duration}ms`);
      console.log(`[BULK] Results:`, {
        totalUsers: response.totalUsers,
        usersCreated: response.usersCreated,
        usersSkipped: response.usersSkipped,
        usersWithHistory: response.usersWithHistory,
        totalShifts: response.totalShifts,
        totalSignups: response.totalSignups,
        errors: response.errors.length,
      });

      // Send completion update
      await sendProgress(sessionId, {
        type: 'complete',
        message: `Migration completed! ${response.usersCreated} users were migrated`,
        stage: 'complete',
        ...response
      });

      return NextResponse.json(response);

    } catch (error) {
      console.error("Bulk Nova migration error:", error);
      response.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      response.duration = Date.now() - startTime;
      return NextResponse.json(response, { status: 500 });
    }

  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
