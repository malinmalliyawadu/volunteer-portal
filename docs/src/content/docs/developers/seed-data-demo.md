---
title: Seed Data & Demo Site
description: Understanding the seeding system, demo data, and environment-specific behavior
---

The Everybody Eats Volunteer Portal includes a sophisticated seeding system that provides different data sets based on the deployment environment. This system enables clean production deployments while maintaining rich demo functionality for development and demonstration purposes.

## Overview

The application uses an environment-aware seeding system that automatically detects the deployment context and loads appropriate data:

- **Production**: Minimal essential data (admin user + shift structure)
- **Demo/Preview**: Full demo data with realistic volunteer profiles and activities
- **Development**: Complete demo dataset for local development

## Environment Detection

The seeding system uses `VERCEL_ENV` as the primary source of truth for environment detection:

```javascript
const isProduction = process.env.VERCEL_ENV === 'production' || 
                    process.env.USE_PRODUCTION_SEED === 'true';
```

### Environment Values
- `VERCEL_ENV=production` → Production seed
- `VERCEL_ENV=preview` → Demo seed  
- `VERCEL_ENV=development` → Demo seed
- Local development → Demo seed
- `USE_PRODUCTION_SEED=true` → Forces production seed regardless of environment

## Seed Scripts

### Main Seed Router ([`prisma/seed.js`](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/prisma/seed.js))

The main seed script automatically routes to the appropriate seeding strategy:

```bash
npm run prisma:seed
```

This script detects the environment and executes either:
- **Production**: [`prisma/seed-production.js`](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/prisma/seed-production.js)
- **Demo/Development**: [`prisma/seed-demo.js`](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/prisma/seed-demo.js)

### Production Seed ([`prisma/seed-production.js`](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/prisma/seed-production.js))

Creates minimal essential data for production deployments:

```bash
npm run prisma:seed:production
```

**Creates:**
- Admin user (requires `ADMIN_PASSWORD` environment variable)
- 7 shift types (Dishwasher, FOH Setup, Front of House, Kitchen Prep, Kitchen Service, Media Role, Anywhere Needed)
- Shift templates for all 3 locations (Wellington, Glen Innes, Onehunga)

**Security Features:**
- Requires `ADMIN_PASSWORD` environment variable
- Fails with clear error message if password not provided
- Does not log actual password values
- Uses secure bcrypt hashing

### Demo Seed ([`prisma/seed-demo.js`](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/prisma/seed-demo.js))

Creates comprehensive demo data for development and demonstration:

```bash
npm run prisma:seed:demo
```

**Creates:**
- All production data (admin + shift structure)
- 50+ demo volunteer profiles with realistic names and details
- Sample shift signups and group bookings
- Achievement unlocks and volunteer activity history
- Profile images downloaded from Lorem Picsum (in Vercel environments)

## Demo Site Features

### Quick Login Buttons

The login page includes demo credential buttons that are automatically hidden in production:

```tsx
{process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' && (
  <div className="demo-credentials">
    <Button onClick={() => handleQuickLogin("volunteer")}>
      Login as Volunteer
    </Button>
    <Button onClick={() => handleQuickLogin("admin")}>
      Login as Admin
    </Button>
  </div>
)}
```

**Demo Credentials:**
- **Volunteer**: `volunteer@example.com` / `volunteer123`
- **Admin**: `admin@everybodyeats.nz` / `admin123`

### Environment-Specific Behavior

**Production Environment:**
- Login form starts with empty fields
- No demo credential buttons visible
- Only essential data seeded
- Profile images not downloaded during seeding

**Non-Production Environments:**
- Login form pre-filled with demo credentials
- Quick login buttons available
- Full demo data with realistic profiles
- Profile images downloaded from external service

## Profile Image Handling

The demo seed includes intelligent profile image downloading:

```javascript
const isVercel = process.env.VERCEL_ENV;
const isCI = process.env.CI;

if (isCI && !isVercel) {
  console.log("🏃 Skipping profile image downloads in CI/test environment");
  return;
}

// Download profile images in Vercel environments or local development
```

**Behavior:**
- ✅ **Vercel (any environment)**: Downloads profile images
- ✅ **Local development**: Downloads profile images  
- ❌ **GitHub Actions/CI**: Skips downloads (performance optimization)

