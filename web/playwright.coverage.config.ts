import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  
  // Override for coverage collection
  reporter: [
    ['json', { outputFile: 'test-results.json' }],
    ['html']
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