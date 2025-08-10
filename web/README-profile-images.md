# Profile Image Upload Feature

This feature allows users to upload and crop profile photos that are stored as base64-encoded data in the database.

## Implementation Details

### Components

- `ProfileImageUpload` - Main component for uploading and cropping profile images
- Located at: `/src/components/ui/profile-image-upload.tsx`

### Features

- ✅ Image upload with file validation (JPG, PNG only)
- ✅ Image cropping with 1:1 aspect ratio
- ✅ Automatic image compression and resizing
- ✅ Base64 storage in database
- ✅ File size limits (5MB upload, <1MB stored)
- ✅ Fallback to user initials when no image

### Usage

```tsx
import { ProfileImageUpload } from "@/components/ui/profile-image-upload";

<ProfileImageUpload
  currentImage={profilePhotoUrl}
  onImageChange={(base64Image) => setProfilePhoto(base64Image)}
  disabled={loading}
  size="md" // sm, md, lg
  fallbackText="AB" // User initials
/>;
```

### Database Storage

- Field: `User.profilePhotoUrl` (String?, nullable)
- Format: Base64-encoded JPEG (`data:image/jpeg;base64,/9j/4AAQ...`)
- Max size: ~1MB after compression
- Compression: Automatic quality reduction and resizing

### Image Processing

1. User selects image file (max 5MB)
2. Image is displayed in crop modal
3. User adjusts crop area (square, 1:1 aspect ratio)
4. Image is processed to canvas
5. Canvas exports to base64 JPEG
6. Automatic compression if size > 1MB
7. Base64 string stored in database

### File Size Management

- Upload limit: 5MB original file
- Storage limit: 1MB base64 string
- Auto-compression: Reduces quality and dimensions if needed
- Fallback: Error if can't compress below 1MB

### Integration Points

- Edit Profile Page: `/profile/edit` - loads data from API, includes upload component
- Profile Display: `/profile` - shows uploaded image in avatar
- API Endpoint: `/api/profile` - handles profile updates including image
- Database: `profilePhotoUrl` field in User model

### Data Flow

1. **Edit Profile Page** loads current data via `/api/profile` GET request
2. **User uploads/crops** image → base64 string generated
3. **Form submission** sends all data including image via `/api/profile` PUT request
4. **Database updated** with new profile photo base64 string
5. **UI refreshes** to show new image across all components

### Error Handling

- Invalid file types rejected with alert
- Files too large (>5MB) rejected with alert
- Compression failures show error message
- Failed uploads preserve existing image

### Dependencies

- `react-image-crop` - Image cropping functionality
- Canvas API - Image processing and compression
- Base64 encoding - Built-in browser functionality
