import { promises as fs } from 'fs';
import path from 'path';

async function globalTeardown() {
  console.log('Coverage teardown complete');
  
  // Create a simple coverage report if we have any test results
  const coverageDir = path.join(process.cwd(), 'coverage');
  
  try {
    await fs.mkdir(coverageDir, { recursive: true });
    
    // Create a basic coverage summary for now
    const testResultsPath = path.join(process.cwd(), 'test-results.json');
    let testCount = 0;
    
    try {
      const testResults = await fs.readFile(testResultsPath, 'utf8');
      const results = JSON.parse(testResults);
      testCount = results.suites?.reduce((acc: number, suite: any) => 
        acc + (suite.specs?.length || 0), 0) || 0;
    } catch (error) {
      console.log('No test results found');
    }
    
    // Create a mock coverage summary for demonstration
    const coverageSummary = {
      total: {
        statements: { pct: 0, covered: 0, total: 0 },
        branches: { pct: 0, covered: 0, total: 0 },
        functions: { pct: 0, covered: 0, total: 0 },
        lines: { pct: 0, covered: 0, total: 0 }
      }
    };
    
    await fs.writeFile(
      path.join(coverageDir, 'coverage-summary.json'),
      JSON.stringify(coverageSummary, null, 2)
    );
    
    console.log(`Coverage teardown complete. Processed ${testCount} tests.`);
  } catch (error) {
    console.log('Coverage teardown completed with warnings:', error);
  }
}

export default globalTeardown;