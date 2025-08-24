import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { parse } from 'csv-parse/sync';
import { hashSync } from 'bcryptjs';
import { randomBytes } from 'crypto';

interface LegacyUser {
  'First Name': string;
  'Last Name': string;
  'Email': string;
  'Phone': string;
  'Date of Birth': string;
  'Contact Name': string;
  'Contact Relationship': string;
  'Contact Phone': string;
  'Medical Conditions': string;
  'Experience Points': string;
  'Days Available': string;
  'Locations': string;
  'Positions': string;
}

interface MigrationResult {
  totalRecords: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  temporaryPasswords?: Array<{
    email: string;
    password: string;
  }>;
  createdUsers?: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>;
}

class UserMigrator {
  private dryRun: boolean;
  private result: MigrationResult;

  constructor(dryRun = false) {
    this.dryRun = dryRun;
    this.result = {
      totalRecords: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      temporaryPasswords: [],
      createdUsers: []
    };
  }

  async migrate(csvContent: string): Promise<MigrationResult> {
    try {
      const records: LegacyUser[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      this.result.totalRecords = records.length;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2; // +2 for header row and 0-based index

        try {
          const tempPassword = await this.processUser(record, rowNumber);
          this.result.successful++;
          
          if (tempPassword && !this.dryRun) {
            this.result.temporaryPasswords?.push({
              email: record.Email.trim().toLowerCase(),
              password: tempPassword
            });
          }
        } catch (error) {
          this.result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.result.errors.push({
            row: rowNumber,
            email: record.Email || 'Unknown',
            error: errorMessage
          });
        }
      }

      return this.result;

    } catch (error) {
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processUser(record: LegacyUser, rowNumber: number): Promise<string | null> {
    // Validate required fields
    if (!record.Email?.trim()) {
      throw new Error('Email is required');
    }

    if (!record['First Name']?.trim() && !record['Last Name']?.trim()) {
      throw new Error('At least first name or last name is required');
    }

    const email = record.Email.trim().toLowerCase();

    // Check if user already exists
    if (!this.dryRun) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        this.result.skipped++;
        throw new Error('User already exists');
      }
    }

    // Parse and validate date of birth
    let dateOfBirth: Date | null = null;
    if (record['Date of Birth']?.trim()) {
      dateOfBirth = this.parseDate(record['Date of Birth']);
      if (!dateOfBirth) {
        throw new Error('Invalid date of birth format');
      }
    }

    // Generate temporary password (users will need to reset)
    const temporaryPassword = randomBytes(12).toString('hex');
    const hashedPassword = hashSync(temporaryPassword, 12);

    // Prepare user data
    const userData = {
      email,
      firstName: record['First Name']?.trim() || null,
      lastName: record['Last Name']?.trim() || null,
      name: this.buildFullName(record['First Name'], record['Last Name']),
      phone: this.normalizePhone(record.Phone),
      dateOfBirth,
      hashedPassword,
      emergencyContactName: record['Contact Name']?.trim() || null,
      emergencyContactRelationship: record['Contact Relationship']?.trim() || null,
      emergencyContactPhone: this.normalizePhone(record['Contact Phone']),
      medicalConditions: record['Medical Conditions']?.trim() || null,
      availableDays: this.normalizeAvailableDays(record['Days Available']),
      availableLocations: this.normalizeLocations(record.Locations),
      role: 'VOLUNTEER' as const,
      profileCompleted: false, // Users need to complete setup
      volunteerAgreementAccepted: false,
      healthSafetyPolicyAccepted: false,
      isMigrated: true // Mark as migrated user
    };

    if (!this.dryRun) {
      const createdUser = await prisma.user.create({ data: userData });
      
      // Add to created users list for response
      this.result.createdUsers?.push({
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName || undefined,
        lastName: createdUser.lastName || undefined,
        phone: createdUser.phone || undefined,
      });
      
      return temporaryPassword;
    }

    return null;
  }

  private parseDate(dateString: string): Date | null {
    // Try common date formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateString.trim().match(format);
      if (match) {
        let year: number, month: number, day: number;
        
        if (format === formats[1]) { // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else { // Assume MM/DD/YYYY format for ambiguous cases
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }

        const date = new Date(year, month - 1, day);
        
        // Validate the date
        if (date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          return date;
        }
      }
    }

    return null;
  }

  private buildFullName(firstName?: string, lastName?: string): string {
    return [firstName?.trim(), lastName?.trim()]
      .filter(Boolean)
      .join(' ') || 'Volunteer';
  }

  private normalizePhone(phone?: string): string | null {
    if (!phone?.trim()) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Return formatted phone if valid length
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    // Return original if we can't parse it
    return phone.trim();
  }

  private normalizeAvailableDays(days?: string): string | null {
    if (!days?.trim()) return null;
    
    // Convert common variations to standardized format
    const dayMap: Record<string, string> = {
      'mon': 'Monday',
      'tue': 'Tuesday', 
      'wed': 'Wednesday',
      'thu': 'Thursday',
      'fri': 'Friday',
      'sat': 'Saturday',
      'sun': 'Sunday'
    };
    
    let normalized = days.toLowerCase();
    Object.entries(dayMap).forEach(([abbrev, full]) => {
      normalized = normalized.replace(new RegExp(`\\b${abbrev}\\b`, 'g'), full);
    });
    
    return normalized.trim();
  }

  private normalizeLocations(locations?: string): string | null {
    return locations?.trim() || null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const dryRunParam = formData.get("dryRun");
    const dryRun = dryRunParam === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: "File must be a CSV" }, { status: 400 });
    }

    const csvContent = await file.text();
    
    const migrator = new UserMigrator(dryRun);
    const result = await migrator.migrate(csvContent);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Migration execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}