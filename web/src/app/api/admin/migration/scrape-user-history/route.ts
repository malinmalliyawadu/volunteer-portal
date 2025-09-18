import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createNovaScraper, NovaAuthConfig } from "@/lib/laravel-nova-scraper";
import { HistoricalDataTransformer } from "@/lib/historical-data-transformer";

interface ScrapeUserRequest {
  userEmail: string;
  novaConfig: {
    baseUrl: string;
    email: string;
    password: string;
  };
  options?: {
    dryRun?: boolean;
    includeShifts?: boolean;
    includeSignups?: boolean;
  };
}

interface ScrapeUserResponse {
  success: boolean;
  userFound: boolean;
  userCreated?: boolean;
  shiftsFound: number;
  shiftsImported: number;
  signupsFound: number;
  signupsImported: number;
  errors: string[];
  details?: {
    userData?: any;
    shifts?: any[];
    signups?: any[];
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: ScrapeUserRequest = await request.json();
    const { userEmail, novaConfig, options = {} } = body;

    if (!userEmail || !novaConfig.baseUrl || !novaConfig.email || !novaConfig.password) {
      return NextResponse.json(
        { error: "Missing required fields: userEmail, novaConfig" },
        { status: 400 }
      );
    }

    const response: ScrapeUserResponse = {
      success: false,
      userFound: false,
      shiftsFound: 0,
      shiftsImported: 0,
      signupsFound: 0,
      signupsImported: 0,
      errors: [],
    };

    try {
      // Check if user already exists in our system
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail.toLowerCase() },
      });

      // Create Nova scraper instance
      const scraper = await createNovaScraper({
        baseUrl: novaConfig.baseUrl,
        email: novaConfig.email,
        password: novaConfig.password,
      } as NovaAuthConfig);

      // First, find the user in Nova system using search parameter
      console.log(`Looking for user: ${userEmail} in Nova...`);
      
      let targetNovaUser = null;
      let userFound = false;

      try {
        // Use Nova's search functionality to find user by email
        const novaResponse = await scraper.novaApiRequest(`/users?search=${encodeURIComponent(userEmail)}&perPage=100`);
        
        if (novaResponse.resources && novaResponse.resources.length > 0) {
          // Look through search results to find exact email match
          for (const user of novaResponse.resources) {
            // Extract email from Nova's field structure
            const emailField = user.fields.find((field: any) => field.attribute === 'email');
            const userEmail_fromNova = emailField?.value;
            
            if (userEmail_fromNova && userEmail_fromNova.toLowerCase() === userEmail.toLowerCase()) {
              targetNovaUser = user;
              userFound = true;
              response.userFound = true;
              console.log(`Found user in Nova search results: ${userEmail_fromNova}`);
              break;
            }
          }
          
          if (!userFound) {
            console.log(`User ${userEmail} found in search results but no exact email match`);
            console.log(`Search returned ${novaResponse.resources.length} results`);
            // Log first user's email for debugging
            if (novaResponse.resources[0]?.fields) {
              const firstUserEmailField = novaResponse.resources[0].fields.find((field: any) => field.attribute === 'email');
              console.log(`First result email: ${firstUserEmailField?.value}`);
            }
          }
        } else {
          console.log(`No users found in Nova search for: ${userEmail}`);
          console.log(`Nova response structure:`, Object.keys(novaResponse));
        }
      } catch (error) {
        console.error(`Error searching Nova users:`, error);
        response.errors.push(`Error searching Nova users: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (!userFound) {
        return NextResponse.json({
          ...response,
          success: true,
          userFound: false,
        });
      }

      console.log(`Found user in Nova:`, targetNovaUser);

      // If user doesn't exist in our system and we're not in dry run mode, create them
      let ourUser = existingUser;
      if (!existingUser && !options.dryRun) {
        try {
          const transformer = new HistoricalDataTransformer({
            dryRun: false,
            markAsMigrated: true,
          });

          const userData = await transformer.transformUser(targetNovaUser);
          ourUser = await prisma.user.create({
            data: userData,
          });

          response.userCreated = true;
          console.log(`Created user in our system: ${ourUser.email}`);
        } catch (error) {
          response.errors.push(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Now scrape historical shifts for this user if requested
      if (options.includeShifts !== false && targetNovaUser) {
        try {
          // Extract user ID from Nova structure
          const novaUserId = targetNovaUser.id?.value || targetNovaUser.id;
          console.log(`Scraping event applications for user ${novaUserId}...`);
          
          // Get user's event applications (shift signups) - need to paginate through all results
          let allSignups = [];
          let page = 1;
          let hasMorePages = true;

          while (hasMorePages) {
            const signupsResponse = await scraper.novaApiRequest(
              `/event-applications?viaResource=users&viaResourceId=${novaUserId}&viaRelationship=event_applications&perPage=100&page=${page}`
            );

            if (signupsResponse.resources && signupsResponse.resources.length > 0) {
              allSignups.push(...signupsResponse.resources);
              console.log(`Found ${signupsResponse.resources.length} signups on page ${page}, total: ${allSignups.length}`);
              
              // Check for more pages
              hasMorePages = signupsResponse.next_page_url !== null;
              page++;
            } else {
              hasMorePages = false;
            }
          }

          if (allSignups.length > 0) {
            response.signupsFound = allSignups.length;
            
            // Extract event IDs and application data
            const eventIds = new Set<number>();
            const signupData = [];

            for (const signup of allSignups) {
              const eventField = signup.fields.find((f: any) => f.attribute === 'event');
              const positionField = signup.fields.find((f: any) => f.attribute === 'position');
              const statusField = signup.fields.find((f: any) => f.attribute === 'applicationStatus');

              if (eventField && eventField.belongsToId) {
                eventIds.add(eventField.belongsToId);
              }

              signupData.push({
                id: signup.id.value,
                eventId: eventField?.belongsToId,
                eventName: eventField?.value,
                positionId: positionField?.belongsToId,
                positionName: positionField?.value,
                statusId: statusField?.belongsToId,
                statusName: statusField?.value,
              });
            }

            // Get details for events (shifts)
            const eventDetails = [];
            for (const eventId of eventIds) {
              try {
                const eventResponse = await scraper.novaApiRequest(`/events/${eventId}`);
                if (eventResponse.resource) {
                  eventDetails.push(eventResponse.resource);
                }
              } catch (error) {
                console.error(`Error fetching event ${eventId}:`, error);
              }
            }

            response.shiftsFound = eventDetails.length;

            // Transform and import data if not dry run
            if (!options.dryRun && ourUser) {
              try {
                const transformer = new HistoricalDataTransformer({
                  dryRun: false,
                  skipExistingUsers: true,
                  skipExistingShifts: true,
                });

                // Transform and create shifts/signups
                let shiftsImported = 0;
                let signupsImported = 0;

                for (const eventDetail of eventDetails) {
                  try {
                    // Transform event to shift format
                    const shiftData = transformer.transformEvent(eventDetail);
                    
                    // Ensure shift type exists
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
                        // Match based on event name and date
                        notes: { contains: `Nova Event ID: ${eventDetail.id.value}` },
                      },
                    });

                    let shift = existingShift;
                    if (!existingShift) {
                      const { shiftTypeName, ...shiftCreateData } = shiftData;
                      shift = await prisma.shift.create({
                        data: {
                          ...shiftCreateData,
                          shiftTypeId: shiftType.id,
                          notes: `${shiftData.notes || ''} Nova Event ID: ${eventDetail.id.value}`.trim(),
                        },
                      });
                      shiftsImported++;
                    }

                    // Create signup if shift exists and user signup doesn't exist
                    if (shift) {
                      const userSignups = signupData.filter(s => s.eventId === eventDetail.id.value);
                      
                      for (const signupInfo of userSignups) {
                        const existingSignup = await prisma.signup.findUnique({
                          where: {
                            userId_shiftId: {
                              userId: ourUser.id,
                              shiftId: shift.id,
                            },
                          },
                        });

                        if (!existingSignup) {
                          await prisma.signup.create({
                            data: transformer.transformSignup(signupInfo, ourUser.id, shift.id),
                          });
                          signupsImported++;
                        }
                      }
                    }
                  } catch (error) {
                    response.errors.push(`Error processing event ${eventDetail.id.value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }

                response.shiftsImported = shiftsImported;
                response.signupsImported = signupsImported;

              } catch (error) {
                response.errors.push(`Error transforming data: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }

            // Include details if requested
            if (options.dryRun) {
              response.details = {
                userData: targetNovaUser,
                shifts: eventDetails,
                signups: signupData,
              };
            }
          }
        } catch (error) {
          response.errors.push(`Error scraping user shifts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      response.success = true;
      return NextResponse.json(response);

    } catch (error) {
      console.error("Nova scraping error:", error);
      response.errors.push(`Nova scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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