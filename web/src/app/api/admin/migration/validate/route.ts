import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { parse } from "csv-parse/sync";
import { z } from "zod";

interface LegacyUser {
  "First Name": string;
  "Last Name": string;
  Email: string;
  Phone: string;
  "Date of Birth": string;
  "Contact Name": string;
  "Contact Relationship": string;
  "Contact Phone": string;
  "Medical Conditions": string;
  "Experience Points": string;
  "Days Available": string;
  Locations: string;
  Positions: string;
}

interface ValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    value: string;
    warning: string;
  }>;
  summary: {
    duplicateEmails: string[];
    missingRequiredFields: number;
    invalidDates: number;
    invalidPhones: number;
    emptyFields: Record<string, number>;
  };
}

const emailSchema = z.string().email().min(1);

class CSVValidator {
  private result: ValidationResult;

  constructor() {
    this.result = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: [],
      warnings: [],
      summary: {
        duplicateEmails: [],
        missingRequiredFields: 0,
        invalidDates: 0,
        invalidPhones: 0,
        emptyFields: {},
      },
    };
  }

  validate(csvContent: string): ValidationResult {
    try {
      const records: LegacyUser[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      this.result.totalRecords = records.length;

      // Track emails for duplicates
      const emailSet = new Set<string>();
      const emailCounts: Record<string, number> = {};

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2; // +2 for header row and 0-based index
        let isValid = true;

        // Track field emptiness
        this.trackEmptyFields(record);

        // Validate email (required)
        if (!record.Email?.trim()) {
          this.addError(rowNumber, "Email", record.Email, "Email is required");
          isValid = false;
          this.result.summary.missingRequiredFields++;
        } else {
          const email = record.Email.trim().toLowerCase();
          const emailValidation = emailSchema.safeParse(email);

          if (!emailValidation.success) {
            this.addError(
              rowNumber,
              "Email",
              record.Email,
              "Invalid email format"
            );
            isValid = false;
          } else {
            // Track duplicates
            emailCounts[email] = (emailCounts[email] || 0) + 1;
            if (emailSet.has(email)) {
              this.addError(
                rowNumber,
                "Email",
                record.Email,
                "Duplicate email found"
              );
              isValid = false;
            }
            emailSet.add(email);
          }
        }

        // Validate name (at least one required)
        if (!record["First Name"]?.trim() && !record["Last Name"]?.trim()) {
          this.addError(
            rowNumber,
            "Name",
            "",
            "At least first name or last name is required"
          );
          isValid = false;
          this.result.summary.missingRequiredFields++;
        }

        // Validate date of birth
        if (record["Date of Birth"]?.trim()) {
          if (!this.isValidDate(record["Date of Birth"])) {
            this.addError(
              rowNumber,
              "Date of Birth",
              record["Date of Birth"],
              "Invalid date format (expected MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD)"
            );
            isValid = false;
            this.result.summary.invalidDates++;
          }
        }

        // Validate phone numbers
        if (record.Phone?.trim() && !this.isValidPhone(record.Phone)) {
          this.addWarning(
            rowNumber,
            "Phone",
            record.Phone,
            "Phone format may need manual review"
          );
          this.result.summary.invalidPhones++;
        }

        if (
          record["Contact Phone"]?.trim() &&
          !this.isValidPhone(record["Contact Phone"])
        ) {
          this.addWarning(
            rowNumber,
            "Contact Phone",
            record["Contact Phone"],
            "Emergency contact phone format may need manual review"
          );
        }

        // Check for incomplete emergency contact info
        const hasContactName = !!record["Contact Name"]?.trim();
        const hasContactPhone = !!record["Contact Phone"]?.trim();
        const hasContactRelationship = !!record["Contact Relationship"]?.trim();

        if (
          (hasContactName || hasContactPhone || hasContactRelationship) &&
          !(hasContactName && hasContactPhone && hasContactRelationship)
        ) {
          this.addWarning(
            rowNumber,
            "Emergency Contact",
            "",
            "Incomplete emergency contact information"
          );
        }

        // Validate experience points
        if (record["Experience Points"]?.trim()) {
          const points = parseInt(record["Experience Points"]);
          if (isNaN(points) || points < 0) {
            this.addWarning(
              rowNumber,
              "Experience Points",
              record["Experience Points"],
              "Invalid experience points value"
            );
          }
        }

        if (isValid) {
          this.result.validRecords++;
        } else {
          this.result.invalidRecords++;
        }
      }

      // Find duplicate emails
      this.result.summary.duplicateEmails = Object.entries(emailCounts)
        .filter(([, count]) => count > 1)
        .map(([email]) => email);

      return this.result;
    } catch (error) {
      throw new Error(
        `CSV parsing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private trackEmptyFields(record: LegacyUser): void {
    Object.entries(record).forEach(([field, value]) => {
      if (!value?.trim()) {
        this.result.summary.emptyFields[field] =
          (this.result.summary.emptyFields[field] || 0) + 1;
      }
    });
  }

  private isValidDate(dateString: string): boolean {
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    for (const format of formats) {
      const match = dateString.trim().match(format);
      if (match) {
        let year: number, month: number, day: number;

        if (format === formats[1]) {
          // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // MM/DD/YYYY format
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }

        const date = new Date(year, month - 1, day);

        if (
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day &&
          year >= 1900 &&
          year <= new Date().getFullYear()
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  }

  private addError(
    row: number,
    field: string,
    value: string,
    error: string
  ): void {
    this.result.errors.push({ row, field, value, error });
  }

  private addWarning(
    row: number,
    field: string,
    value: string,
    warning: string
  ): void {
    this.result.warnings.push({ row, field, value, warning });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    const csvContent = await file.text();

    const validator = new CSVValidator();
    const result = validator.validate(csvContent);

    return NextResponse.json(result);
  } catch (error) {
    console.error("CSV validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
