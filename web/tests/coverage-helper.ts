import { Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

export class CoverageHelper {
  private coverageData: any[] = [];

  async startCoverage(page: Page) {
    // Start JS coverage collection
    await page.coverage.startJSCoverage({
      resetOnNavigation: false,
      includeRawScriptCoverage: true,
    });
  }

  async stopCoverage(page: Page) {
    // Stop and collect coverage
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
        !url.includes('_ssgManifest.js') &&
        (url.includes('/_next/') || url.includes('/api/'))
      );
    });

    this.coverageData.push(...appCoverage);
  }

  async saveCoverage() {
    const coverageDir = path.join(process.cwd(), 'coverage');
    
    // Ensure coverage directory exists
    try {
      await fs.mkdir(coverageDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Convert Playwright coverage to Istanbul format
    const istanbulCoverage: Record<string, any> = {};

    for (const entry of this.coverageData) {
      if (!entry.source) continue;

      // Convert URL to relative file path
      let filePath = entry.url.replace('http://localhost:3000', '');
      if (filePath.startsWith('/_next/')) {
        // Map Next.js paths to source files
        filePath = filePath.replace('/_next/', './');
      }

      // Create coverage entry in Istanbul format
      const ranges = entry.ranges || [];
      const statementMap: Record<string, any> = {};
      const s: Record<string, number> = {};
      
      ranges.forEach((range: any, index: number) => {
        statementMap[index] = {
          start: { line: 1, column: range.start },
          end: { line: 1, column: range.end }
        };
        s[index] = range.count || 0;
      });

      istanbulCoverage[filePath] = {
        path: filePath,
        statementMap,
        s,
        fnMap: {},
        f: {},
        branchMap: {},
        b: {},
        inputSourceMap: null
      };
    }

    // Write coverage data
    await fs.writeFile(
      path.join(coverageDir, 'coverage-final.json'),
      JSON.stringify(istanbulCoverage, null, 2)
    );

    console.log(`Coverage data saved for ${Object.keys(istanbulCoverage).length} files`);
  }

  getCoverageData() {
    return this.coverageData;
  }

  reset() {
    this.coverageData = [];
  }
}