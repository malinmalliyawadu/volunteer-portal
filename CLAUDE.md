# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Everybody Eats Volunteer Portal - a Next.js application for managing volunteers at a charitable restaurant. The main application is in the `/web/` directory.

## Essential Commands

### Development
```bash
cd web
npm install
npm run dev        # Start development server on http://localhost:3000
```

### Database
```bash
cd web
npm run prisma:generate  # Generate Prisma client after schema changes
npm run prisma:migrate   # Run migrations in development
npm run prisma:seed      # Seed database with initial data
npm run prisma:deploy    # Deploy migrations to production
```

### Testing
```bash
cd web
npm run test:e2e                # Run all Playwright e2e tests
npm run test:e2e:ui              # Run tests with UI mode
npm run test:e2e:ci              # Run tests in CI mode (Chromium only)
npx playwright test test.spec.ts # Run specific test file
```

### Build & Lint
```bash
cd web
npm run build     # Build production bundle
npm run lint      # Run ESLint
```

## Architecture Overview

### Tech Stack
- **Next.js 15.4** with App Router - React framework
- **TypeScript** with strict configuration
- **Prisma ORM** with PostgreSQL
- **NextAuth.js** for authentication (OAuth + credentials)
- **Tailwind CSS v4** + **shadcn/ui** components
- **Playwright** for e2e testing

### Directory Structure
```
web/
├── app/              # Next.js App Router pages and API routes
│   ├── api/         # API route handlers
│   ├── admin/       # Admin dashboard pages
│   └── (auth)/      # Authentication pages
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities and shared code
│   ├── auth.ts      # NextAuth configuration
│   └── db.ts        # Prisma client singleton
├── prisma/          # Database schema and migrations
└── tests/           # Playwright e2e tests
```

### Key API Patterns

All API routes follow Next.js App Router conventions in `app/api/`:
- Authentication: `/api/auth/[...nextauth]` (NextAuth.js)
- Admin operations: `/api/admin/*` (protected routes)
- Shift management: `/api/shifts/*`
- User profiles: `/api/profile`

Protected routes check session role:
```typescript
const session = await getServerSession(authOptions);
if (session?.user?.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### Database Schema Key Models

- **User**: Volunteer profiles with emergency contacts, role (VOLUNTEER/ADMIN)
- **Shift/ShiftType**: Shift scheduling system
- **Signup**: Shift registrations with status tracking
- **Achievement**: Gamification system with multiple criteria types

Always use Prisma client through the singleton in `lib/db.ts`:
```typescript
import { prisma } from '@/lib/db';
```

### Authentication Flow

1. NextAuth configured with multiple providers (Google, Facebook, Apple, Credentials)
2. OAuth users must complete profile after first login
3. Session includes user role and profile completion status
4. Use `getServerSession(authOptions)` in server components/API routes

### Achievement System

Complex gamification with automatic unlocking based on:
- Shift counts (MILESTONE type)
- Consecutive months (DEDICATION type)
- Hours volunteered (IMPACT type)
- Specific shift types (SPECIALIZATION type)

Achievement processing happens in `/api/achievements/route.ts`

### Testing Approach

E2e tests in `/web/tests/e2e/` cover:
- Authentication flows
- Admin dashboard functionality
- Volunteer shift signups
- Profile management

Run tests before committing changes that affect user flows.

## Development Tips

1. **Type Safety**: Use generated Prisma types for database operations
2. **Server Components**: Prefer Server Components for data fetching
3. **Error Handling**: API routes should return appropriate HTTP status codes
4. **Session Checks**: Always verify session and role for protected operations
5. **Database Queries**: Include necessary relations in Prisma queries to avoid N+1 problems

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth
- `NEXTAUTH_URL`: Application URL
- OAuth provider credentials (GOOGLE_CLIENT_ID, etc.)