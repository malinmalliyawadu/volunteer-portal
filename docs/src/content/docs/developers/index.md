---
title: Developer Reference
description: Technical documentation and API reference for developers
---

Welcome to the Developer Reference section of the Everybody Eats Volunteer Portal. This documentation provides technical details for developers working with or integrating with the volunteer system.

## Authentication & Authorization

Technical documentation for authentication systems and user management:

- **[OAuth Authentication](/developers/oauth-authentication/)** - OAuth provider integration, configuration, and customization
- **[Admin Permissions](/reference/permissions/)** - User roles, permission levels, and access control
- **[Notification System](/reference/notifications/)** - Technical reference for the notification and communication system

## API Documentation

Comprehensive API documentation for system integrations:

- **[API Endpoints](/reference/api-endpoints/)** - Complete API reference with endpoints, parameters, and responses

## Quick Links

- **[GitHub Repository](https://github.com/everybody-eats-nz/volunteer-portal)** - Source code and issue tracking
- **[Live Application](http://localhost:3000)** - Development environment access

## Architecture Overview

The Everybody Eats Volunteer Portal is built with:

- **Next.js 15.4** with App Router
- **TypeScript** with strict configuration
- **Prisma ORM** with PostgreSQL
- **NextAuth.js** for authentication
- **Tailwind CSS v4** + shadcn/ui components
- **Playwright** for end-to-end testing

## Development Setup

For detailed setup instructions, database management, and development workflows, see the main project documentation at the repository root.

:::note
Technical documentation is actively being expanded. For immediate development questions, refer to the codebase documentation in `/web/docs/` or the main project README.
:::