# 🌐 Everybody Eats Volunteer Portal - Web Frontend

A modern Next.js application for managing volunteers at Everybody Eats, an innovative charitable restaurant that transforms rescued food into quality 3-course meals on a pay-what-you-can basis.

## ✨ Features

- 🙋‍♀️ **Volunteer Management**: Registration, profile management, and volunteer tracking
- 📅 **Shift Scheduling**: Browse and sign up for volunteer shifts
- 🏆 **Achievement System**: Gamified volunteer experience with milestones and badges
- 👥 **Role-based Access**: Separate interfaces for volunteers and administrators
- 🎨 **Responsive Design**: Modern UI built with Tailwind CSS and Radix UI components
- 🔐 **Authentication**: Secure login with NextAuth.js
- 🗄️ **Database**: PostgreSQL with Prisma ORM for data management

## 🛠️ Tech Stack

- ⚛️ **Framework**: Next.js 15.4.6 (App Router)
- 📝 **Language**: TypeScript
- 🎨 **Styling**: Tailwind CSS v4
- 🧩 **UI Components**: Radix UI + Custom shadcn/ui components
- 🗄️ **Database**: PostgreSQL with Prisma ORM
- 🔐 **Authentication**: NextAuth.js
- ⚡ **State Management**: React hooks and server components
- 🚀 **Deployment Ready**: Optimized for Vercel and Supabase

## 🚀 Getting Started

### 📋 Prerequisites

- 📦 Node.js 18+
- 📦 npm, yarn, pnpm, or bun

### 🔧 Installation

1. **📥 Install dependencies:**

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. **🗄️ Set up the database:**

```bash
# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

3. **⚙️ Set up environment variables:**
   Create a `.env.local` file in the root directory. See the [Environment Variables](#-environment-variables) section below for detailed configuration.

4. **🔒 Generate auth secret:**

```bash
npx auth secret
```

4. **🏃‍♂️ Run the development server:**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the volunteer portal. 🌐

## 💻 Development

- 📱 **Main App**: Edit pages in `src/app/` - the app uses Next.js App Router
- 🧩 **Components**: Reusable UI components in `src/components/`
- 🗄️ **Database**: Schema defined in `prisma/schema.prisma`
- 🎨 **Styling**: Global styles in `src/app/globals.css`

### 📜 Available Scripts

- 🏃‍♂️ `npm run dev` - Start development server
- 🏗️ `npm run build` - Build for production
- ▶️ `npm run start` - Start production server
- 🔍 `npm run lint` - Run ESLint
- 🗄️ `npm run prisma:migrate` - Run database migrations
- 🌱 `npm run prisma:seed` - Seed database with sample data

## 📁 Project Structure

- 📱 `/src/app/` - Next.js app router pages and API routes
- 🧩 `/src/components/` - Reusable React components
- 🛠️ `/src/lib/` - Utility functions and configurations
- 📝 `/src/types/` - TypeScript type definitions
- 🗄️ `/prisma/` - Database schema and migrations
- 🖼️ `/public/` - Static assets

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory with the following configuration:

### Required Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/volunteer-portal"
DIRECT_URL="postgresql://postgres:password@localhost:5432/volunteer-portal"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Campaign Monitor (for user migration emails)
CAMPAIGN_MONITOR_API_KEY="your-campaign-monitor-api-key"
CAMPAIGN_MONITOR_MIGRATION_EMAIL_ID="your-smart-email-template-id"
```

### Optional OAuth Providers

```bash
# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Facebook OAuth
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# Apple OAuth
APPLE_CLIENT_ID=""
APPLE_CLIENT_SECRET=""
```

### Campaign Monitor Setup

The application uses Campaign Monitor for sending migration invitation emails:

1. **Get API Key**: Sign in to your Campaign Monitor account and navigate to Account Settings > API Keys
2. **Create Smart Email Template**: Create a transactional email template for migration invites
3. **Get Template ID**: Copy the Smart Email ID from your template settings
4. **Configure Variables**: The email template should support these merge variables:
   - `{firstName}` - User's first name
   - `{link}` - Migration registration URL

**Note**: Both `CAMPAIGN_MONITOR_API_KEY` and `CAMPAIGN_MONITOR_MIGRATION_EMAIL_ID` are required for the user migration system to work properly.

## 🤝 Contributing

This application helps coordinate volunteers for Everybody Eats' mission to reduce food waste, food insecurity, and social isolation in Aotearoa/New Zealand. 🌱

## 📚 Learn More

To learn more about the technologies used:

- 📖 [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- 🗄️ [Prisma Documentation](https://www.prisma.io/docs) - Database toolkit and ORM
- 🎨 [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- 🧩 [Radix UI](https://www.radix-ui.com/) - Low-level UI primitives
