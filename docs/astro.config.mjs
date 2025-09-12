// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Everybody Eats Admin Guide",
      description: "Administrator documentation for the volunteer portal",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/anthropics/volunteer-portal",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Overview", slug: "index" },
            { label: "Admin Dashboard", slug: "overview/admin-dashboard" },
            { label: "User Roles & Permissions", slug: "overview/user-roles" },
            { label: "Navigation Guide", slug: "overview/navigation" },
          ],
        },
        {
          label: "User Management",
          items: [
            {
              label: "Viewing Volunteers",
              slug: "user-management/viewing-volunteers",
            },
            {
              label: "Volunteer Profiles",
              slug: "user-management/volunteer-profiles",
            },
            { label: "Admin Notes", slug: "user-management/admin-notes" },
            {
              label: "Parental Consent",
              slug: "user-management/parental-consent",
            },
          ],
        },
        {
          label: "Shift Management",
          items: [
            {
              label: "Calendar Overview",
              slug: "shift-management/calendar-overview",
            },
            {
              label: "Creating Shifts",
              slug: "shift-management/creating-shifts",
            },
            {
              label: "Managing Signups",
              slug: "shift-management/managing-signups",
            },
            {
              label: "Group Bookings",
              slug: "shift-management/group-bookings",
            },
            {
              label: "Attendance Tracking",
              slug: "shift-management/attendance-tracking",
            },
          ],
        },
        {
          label: "Location Management",
          items: [
            {
              label: "Multi-Location Features",
              slug: "location-management/location-filtering",
            },
            {
              label: "Restaurant Manager API",
              slug: "location-management/restaurant-manager-api",
            },
          ],
        },
        {
          label: "Reports & Analytics",
          items: [
            {
              label: "Dashboard Metrics",
              slug: "reports-analytics/dashboard-metrics",
            },
            {
              label: "Volunteer Activity",
              slug: "reports-analytics/volunteer-activity",
            },
            {
              label: "Shift Analytics",
              slug: "reports-analytics/shift-analytics",
            },
          ],
        },
        {
          label: "Troubleshooting",
          items: [
            { label: "Common Issues", slug: "troubleshooting/common-issues" },
            {
              label: "Helping Volunteers",
              slug: "troubleshooting/user-problems",
            },
            { label: "System Errors", slug: "troubleshooting/system-errors" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Admin Permissions", slug: "reference/permissions" },
            { label: "Notification System", slug: "reference/notifications" },
            { label: "API Endpoints", slug: "reference/api-endpoints" },
          ],
        },
      ],
    }),
  ],
});
