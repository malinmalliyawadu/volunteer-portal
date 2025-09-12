// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightSidebarTopics from 'starlight-sidebar-topics';

// Get the app URL from environment variable, default to localhost for development
const APP_URL = process.env.VOLUNTEER_PORTAL_URL || 'http://localhost:3000';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      plugins: [starlightSidebarTopics([
        {
          label: 'Admin Guide',
          link: '/',
          icon: 'star',
          items: [
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
                  label: "Managing Signups",
                  slug: "shift-management/managing-signups",
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
            }
          ]
        },
        {
          label: 'Restaurant Managers',
          link: '/restaurant-managers/',
          icon: 'open-book',
          badge: 'New',
          items: [
            {
              label: "Getting Started",
              items: [
                { label: "Multi-Location Features", slug: "location-management/location-filtering" },
                { label: "Restaurant Manager API", slug: "location-management/restaurant-manager-api" }
              ]
            },
            {
              label: "Shift Management",
              items: [
                { label: "Creating Shifts", slug: "shift-management/creating-shifts" },
                { label: "Group Bookings", slug: "shift-management/group-bookings" },
                { label: "Attendance Tracking", slug: "shift-management/attendance-tracking" }
              ]
            },
            {
              label: "Reports & Analytics",
              items: [
                { label: "Dashboard Metrics", slug: "reports-analytics/dashboard-metrics" },
                { label: "Volunteer Activity", slug: "reports-analytics/volunteer-activity" },
                { label: "Shift Analytics", slug: "reports-analytics/shift-analytics" }
              ]
            }
          ]
        },
        {
          label: 'Developer Reference',
          link: '/developers/',
          icon: 'laptop',
          items: [
            {
              label: "System Administration",
              items: [
                { label: "Admin Permissions", slug: "reference/permissions" },
                { label: "Notification System", slug: "reference/notifications" }
              ]
            },
            {
              label: "API Documentation",
              items: [
                { label: "API Endpoints", slug: "reference/api-endpoints" }
              ]
            }
          ]
        }
      ])],
      title: "Everybody Eats Admin Guide",
      description: "Administrator documentation for the volunteer portal",
      customCss: ["./src/styles/custom.css"],
      editLink: {
        baseUrl: 'https://github.com/everybody-eats-nz/volunteer-portal/edit/main/docs/',
      },
      head: [
        {
          tag: 'script',
          content: `
            // Wait for DOM and handle dynamic content
            function initImageZoom() {
              // Create modal elements if not exists
              if (document.querySelector('.image-modal')) return;
              
              const modal = document.createElement('div');
              modal.className = 'image-modal';
              modal.innerHTML = \`
                <button class="image-modal-close" aria-label="Close fullscreen image">×</button>
                <img src="" alt="" />
              \`;
              document.body.appendChild(modal);

              const modalImg = modal.querySelector('img');
              const closeBtn = modal.querySelector('.image-modal-close');

              // Add click listeners to all content images
              const setupImageListeners = () => {
                const images = document.querySelectorAll('main img, .content img, [class*="content"] img');
                console.log('Found images:', images.length);
                
                images.forEach((img, index) => {
                  // Skip logo and other non-content images
                  if (img.closest('.site-title') || img.closest('nav') || img.closest('header')) {
                    console.log('Skipping image', index, 'in header/nav');
                    return;
                  }
                  
                  console.log('Adding click listener to image', index, img.src);
                  img.style.cursor = 'pointer';
                  
                  // Remove existing listeners
                  img.removeEventListener('click', img._zoomHandler);
                  
                  img._zoomHandler = (e) => {
                    console.log('Image clicked:', img.src);
                    e.preventDefault();
                    e.stopPropagation();
                    modalImg.src = img.src;
                    modalImg.alt = img.alt;
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                  };
                  
                  img.addEventListener('click', img._zoomHandler);
                });
              };

              // Close modal functionality
              const closeModal = () => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
              };

              closeBtn.addEventListener('click', closeModal);
              
              // Close on click outside image
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  closeModal();
                }
              });

              // Close on escape key
              document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                  closeModal();
                }
              });
              
              // Setup listeners immediately and on content changes
              setupImageListeners();
              
              // Also setup listeners when content changes (for SPA navigation)
              const observer = new MutationObserver(() => {
                setTimeout(setupImageListeners, 100);
              });
              
              observer.observe(document.body, { childList: true, subtree: true });
            }
            
            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initImageZoom);
            } else {
              initImageZoom();
            }
            
            // Also initialize after view transitions (Starlight SPA navigation)
            document.addEventListener('astro:page-load', initImageZoom);
          `
        },
      ],
      components: {
        Footer: './src/components/Footer.astro',
      },
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/everybody-eats-nz/volunteer-portal",
        },
      ],
    }),
  ],
});
