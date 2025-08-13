import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  
  // Override for coverage collection
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['playwright-test-coverage', {
      // Configuration for playwright-test-coverage
      watermarks: {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        lines: [50, 80]
      }
    }]
  ],

  // Only run on Chromium for coverage to avoid duplicates
  projects: [
    {
      name: "chromium-coverage",
      use: { 
        ...devices["Desktop Chrome"],
      },
    }
  ],

  use: {
    ...baseConfig.use,
    // Disable trace for coverage runs to reduce overhead
    trace: 'off',
  },
});