import { test as base, Page } from '@playwright/test';
import { CoverageHelper } from '../coverage-helper';

type CoverageFixtures = {
  pageWithCoverage: Page;
  coverageHelper: CoverageHelper;
};

export const test = base.extend<CoverageFixtures>({
  coverageHelper: async ({}, use) => {
    const helper = new CoverageHelper();
    await use(helper);
    await helper.saveCoverage();
  },

  pageWithCoverage: async ({ page, coverageHelper }, use) => {
    // Start coverage collection
    await coverageHelper.startCoverage(page);
    
    await use(page);
    
    // Stop coverage collection
    await coverageHelper.stopCoverage(page);
  },
});

export { expect } from '@playwright/test';