import { Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

let globalCoverage: any[] = [];

export async function startCoverage(page: Page) {
  if (!process.env.COLLECT_COVERAGE) return;
  
  await page.coverage.startJSCoverage({
    resetOnNavigation: false,
    includeRawScriptCoverage: true,
  });
}

export async function stopCoverage(page: Page) {
  if (!process.env.COLLECT_COVERAGE) return;
  
  try {
    const coverage = await page.coverage.stopJSCoverage();
    
    // Filter to only include our application code
    const appCoverage = coverage.filter(entry => {
      const url = entry.url;
      return (
        url.includes('localhost:3000') &&
        !url.includes('node_modules') &&
        !url.includes('_next/static/chunks/webpack') &&
        !url.includes('_next/static/chunks/polyfills') &&
        !url.includes('_next/static/chunks/main') &&
        !url.includes('_buildManifest.js') &&
        !url.includes('_ssgManifest.js')
      );
    });

    globalCoverage.push(...appCoverage);
  } catch (error) {
    console.warn('Failed to collect coverage:', error);
  }
}

export async function saveCoverageData() {
  if (!process.env.COLLECT_COVERAGE || globalCoverage.length === 0) return;
  
  const coverageDir = path.join(process.cwd(), 'coverage');
  
  // Ensure coverage directory exists
  try {
    await fs.mkdir(coverageDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Convert to V8 coverage format that c8 can understand
  const v8Coverage = globalCoverage.map(entry => ({
    url: entry.url,
    functions: entry.functions || [],
    ranges: entry.ranges || [],
    source: entry.source
  }));

  // Write V8 coverage data
  await fs.writeFile(
    path.join(coverageDir, 'tmp', 'v8-coverage.json'),
    JSON.stringify(v8Coverage, null, 2)
  );

  console.log(`Coverage data saved for ${v8Coverage.length} files`);
}