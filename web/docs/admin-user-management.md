# Admin User Management

This document describes the user management functionality available to administrators in the Volunteer Portal.

## Features

### 1. User Management Dashboard (`/admin/users`)

- **View all users** with comprehensive information including:

  - Name, email, phone number
  - Role (Admin/Volunteer)
  - Join date and activity statistics
  - Number of shifts signed up for

- **Search and filter users** by:

  - Name or email (text search)
  - Role (Admin/Volunteer filter)

- **Quick statistics** showing:
  - Total users
  - Total volunteers
  - Total administrators
  - New users this month

### 2. Invite New Users

- **Invite users via email** with role assignment
- **Automatic account creation** with temporary password
- **Email notifications** (currently logged to console, ready for email service integration)
- **Role selection** during invitation (Volunteer or Administrator)

### 3. Role Management

- **Toggle user roles** between Volunteer and Administrator
- **Confirmation dialogs** to prevent accidental role changes
- **Security checks** to prevent self-role modification
- **Real-time updates** after role changes

## Access Control

- Only users with **Administrator** role can access user management features
- Users cannot modify their own role
- All user management actions are logged and secured with session validation

## Navigation

Access user management through:

1. **Admin dropdown** in the main navigation → "Manage Users"
2. **Quick Actions** on the admin dashboard → "Manage Users"
3. **Direct URL**: `/admin/users`

## API Endpoints

### Invite User

- **POST** `/api/admin/users/invite`
- Creates new user account and sends invitation email
- Requires admin privileges

### Update User Role

- **PATCH** `/api/admin/users/[id]/role`
- Changes user role between VOLUNTEER and ADMIN
- Requires admin privileges
- Prevents self-role modification

## Email Integration

The system is ready for email integration. Currently:

- Invitation emails are logged to the console for development
- Email templates are prepared in `/src/lib/email.ts`
- Easy to integrate with services like SendGrid, AWS SES, or Nodemailer

### To enable email sending:

1. Install your preferred email service package
2. Update `/src/lib/email.ts` with your email service configuration
3. Replace the console.log with actual email sending

## Security Features

- **Admin-only access** to all user management functions
- **Session validation** on all API requests
- **Input validation** using Zod schemas
- **Password hashing** with bcrypt for new users
- **Temporary passwords** for invited users (should be changed on first login)

## Future Enhancements

Potential improvements that could be added:

1. **Bulk user operations** (bulk invite, bulk role changes)
2. **User activity logs** and audit trails
3. **Advanced user profiles** with more detailed information
4. **Email verification** for new invitations
5. **User deactivation/suspension** functionality
6. **Custom invitation messages**
7. **Integration with external user directories** (LDAP, Active Directory)

## Development Notes

- User passwords are generated randomly for invitations
- Temporary passwords are returned in the API response for development (remove in production)
- Email service is stubbed but ready for implementation
- All components are responsive and follow the existing design system
