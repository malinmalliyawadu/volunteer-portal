import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  // Override specific settings for coverage
  reporter: process.env.CI ? [['json', { outputFile: 'test-results.json' }]] : "html",
  
  // Only run on Chromium for coverage to avoid duplicates
  projects: [
    {
      name: "chromium-coverage",
      use: { 
        ...devices["Desktop Chrome"],
        // Enable code coverage for each page
        contextOptions: {
          // Add a script to enable coverage
          recordVideo: undefined, // Disable video for coverage runs
        }
      },
    }
  ],

  use: {
    ...baseConfig.use,
    // Add global coverage setup
    trace: 'off', // Disable trace for coverage runs to reduce overhead
  },
});