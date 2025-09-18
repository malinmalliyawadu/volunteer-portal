import { prisma } from '@/lib/prisma';
import { ScrapedData, NovaUser, NovaShift, NovaShiftSignup, LaravelNovaScraper } from './laravel-nova-scraper';
import { hash } from 'bcryptjs';
import { SignupStatus } from '@prisma/client';
import { profilePhotoDownloader } from './profile-photo-downloader';
import { randomBytes } from 'crypto';

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
  async transformUser(novaUser: any, scraper?: LaravelNovaScraper): Promise<any> {
    // Generate cryptographically secure random password for migrated users (they'll reset it during invitation flow)
    const randomPassword = randomBytes(32).toString('hex');
    const hashedPassword = await hash(randomPassword, 12);

    // Handle both old flat structure and new Nova field structure
    let email, firstName, lastName, phone, profilePhoto, approvedAt;
    
    if (novaUser.fields) {
      // New Nova field structure
      email = novaUser.fields.find((f: any) => f.attribute === 'email')?.value;
      firstName = novaUser.fields.find((f: any) => f.attribute === 'first_name')?.value;
      lastName = novaUser.fields.find((f: any) => f.attribute === 'last_name')?.value;
      phone = novaUser.fields.find((f: any) => f.attribute === 'phone')?.value;
      approvedAt = novaUser.fields.find((f: any) => f.attribute === 'approved_at')?.value;
      
      // Debug: log all available fields to see what's actually there
      console.log(`[DEBUG] Available fields for ${email}:`, novaUser.fields.map((f: any) => f.attribute));
      console.log(`[DEBUG] Found approved_at value for ${email}:`, approvedAt);
      
      // Look for profile photo field - Nova uses 'avatar' with advanced media library
      const photoField = novaUser.fields.find((f: any) => f.attribute === 'avatar');
      
      if (photoField && photoField.value && Array.isArray(photoField.value) && photoField.value.length > 0) {
        // Extract URL from advanced media library structure
        const mediaItem = photoField.value[0];
        if (mediaItem.__media_urls__) {
          // Use the original image URL for best quality
          profilePhoto = mediaItem.__media_urls__.__original__ || 
                        mediaItem.__media_urls__.detailView || 
                        mediaItem.__media_urls__.form ||
                        mediaItem.__media_urls__.preview;
        }
      }
    } else {
      // Old flat structure (backward compatibility)
      email = novaUser.email;
      firstName = novaUser.first_name;
      lastName = novaUser.last_name;
      phone = novaUser.phone;
      profilePhoto = novaUser.profile_photo || novaUser.photo || novaUser.avatar;
      approvedAt = novaUser.approved_at;
    }

    const name = `${firstName || ''} ${lastName || ''}`.trim() || email;

    // Handle profile photo download and storage
    let profilePhotoUrl = null;
    if (profilePhoto && typeof profilePhoto === 'string' && scraper && !this.options.dryRun) {
      try {
        console.log(`[PHOTO] Found profile photo for ${email}: ${profilePhoto}`);
        
        // Download and save the profile photo
        const photoResult = await profilePhotoDownloader.downloadNovaPhoto(
          profilePhoto,
          email,
          scraper.getCookies()
        );
        
        if (photoResult.success && photoResult.base64Data) {
          profilePhotoUrl = photoResult.base64Data;
          console.log(`[PHOTO] Successfully downloaded and converted profile photo to base64 (${photoResult.base64Data.length} chars)`);
        } else {
          console.error(`[PHOTO] Failed to download profile photo for ${email}:`, photoResult.error);
        }
      } catch (error) {
        console.error(`[PHOTO] Error processing profile photo for ${email}:`, error);
      }
    } else if (profilePhoto && typeof profilePhoto === 'string') {
      // Fallback: Just store the URL if no scraper provided or in dry run mode
      if (profilePhoto.startsWith('/')) {
        const baseUrl = process.env.NOVA_BASE_URL || 'https://app.everybodyeats.nz';
        profilePhotoUrl = `${baseUrl}${profilePhoto}`;
      } else if (profilePhoto.startsWith('http')) {
        profilePhotoUrl = profilePhoto;
      }
      console.log(`[PHOTO] Profile photo URL stored (not downloaded): ${profilePhotoUrl}`);
    }

    // Parse approved_at date or fallback to current time
    let createdAtDate = new Date(); // Default fallback
    if (approvedAt) {
      try {
        createdAtDate = new Date(approvedAt);
        // Validate the date
        if (isNaN(createdAtDate.getTime())) {
          console.warn(`[USER] Invalid approved_at date for ${email}: ${approvedAt}, using current time`);
          createdAtDate = new Date();
        } else {
          console.log(`[USER] Using approved_at date for ${email}: ${createdAtDate.toISOString()}`);
        }
      } catch (error) {
        console.warn(`[USER] Error parsing approved_at date for ${email}: ${approvedAt}, using current time`);
        createdAtDate = new Date();
      }
    } else {
      console.log(`[USER] No approved_at date found for ${email}, using current time`);
    }

    return {
      email: email.toLowerCase(),
      name,
      firstName,
      lastName,
      phone,
      profilePhotoUrl,
      dateOfBirth: null, // Nova doesn't seem to have this in the current structure
      emergencyContactName: null, // Not available in current Nova structure
      emergencyContactRelationship: null,
      emergencyContactPhone: null,
      medicalConditions: null,
      hashedPassword,
      profileCompleted: false, // Let users complete profile through invitation flow
      isMigrated: this.options.markAsMigrated,
      createdAt: createdAtDate, // Use approved_at from Nova or fallback to current time
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
  transformEvent(novaEvent: any, signupData?: any[]): any {
    // Extract event details from Nova's field structure
    const eventName = novaEvent.fields?.find((f: any) => f.attribute === 'name')?.value || 'Unknown Event';
    const eventDate = novaEvent.fields?.find((f: any) => f.attribute === 'date')?.value;
    const location = novaEvent.fields?.find((f: any) => f.attribute === 'location')?.value || 'Unknown Location';
    const capacity = novaEvent.fields?.find((f: any) => f.attribute === 'capacity')?.value || 10;

    // Determine shift type from signup position data if available
    let shiftTypeName = 'General Volunteering';
    if (signupData && signupData.length > 0) {
      // Use the first signup's position as the shift type
      const firstSignup = signupData[0];
      if (firstSignup.positionName) {
        shiftTypeName = firstSignup.positionName;
      }
    } else {
      // Fallback to parsing event name if no signup data
      if (eventName.includes('WGTN')) {
        shiftTypeName = 'Wellington Event';
      } else if (eventName.includes('AKL')) {
        shiftTypeName = 'Auckland Event';
      }
    }

    // Hardcoded shift times based on seed data templates
    const getShiftTimes = (shiftType: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } => {
      const normalizedType = shiftType.toLowerCase();
      
      // Match patterns from seed data
      if (normalizedType.includes('dishwasher')) {
        return { startHour: 17, startMinute: 30, endHour: 21, endMinute: 0 }; // 5:30pm-9:00pm
      } else if (normalizedType.includes('front of house setup')) {
        return { startHour: 16, startMinute: 30, endHour: 21, endMinute: 0 }; // 4:30pm-9:00pm
      } else if (normalizedType.includes('front of house')) {
        return { startHour: 17, startMinute: 30, endHour: 21, endMinute: 0 }; // 5:30pm-9:00pm
      } else if (normalizedType.includes('kitchen prep')) {
        return { startHour: 12, startMinute: 0, endHour: 16, endMinute: 0 }; // 12:00pm-4:00pm
      } else if (normalizedType.includes('kitchen service') || normalizedType.includes('kitchen pack')) {
        return { startHour: 17, startMinute: 30, endHour: 21, endMinute: 0 }; // 5:30pm-9:00pm
      } else if (normalizedType.includes('media')) {
        return { startHour: 17, startMinute: 0, endHour: 19, endMinute: 0 }; // 5:00pm-7:00pm
      } else if (normalizedType.includes('anywhere needed')) {
        return { startHour: 16, startMinute: 0, endHour: 21, endMinute: 0 }; // 4:00pm-9:00pm
      } else {
        // Default times for unknown shift types
        return { startHour: 17, startMinute: 30, endHour: 21, endMinute: 0 }; // 5:30pm-9:00pm
      }
    };

    // Parse base date from event
    let baseDate = new Date();
    if (eventDate) {
      baseDate = new Date(eventDate);
    } else if (eventName.includes('Sunday')) {
      // Try to parse date from event name
      const match = eventName.match(/(\d+)(?:st|nd|rd|th)\s+(\w+)/);
      if (match) {
        const [, day, month] = match;
        const year = new Date().getFullYear();
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        baseDate = new Date(year, monthIndex, parseInt(day));
      }
    }

    // Apply hardcoded times based on shift type
    const times = getShiftTimes(shiftTypeName);
    const startDate = new Date(baseDate);
    startDate.setHours(times.startHour, times.startMinute, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(times.endHour, times.endMinute, 0, 0);

    console.log(`[SHIFT_TIMES] ${shiftTypeName} on ${baseDate.toDateString()}: ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`);

    return {
      shiftTypeId: null, // Will be resolved when creating the shift
      start: startDate,
      end: endDate,
      location: location,
      capacity: parseInt(capacity.toString()) || 10,
      notes: `Migrated from Nova: ${eventName}`,
      createdAt: this.parseDate(novaEvent.created_at),
      updatedAt: this.parseDate(novaEvent.updated_at),
      shiftTypeName, // Helper field for creating shift type
    };
  }

  /**
   * Safely parse date values, returning current date if invalid
   */
  private parseDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Transform Nova signup to Prisma signup format
   */
  transformSignup(novaSignup: any, userId: string, shiftId: string): any {
    // Map Nova status to Prisma SignupStatus
    // Nova uses numeric IDs: 1=Requested, 2=Draft, 3=Confirmed, 4=Waitlist, 5=Attended, 6=Cancelled, 7=Not Needed, 8=Unavailable, 9=No Show
    const statusMap: Record<string, SignupStatus> = {
      // Numeric IDs from Nova
      '1': SignupStatus.PENDING,      // Requested
      '2': SignupStatus.PENDING,      // Draft
      '3': SignupStatus.CONFIRMED,    // Confirmed
      '4': SignupStatus.WAITLISTED,   // Waitlist
      '5': SignupStatus.CONFIRMED,    // Attended (treat as confirmed)
      '6': SignupStatus.CANCELED,     // Cancelled
      '7': SignupStatus.NOT_NEEDED,   // Not Needed
      '8': SignupStatus.UNAVAILABLE,  // Unavailable
      '9': SignupStatus.NO_SHOW,      // No Show
      
      // String fallbacks for backward compatibility
      'requested': SignupStatus.PENDING,
      'draft': SignupStatus.PENDING,
      'confirmed': SignupStatus.CONFIRMED,
      'waitlist': SignupStatus.WAITLISTED,
      'waitlisted': SignupStatus.WAITLISTED,
      'attended': SignupStatus.CONFIRMED,
      'cancelled': SignupStatus.CANCELED,
      'canceled': SignupStatus.CANCELED,
      'not needed': SignupStatus.NOT_NEEDED,
      'unavailable': SignupStatus.UNAVAILABLE,
      'no show': SignupStatus.NO_SHOW,
      'no_show': SignupStatus.NO_SHOW,
    };

    // Try to get status from statusId (numeric) first, then fall back to status name
    const statusId = novaSignup.statusId?.toString();
    const statusName = novaSignup.statusName?.toLowerCase();
    const rawStatus = novaSignup.status?.toLowerCase();
    
    const status = statusMap[statusId] || 
                  statusMap[statusName] || 
                  statusMap[rawStatus] || 
                  SignupStatus.PENDING;
    
    console.log(`[SIGNUP] Mapping status for signup - statusId: ${statusId}, statusName: ${statusName}, rawStatus: ${rawStatus} -> ${status}`);

    return {
      userId,
      shiftId,
      status,
      canceledAt: novaSignup.canceled_at ? this.parseDate(novaSignup.canceled_at) : null,
      createdAt: this.parseDate(novaSignup.created_at),
      updatedAt: this.parseDate(novaSignup.updated_at),
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