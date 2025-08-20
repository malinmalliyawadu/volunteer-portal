# Motion.dev Migration Progress

This document tracks the progress of migrating from Tailwind CSS animations and custom CSS keyframes to motion.dev for better animation performance and developer experience.

## Migration Overview

**Goal:** Replace all existing animations with motion.dev equivalents
- Remove `tw-animate-css` dependency
- Replace custom CSS keyframes with motion.dev
- Improve animation performance and maintainability
- Maintain existing visual behavior

## Phase 1: Setup & Infrastructure

- [x] Install motion.dev and remove existing animation dependencies
- [x] Create motion.dev animation utilities and variants
- [x] Set up base animation configuration

## Phase 2: Core Pages (High Priority)

### Dashboard (`/dashboard`)
- [x] Migrate 4 stat cards with stagger animations
- [x] Migrate main content cards (Next Shift, Recent Activity, Friends Activity)
- [x] Migrate Achievements card integration
- [x] Migrate Impact & Community stats card
- [x] Migrate Quick Actions card

### Notifications System
- [x] Migrate notification bell dropdown animations
- [x] Migrate notification list item animations
- [x] Migrate notification item hover states

### Achievements Card
- [x] Migrate slide-up entrance animation
- [x] Migrate loading spinner animation
- [x] Migrate expand/collapse animations

## Phase 3: UI Component Library

### Core Components
- [x] Button hover transforms and loading states (`/components/motion-button.tsx`)
- [x] Card hover lift effects (`/components/motion-card.tsx`)
- [x] Dialog/Modal entrance and exit animations (`/components/motion-dialog.tsx`)
- [ ] Dropdown menu animations (`/components/ui/dropdown-menu.tsx`)
- [ ] Popover animations (`/components/ui/popover.tsx`)
- [ ] Tooltip animations (`/components/ui/tooltip.tsx`)
- [ ] Tabs transition animations (`/components/ui/tabs.tsx`)
- [ ] Alert animations (`/components/ui/alert.tsx`)
- [ ] Badge animations (`/components/ui/badge.tsx`)
- [ ] Input focus states (`/components/ui/input.tsx`, `/components/ui/textarea.tsx`)
- [ ] Select dropdown animations (`/components/ui/select.tsx`)

### Layout Components
- [ ] Site header animations (`/components/site-header.tsx`)
- [ ] Site footer animations (`/components/site-footer.tsx`)
- [ ] Page container animations (`/components/page-container.tsx`)
- [ ] User menu animations (`/components/user-menu.tsx`)
- [ ] Theme toggle animations (`/components/theme-toggle.tsx`)

## Phase 4: Feature Pages

### Shifts Management
- [ ] Shifts list page (`/app/shifts/page.tsx`)
- [ ] My shifts page (`/app/shifts/mine/page.tsx`)
- [ ] Shift signup dialog (`/components/shift-signup-dialog.tsx`)
- [ ] Group booking dialog (`/components/group-booking-dialog.tsx`)
- [ ] Delete shift dialog (`/components/delete-shift-dialog.tsx`)
- [ ] Date filter animations (`/components/date-filter.tsx`)

### Profile Management
- [ ] Profile page (`/app/profile/page.tsx`)
- [ ] Profile edit page (`/app/profile/edit/page.tsx`)
- [ ] User profile form (`/components/forms/user-profile-form.tsx`)

### Authentication
- [ ] Login page (`/app/login/page.tsx`)
- [ ] Register page (`/app/register/page.tsx`)

### Friends System
- [ ] Friends page (`/app/friends/page.tsx`)
- [ ] Friend profile page (`/app/friends/[friendId]/page.tsx`)
- [ ] Friends stats page (`/app/friends/stats/page.tsx`)
- [ ] Friends manager (`/components/friends-manager-server.tsx`)
- [ ] Friends list (`/components/friends-list.tsx`)
- [ ] Friend requests list (`/components/friend-requests-list.tsx`)
- [ ] Accept friend request button (`/components/accept-friend-request-button.tsx`)
- [ ] Decline friend request button (`/components/decline-friend-request-button.tsx`)
- [ ] Remove friend button (`/components/remove-friend-button.tsx`)
- [ ] Group invitation actions (`/app/group-invitations/[token]/invitation-actions.tsx`)

## Phase 5: Admin Pages

### Admin Dashboard
- [ ] Admin users page (`/app/admin/users/page.tsx`)
- [ ] Admin shifts page (`/app/admin/shifts/page.tsx`)
- [ ] Admin new shift page (`/app/admin/shifts/new/page.tsx`)
- [ ] Admin volunteer detail page (`/app/admin/volunteers/[id]/page.tsx`)

### Admin Components
- [ ] Invite user dialog (`/components/invite-user-dialog.tsx`)
- [ ] User role toggle (`/components/user-role-toggle.tsx`)

## Phase 6: Cleanup & Testing

### Code Cleanup
- [ ] Remove custom CSS animations from `globals.css`
- [ ] Remove `tw-animate-css` from package.json
- [ ] Update animation utility classes in global styles
- [ ] Remove unused animation-related CSS custom properties

### Testing & Validation
- [ ] Test all animations across different screen sizes
- [ ] Verify animation performance on mobile devices
- [ ] Update e2e tests to handle new motion.dev animations
- [ ] Test reduced motion preferences compatibility
- [ ] Validate animation timing and easing curves match original design

## Migration Notes

### Current Animation Patterns Found:
1. **Slide-up entrance**: `animate-slide-up` class with stagger delays
2. **Fade-in**: `animate-fade-in` class  
3. **Card hover effects**: Transform and shadow transitions
4. **Button hover**: Transform translateY and shadow changes
5. **Loading spinners**: `animate-spin` class
6. **Dropdown animations**: `animate-in fade-in-0 zoom-in-95 slide-in-from-top-2`

### Motion.dev Equivalent Patterns:
- Use `motion.div` with `initial`, `animate`, `exit` props
- Leverage `stagger` for sequential animations
- Use `layoutId` for smooth transitions between states
- Implement `whileHover`, `whileTap` for interaction states

### Files with Heavy Animation Usage:
- `dashboard/page.tsx` - Multiple staggered cards
- `notification-bell.tsx` - Dropdown animations
- `achievements-card.tsx` - Complex loading and content states
- `globals.css` - Custom keyframes and transition utilities

---

**Last Updated:** 2025-08-20
**Total Files to Migrate:** ~52 files
**Completion Status:** ~35% (Core pages and components completed)

## Progress Summary

### ✅ Completed
- **Phase 1**: Setup & Infrastructure (motion.dev installed, utilities created)
- **Phase 2**: Core Pages - Dashboard, Notifications, Achievements
- **Phase 3 (Partial)**: Core UI Components - Button, Card, Dialog motion wrappers

### 🚧 In Progress
- UI Component Library migration
- Page component animations

### 📝 Next Steps
1. Complete remaining UI components (dropdowns, tooltips, etc.)
2. Migrate page-level animations (headers, footers)
3. Update form and admin page animations
4. Clean up old CSS animations
5. Add comprehensive testing