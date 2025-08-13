import { chromium, FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // Clean up any existing coverage data
  const coverageDir = path.join(process.cwd(), 'coverage');
  try {
    await fs.rm(coverageDir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist
  }
  
  // Ensure coverage directory exists
  await fs.mkdir(coverageDir, { recursive: true });
  
  console.log('Coverage collection initialized');
  
  // Set up a browser instance for coverage collection
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Enable coverage collection globally
  await context.addInitScript(() => {
    // This will be injected into every page
    if (typeof window !== 'undefined') {
      window.__coverage__ = window.__coverage__ || {};
    }
  });
  
  await browser.close();
}

export default globalSetup;