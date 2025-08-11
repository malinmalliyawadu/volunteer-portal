# OAuth Provider Setup Guide

This guide will help you configure Google, Facebook, and Apple OAuth providers for the volunteer portal.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Facebook OAuth
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"

# Apple OAuth
APPLE_ID="your-apple-app-id"
APPLE_SECRET="your-apple-secret"
```

## 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Set authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy Client ID and Client Secret to your `.env.local`

## 2. Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app → "Consumer" → "None"
3. Add Facebook Login product
4. Go to Facebook Login → Settings
5. Set Valid OAuth Redirect URIs:
   - `http://localhost:3000/api/auth/callback/facebook` (development)
   - `https://yourdomain.com/api/auth/callback/facebook` (production)
6. Copy App ID and App Secret to your `.env.local`

## 3. Apple OAuth Setup

1. Go to [Apple Developer](https://developer.apple.com/)
2. Sign in to your Apple Developer account
3. Go to "Certificates, Identifiers & Profiles"
4. Create a new App ID or use existing one
5. Enable "Sign In with Apple" capability
6. Create a Service ID for your web app
7. Configure domains and return URLs:
   - Return URLs: `http://localhost:3000/api/auth/callback/apple` (development)
   - Return URLs: `https://yourdomain.com/api/auth/callback/apple` (production)
8. Create a private key for Sign In with Apple
9. Use Service ID as APPLE_ID and generated JWT as APPLE_SECRET

## Testing OAuth Providers

1. Start your development server: `npm run dev`
2. Navigate to `/login` or `/register`
3. Click on any OAuth provider button
4. Complete the OAuth flow
5. Check if user is created in your database

## Production Deployment

1. Update all callback URLs to use your production domain
2. Set production environment variables
3. Ensure HTTPS is enabled
4. Test all OAuth flows in production

## Troubleshooting

### Common Issues:

1. **Invalid redirect URI**: Ensure callback URLs match exactly
2. **App not in development mode**: Some providers require app review for production
3. **HTTPS required**: Most OAuth providers require HTTPS in production
4. **Scope permissions**: Ensure your app requests appropriate scopes

### Database Schema

OAuth users are automatically created with:

- Email from OAuth provider
- Name split into firstName/lastName
- Profile photo URL
- Default role: VOLUNTEER
- Empty hashedPassword (OAuth users don't need passwords)
- Agreement flags set to false (users need to complete profile)

### Profile Completion Flow

OAuth users are redirected to `/profile/edit?oauth=true` to complete their volunteer profile, including:

- Emergency contact information
- Medical conditions
- Availability preferences
- Policy agreement acceptance