## Environment Variables

### Required for Production

```env
ADMIN_PASSWORD=your-secure-password-here
```

### Optional Demo Customization

```env
# Custom demo credentials (defaults shown)
NEXT_PUBLIC_DEMO_VOLUNTEER_EMAIL=volunteer@example.com
NEXT_PUBLIC_DEMO_VOLUNTEER_PASSWORD=volunteer123
NEXT_PUBLIC_DEMO_ADMIN_EMAIL=admin@everybodyeats.nz
NEXT_PUBLIC_DEMO_ADMIN_PASSWORD=admin123

# Force production seeding in any environment
USE_PRODUCTION_SEED=true
```

## Usage Examples

### Local Development Setup

```bash
cd web
npm install
cp .env.example .env.local
# Add your database URL and auth secrets
npm run prisma:migrate
npm run prisma:seed  # Automatically uses demo seed
npm run dev
```

### Production Deployment

```bash
# Set environment variables in Vercel:
# VERCEL_ENV=production (automatic)
# ADMIN_PASSWORD=your-secure-password

# Deploy triggers automatic:
# - npm run build
# - npx prisma migrate deploy  
# - npm run prisma:seed (uses production seed)
```

### Force Production Seed in Development

```bash
USE_PRODUCTION_SEED=true npm run prisma:seed
```

### Manual Seed Script Execution

```bash
# Run specific seeds directly
node prisma/seed-production.js
node prisma/seed-demo.js

# Reset and re-seed
npm run prisma:reset  # Drops data, runs migrations, and seeds
```

## Related Files

- **[Database Schema](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/prisma/schema.prisma)** - Complete Prisma schema definition
- **[Package.json Scripts](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/package.json)** - All npm scripts including seed commands
- **[Login Page](https://github.com/everybody-eats-nz/volunteer-portal/blob/main/web/src/app/login/page.tsx)** - Demo credentials implementation

## Data Structure

### Production Data
- **1 Admin User**: System administrator account
- **7 Shift Types**: All operational shift categories
- **18 Shift Templates**: 6 templates × 3 locations

### Demo Data Additions
- **50+ Demo Volunteers**: Realistic profiles with emergency contacts
- **Shift Signups**: Historical and upcoming volunteer assignments  
- **Group Bookings**: Sample team bookings and invitations
- **Achievements**: Unlocked achievements based on volunteer activity
- **Profile Images**: Downloaded avatar images for visual appeal

## Best Practices

### For Developers

1. **Always use the main seed script** (`npm run prisma:seed`) rather than calling specific seeds directly
2. **Test both production and demo seeding** before deploying environment changes
3. **Never commit real passwords** to version control - use environment variables
4. **Verify environment detection** works correctly across different deployment contexts

### For Deployments

1. **Set `ADMIN_PASSWORD`** as a secure environment variable in production
2. **Use strong passwords** for the admin account (will be hashed with bcrypt)
3. **Verify production seeding** creates only essential data
4. **Test demo functionality** in staging/preview environments

### Security Considerations

1. **Production admin password** is required and must be set via environment variable
2. **Demo credentials** are automatically hidden in production environments
3. **Profile image downloads** are skipped in CI environments for performance
4. **Database resets** should only be used in development environments

## Troubleshooting

### Common Issues

**Seed fails with "ADMIN_PASSWORD required" error:**
```bash
❌ ADMIN_PASSWORD environment variable is required
```
**Solution:** Set the `ADMIN_PASSWORD` environment variable with a secure password

**Demo images not downloading:**
- Check internet connectivity
- Verify not running in CI environment without Vercel context
- Confirm Lorem Picsum service availability

**Wrong seed type being used:**
- Check `VERCEL_ENV` environment variable value
- Verify `USE_PRODUCTION_SEED` is not inadvertently set
- Review environment detection logic in `prisma/seed.js`

### Debug Commands

```bash
# Check which seed would be used
node -e "console.log('Production:', process.env.VERCEL_ENV === 'production')"

# Manually test environment detection
node prisma/seed.js

# Check current database state
npx prisma db seed --preview-feature
```