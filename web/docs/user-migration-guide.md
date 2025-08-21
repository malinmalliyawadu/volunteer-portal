# User Migration Guide

This guide provides step-by-step instructions for migrating users from the legacy volunteer portal to the new system.

## Overview

The migration process consists of three main phases:
1. **Data Validation** - Validate CSV data before migration
2. **Migration Execution** - Import users into the new database
3. **Post-Migration Tasks** - User notifications and cleanup

## Prerequisites

1. **Database Setup**: Ensure the new database is running and migrations are applied
2. **CSV Export**: Obtain CSV export from legacy system with required fields
3. **Backup**: Create a backup of the current database before migration

```bash
cd web
npm install
npm run prisma:generate
```

## Required CSV Format

The CSV file must contain the following columns (exact names):

| Column Name | Required | Description |
|-------------|----------|-------------|
| First Name | No* | User's first name |
| Last Name | No* | User's last name |
| Email | Yes | Unique email address |
| Phone | No | Contact phone number |
| Date of Birth | No | Birth date (MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD) |
| Contact Name | No | Emergency contact name |
| Contact Relationship | No | Relationship to emergency contact |
| Contact Phone | No | Emergency contact phone |
| Medical Conditions | No | Medical conditions/notes |
| Experience Points | No | Legacy system points (for reference) |
| Days Available | No | Available days/schedule |
| Locations | No | Preferred volunteer locations |
| Positions | No | Preferred volunteer positions |

*At least one of First Name or Last Name is required.

## Step 1: Data Validation

Before running the migration, validate your CSV data:

```bash
npm run validate-migration -- --csv-path ./path/to/legacy-users.csv
```

### Sample Validation Output

```
🔍 Validating CSV data from ./legacy-users.csv

📊 Found 150 records to validate

📊 VALIDATION REPORT
===================
Total records: 150
Valid records: 142
Invalid records: 8
Success rate: 94.7%

⚠️  DUPLICATE EMAILS (2):
   - duplicate@example.com
   - another.duplicate@test.com

📋 EMPTY FIELDS SUMMARY:
   Medical Conditions: 45 records (30.0%)
   Contact Relationship: 12 records (8.0%)
   Experience Points: 5 records (3.3%)

❌ ERRORS (8):
   Email (3 errors):
     Row 15: Invalid email format
     Row 23: Email is required
     Row 45: Duplicate email found

   Date of Birth (3 errors):
     Row 12: Invalid date format
     Row 34: Invalid date format

💡 RECOMMENDATIONS:
   • Fix validation errors before running migration
   • Resolve duplicate email addresses
   • Review and standardize date formats
```

### Fix Common Issues

1. **Duplicate Emails**: Remove or merge duplicate records
2. **Invalid Emails**: Correct email format or provide valid alternatives
3. **Invalid Dates**: Use MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD format
4. **Missing Names**: Ensure at least first name OR last name is provided

## Step 2: Migration Execution

### Dry Run (Recommended)

First, run a dry run to see what would happen without making changes:

```bash
npm run migrate-users -- --csv-path ./path/to/legacy-users.csv --dry-run
```

### Live Migration

Once validation passes and dry run looks good, run the actual migration:

```bash
npm run migrate-users -- --csv-path ./path/to/legacy-users.csv
```

### Sample Migration Output

```
🚀 Starting user migration from ./legacy-users.csv
📋 Mode: LIVE MIGRATION
📊 Found 150 records to process

✅ Row 2: john.doe@example.com
✅ Row 3: sarah.smith@gmail.com
❌ Row 4: duplicate@example.com - User already exists
✅ Row 5: mike.johnson@hotmail.com
...

📊 MIGRATION REPORT
==================
Total records: 150
Successful: 145
Failed: 3
Skipped: 2

🔐 NEXT STEPS:
1. Set up password reset notifications for migrated users
2. Convert experience points to achievements/mock shift history
3. Map legacy positions to current shift types
4. Review and validate emergency contact information
```

## Step 3: Post-Migration Tasks

### 1. Password Setup for Migrated Users

Migrated users are created with temporary passwords and must complete profile setup:

- Users receive `profileCompleted: false`
- Authentication will redirect to profile completion
- Consider sending welcome emails with setup instructions

### 2. Data Review and Cleanup

```bash
# Check migrated users
npm run prisma:seed # Optional: seed with test data if needed

# Review user data in admin dashboard
npm run dev
# Navigate to /admin/users
```

### 3. Experience Points Conversion

The migration script logs experience points but doesn't automatically convert them. You may want to:

- Create mock shift history based on points
- Award achievements retroactively
- Use points for initial user ranking/recognition

### 4. Legacy Position Mapping

Map legacy positions to current shift types:

1. Review unique values from "Positions" column
2. Create corresponding ShiftType records if needed
3. Update user preferences or create default shift assignments

## Testing the Migration

### Sample Data

Use the provided sample data for testing:

```bash
npm run validate-migration -- --csv-path scripts/sample-data.csv
npm run migrate-users -- --csv-path scripts/sample-data.csv --dry-run
```

### Validation Tests

The sample data includes various test cases:
- Valid complete records
- Missing names (first OR last name only)
- Different date formats
- Various phone number formats
- Invalid email addresses
- Duplicate emails
- Empty records

### Post-Migration Verification

1. **Database Check**: Verify user count and data integrity
2. **Authentication Test**: Test login flow for migrated users
3. **Profile Completion**: Verify profile completion workflow
4. **Admin Review**: Check admin dashboard user management

## Error Handling

### Common Migration Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "User already exists" | Duplicate email in database | Remove from CSV or update existing user |
| "Email is required" | Empty email field | Provide valid email address |
| "Invalid date format" | Unsupported date format | Use MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD |
| "Database connection failed" | Database not running | Start database and verify connection |

### Recovery Options

If migration fails partway through:

1. **Check Migration Report**: Review which records failed
2. **Fix Data Issues**: Update CSV with corrected data
3. **Resume Migration**: Re-run with fixed CSV (duplicates will be skipped)
4. **Manual Cleanup**: Use admin dashboard to review/fix individual records

## Security Considerations

### Temporary Passwords

- Migrated users get secure random temporary passwords
- Passwords are logged for admin use (secure this log)
- Users must reset passwords on first login
- Consider password reset email campaign

### Data Privacy

- Ensure CSV files are handled securely
- Delete temporary CSV files after migration
- Review migrated emergency contact data for accuracy
- Verify medical conditions data is properly secured

## Rollback Plan

If migration needs to be rolled back:

1. **Database Restore**: Restore from pre-migration backup
2. **User Notification**: Inform users if they attempted to use new system
3. **Re-validation**: Re-run validation on corrected data
4. **Re-migration**: Execute migration again with fixes

## FAQ

### Q: Can I run the migration multiple times?
A: Yes, duplicate emails will be skipped. Use this for incremental migrations.

### Q: What happens to legacy user IDs?
A: New UUIDs are generated. Legacy IDs are not preserved.

### Q: How do I handle users without email addresses?
A: Create placeholder emails or contact users for valid email addresses.

### Q: Can I migrate in batches?
A: Yes, split CSV into smaller files and run multiple migrations.

### Q: What about user profile photos?
A: Profile photos are not migrated. Users can upload new photos during profile completion.

## Support

For migration issues:
- Check GitHub issue #61 for tracking and updates
- Review migration logs for specific error details
- Test with sample data first
- Use dry-run mode before live migration

---

Generated with [Claude Code](https://claude.ai/code)