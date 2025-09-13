---
title: Admin Permissions
description: Technical reference for administrator permissions and access controls
---

# Admin Permissions Reference

This page provides technical details about permission levels and access controls in the volunteer portal system.

:::note[Under Construction]
This reference page is being developed. Check back soon for complete permission details.
:::

## Permission Overview

### Database Roles
- `VOLUNTEER` - Standard user role
- `ADMIN` - Administrative access role

### Route Protection
All admin routes (`/admin/*`) are protected by middleware that verifies:
1. User authentication status
2. User role level (must be `ADMIN`)
3. Session validity

### API Endpoint Security
API endpoints check permissions before processing requests:
- User session validation
- Role-based access control
- Operation-specific permissions

## Coming Soon

Detailed documentation will include:
- Complete permission matrix
- API endpoint access levels
- Database schema permissions
- Security implementation details

For immediate assistance with permission issues, see [Troubleshooting Common Issues](/troubleshooting/common-issues/).
