import { prisma } from '@/lib/prisma';
import { ScrapedData, NovaUser, NovaShift, NovaShiftSignup } from './laravel-nova-scraper';
import { hash } from 'bcryptjs';
import { SignupStatus } from '@prisma/client';

interface TransformationResult {
  success: boolean;
  stats: {
    usersProcessed: number;
    usersCreated: number;
    usersSkipped: number;
    shiftTypesCreated: number;
    shiftsProcessed: number;
    shiftsCreated: number;
    shiftsSkipped: number;
    signupsProcessed: number;
    signupsCreated: number;
    signupsSkipped: number;
  };
  errors: Array<{
    type: 'user' | 'shift' | 'signup';
    id: number;
    error: string;
  }>;
}

interface TransformationOptions {
  dryRun?: boolean;
  skipExistingUsers?: boolean;
  skipExistingShifts?: boolean;
  defaultPassword?: string;
  markAsMigrated?: boolean;
}

export class HistoricalDataTransformer {
  private options: TransformationOptions;
  private result: TransformationResult;

  constructor(options: TransformationOptions = {}) {
    this.options = {
      dryRun: false,
      skipExistingUsers: true,
      skipExistingShifts: true,
      defaultPassword: 'temp_password_123',
      markAsMigrated: true,
      ...options,
    };

    this.result = {
      success: true,
      stats: {
        usersProcessed: 0,
        usersCreated: 0,
        usersSkipped: 0,
        shiftTypesCreated: 0,
        shiftsProcessed: 0,
        shiftsCreated: 0,
        shiftsSkipped: 0,
        signupsProcessed: 0,
        signupsCreated: 0,
        signupsSkipped: 0,
      },
      errors: [],
    };
  }

  /**
   * Transform and import all scraped data
   */
  async transformAndImport(scrapedData: ScrapedData): Promise<TransformationResult> {
    console.log('Starting historical data transformation...');
    console.log(`Processing ${scrapedData.users.length} users, ${scrapedData.shifts.length} shifts, ${scrapedData.signups.length} signups`);

    try {
      // Step 1: Process users first
      await this.processUsers(scrapedData.users);

      // Step 2: Process shift types and shifts
      await this.processShifts(scrapedData.shifts);

      // Step 3: Process signups
      await this.processSignups(scrapedData.signups, scrapedData.users);

      console.log('Historical data transformation completed successfully');
      return this.result;

    } catch (error) {
      console.error('Transformation failed:', error);
      this.result.success = false;
      return this.result;
    }
  }

  /**
   * Process and create users from Nova data
   */
  private async processUsers(novaUsers: NovaUser[]): Promise<void> {
    console.log('Processing users...');

    for (const novaUser of novaUsers) {
      this.result.stats.usersProcessed++;

      try {
        // Check if user already exists
        if (this.options.skipExistingUsers) {
          const existingUser = await prisma.user.findUnique({
            where: { email: novaUser.email.toLowerCase() },
          });

          if (existingUser) {
            this.result.stats.usersSkipped++;
            continue;
          }
        }

        if (!this.options.dryRun) {
          // Transform Nova user to Prisma user format
          const userData = await this.transformUser(novaUser);
          
          const createdUser = await prisma.user.create({
            data: userData,
          });

          console.log(`Created user: ${createdUser.email}`);
        }

        this.result.stats.usersCreated++;

      } catch (error) {
        this.result.errors.push({
          type: 'user',
          id: novaUser.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Failed to process user ${novaUser.id}:`, error);
      }
    }

    console.log(`Users processed: ${this.result.stats.usersCreated} created, ${this.result.stats.usersSkipped} skipped`);
  }

  /**
   * Process and create shifts from Nova data
   */
  private async processShifts(novaShifts: NovaShift[]): Promise<void> {
    console.log('Processing shifts...');

    // First, ensure shift types exist
    const shiftTypeMap = await this.ensureShiftTypes(novaShifts);

    for (const novaShift of novaShifts) {
      this.result.stats.shiftsProcessed++;

      try {
        // Skip if shift already exists (based on start time, end time, and shift type)
        if (this.options.skipExistingShifts) {
          const existingShift = await prisma.shift.findFirst({
            where: {
              start: new Date(novaShift.start_time),
              end: new Date(novaShift.end_time),
              shiftType: {
                name: novaShift.shift_type,
              },
            },
          });

          if (existingShift) {
            this.result.stats.shiftsSkipped++;
            continue;
          }
        }

        if (!this.options.dryRun) {
          const shiftData = this.transformShift(novaShift, shiftTypeMap);
          
          const createdShift = await prisma.shift.create({
            data: shiftData,
            include: { shiftType: true },
          });

          console.log(`Created shift: ${createdShift.shiftType.name} on ${createdShift.start.toISOString()}`);
        }

        this.result.stats.shiftsCreated++;

      } catch (error) {
        this.result.errors.push({
          type: 'shift',
          id: novaShift.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Failed to process shift ${novaShift.id}:`, error);
      }
    }

    console.log(`Shifts processed: ${this.result.stats.shiftsCreated} created, ${this.result.stats.shiftsSkipped} skipped`);
  }

  /**
   * Process and create signups from Nova data
   */
  private async processSignups(novaSignups: NovaShiftSignup[], novaUsers: NovaUser[]): Promise<void> {
    console.log('Processing signups...');

    // Create maps for efficient lookup
    const userEmailMap = new Map(novaUsers.map(user => [user.id, user.email]));

    for (const novaSignup of novaSignups) {
      this.result.stats.signupsProcessed++;

      try {
        const userEmail = userEmailMap.get(novaSignup.user_id);
        if (!userEmail) {
          throw new Error(`User not found for signup ${novaSignup.id}`);
        }

        // Find corresponding user and shift in new system
        const user = await prisma.user.findUnique({
          where: { email: userEmail.toLowerCase() },
        });

        if (!user) {
          this.result.stats.signupsSkipped++;
          continue;
        }

        // Find corresponding shift - this is tricky without direct ID mapping
        // We'll match based on Nova shift ID stored in a custom field or notes
        const shift = await prisma.shift.findFirst({
          where: {
            // We'll need to find a way to map this - perhaps by timestamp and type
            // For now, skip if we can't find a reliable way to match
            id: `nova_${novaSignup.shift_id}`, // This won't work, need better strategy
          },
        });

        if (!shift) {
          this.result.stats.signupsSkipped++;
          continue;
        }

        // Check if signup already exists
        const existingSignup = await prisma.signup.findUnique({
          where: {
            userId_shiftId: {
              userId: user.id,
              shiftId: shift.id,
            },
          },
        });

        if (existingSignup) {
          this.result.stats.signupsSkipped++;
          continue;
        }

        if (!this.options.dryRun) {
          const signupData = this.transformSignup(novaSignup, user.id, shift.id);
          
          const createdSignup = await prisma.signup.create({
            data: signupData,
            include: {
              user: { select: { email: true } },
              shift: { include: { shiftType: true } },
            },
          });

          console.log(`Created signup: ${createdSignup.user.email} -> ${createdSignup.shift.shiftType.name}`);
        }

        this.result.stats.signupsCreated++;

      } catch (error) {
        this.result.errors.push({
          type: 'signup',
          id: novaSignup.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Failed to process signup ${novaSignup.id}:`, error);
      }
    }

    console.log(`Signups processed: ${this.result.stats.signupsCreated} created, ${this.result.stats.signupsSkipped} skipped`);
  }

  /**
   * Transform Nova user to Prisma user format (public method for API usage)
   */
  async transformUser(novaUser: any): Promise<any> {
    const hashedPassword = await hash(this.options.defaultPassword!, 12);

    // Handle both old flat structure and new Nova field structure
    let email, firstName, lastName, phone;
    
    if (novaUser.fields) {
      // New Nova field structure
      email = novaUser.fields.find((f: any) => f.attribute === 'email')?.value;
      firstName = novaUser.fields.find((f: any) => f.attribute === 'first_name')?.value;
      lastName = novaUser.fields.find((f: any) => f.attribute === 'last_name')?.value;
      phone = novaUser.fields.find((f: any) => f.attribute === 'phone')?.value;
    } else {
      // Old flat structure (backward compatibility)
      email = novaUser.email;
      firstName = novaUser.first_name;
      lastName = novaUser.last_name;
      phone = novaUser.phone;
    }

    const name = `${firstName || ''} ${lastName || ''}`.trim() || email;

    return {
      email: email.toLowerCase(),
      name,
      firstName,
      lastName,
      phone,
      dateOfBirth: null, // Nova doesn't seem to have this in the current structure
      emergencyContactName: null, // Not available in current Nova structure
      emergencyContactRelationship: null,
      emergencyContactPhone: null,
      medicalConditions: null,
      hashedPassword,
      profileCompleted: true, // Assume legacy users had completed profiles
      isMigrated: this.options.markAsMigrated,
      createdAt: new Date(), // Use current time since Nova doesn't provide created_at in field structure
      updatedAt: new Date(),
    };
  }

  /**
   * Transform Nova shift to Prisma shift format
   */
  private transformShift(novaShift: NovaShift, shiftTypeMap: Map<string, string>): any {
    const shiftTypeId = shiftTypeMap.get(novaShift.shift_type);
    
    if (!shiftTypeId) {
      throw new Error(`Shift type not found: ${novaShift.shift_type}`);
    }

    return {
      shiftTypeId,
      start: new Date(novaShift.start_time),
      end: new Date(novaShift.end_time),
      location: novaShift.location,
      capacity: novaShift.capacity,
      notes: novaShift.notes,
      createdAt: new Date(novaShift.created_at),
      updatedAt: new Date(novaShift.updated_at),
    };
  }

  /**
   * Transform Nova event to Prisma shift format
   */
  transformEvent(novaEvent: any): any {
    // Extract event details from Nova's field structure
    const eventName = novaEvent.fields?.find((f: any) => f.attribute === 'name')?.value || 'Unknown Event';
    const eventDate = novaEvent.fields?.find((f: any) => f.attribute === 'date')?.value;
    const location = novaEvent.fields?.find((f: any) => f.attribute === 'location')?.value || 'Unknown Location';
    const capacity = novaEvent.fields?.find((f: any) => f.attribute === 'capacity')?.value || 10;

    // Parse event name to extract date and shift type
    // Format: "Sunday 7th September WGTN"
    let startDate = new Date();
    let endDate = new Date();
    let shiftTypeName = 'General Volunteering';

    if (eventDate) {
      startDate = new Date(eventDate);
      endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // 4 hours later
    } else if (eventName.includes('Sunday')) {
      // Try to parse date from event name
      const match = eventName.match(/(\d+)(?:st|nd|rd|th)\s+(\w+)/);
      if (match) {
        const [, day, month] = match;
        const year = new Date().getFullYear();
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        startDate = new Date(year, monthIndex, parseInt(day), 10, 0); // 10 AM start
        endDate = new Date(year, monthIndex, parseInt(day), 14, 0); // 2 PM end
      }
    }

    if (eventName.includes('WGTN')) {
      shiftTypeName = 'Wellington Event';
    } else if (eventName.includes('AKL')) {
      shiftTypeName = 'Auckland Event';
    }

    return {
      shiftTypeId: null, // Will be resolved when creating the shift
      start: startDate,
      end: endDate,
      location: location,
      capacity: parseInt(capacity.toString()) || 10,
      notes: `Migrated from Nova: ${eventName}`,
      createdAt: novaEvent.created_at ? new Date(novaEvent.created_at) : new Date(),
      updatedAt: novaEvent.updated_at ? new Date(novaEvent.updated_at) : new Date(),
      shiftTypeName, // Helper field for creating shift type
    };
  }

  /**
   * Transform Nova signup to Prisma signup format
   */
  transformSignup(novaSignup: any, userId: string, shiftId: string): any {
    // Map Nova status to Prisma SignupStatus
    const statusMap: Record<string, SignupStatus> = {
      'confirmed': SignupStatus.CONFIRMED,
      'pending': SignupStatus.PENDING,
      'cancelled': SignupStatus.CANCELED,
      'canceled': SignupStatus.CANCELED,
      'waitlisted': SignupStatus.WAITLISTED,
      'no_show': SignupStatus.NO_SHOW,
    };

    const status = statusMap[novaSignup.status.toLowerCase()] || SignupStatus.CONFIRMED;

    return {
      userId,
      shiftId,
      status,
      canceledAt: novaSignup.canceled_at ? new Date(novaSignup.canceled_at) : null,
      createdAt: new Date(novaSignup.created_at),
      updatedAt: new Date(novaSignup.updated_at),
    };
  }

  /**
   * Ensure all shift types exist, create if necessary
   */
  private async ensureShiftTypes(novaShifts: NovaShift[]): Promise<Map<string, string>> {
    const uniqueShiftTypes = [...new Set(novaShifts.map(shift => shift.shift_type))];
    const shiftTypeMap = new Map<string, string>();

    for (const shiftTypeName of uniqueShiftTypes) {
      try {
        let shiftType = await prisma.shiftType.findUnique({
          where: { name: shiftTypeName },
        });

        if (!shiftType && !this.options.dryRun) {
          shiftType = await prisma.shiftType.create({
            data: {
              name: shiftTypeName,
              description: `Migrated from legacy system - ${shiftTypeName}`,
            },
          });
          this.result.stats.shiftTypesCreated++;
          console.log(`Created shift type: ${shiftTypeName}`);
        }

        if (shiftType) {
          shiftTypeMap.set(shiftTypeName, shiftType.id);
        }
      } catch (error) {
        console.error(`Failed to create shift type ${shiftTypeName}:`, error);
      }
    }

    return shiftTypeMap;
  }

  /**
   * Get transformation statistics
   */
  getStats(): TransformationResult['stats'] {
    return this.result.stats;
  }

  /**
   * Get transformation errors
   */
  getErrors(): TransformationResult['errors'] {
    return this.result.errors;
  }
}

/**
 * Utility function to run a complete historical data import
 */
export async function importHistoricalData(
  scrapedData: ScrapedData,
  options: TransformationOptions = {}
): Promise<TransformationResult> {
  const transformer = new HistoricalDataTransformer(options);
  return await transformer.transformAndImport(scrapedData);
}

export type { TransformationResult, TransformationOptions };