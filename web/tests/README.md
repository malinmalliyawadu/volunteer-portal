# Migration System E2E Tests

This directory contains comprehensive end-to-end tests for the user migration system, covering the complete workflow from CSV upload to user registration completion.

## Test Structure

### 🔧 Test Files

- **`admin-migration.spec.ts`** - Admin interface tests for CSV upload, validation, and migration execution
- **`migration-registration.spec.ts`** - Deep link registration flow tests for migrated users
- **`migration-api.spec.ts`** - API integration tests for all migration endpoints

### 📁 Supporting Files

- **`fixtures/`** - Test data files including valid and invalid CSV samples
- **`helpers/migration-test-utils.ts`** - Utility functions and helper classes for migration testing
- **`scripts/run-migration-tests.sh`** - Dedicated test runner for migration tests

## Test Coverage

### Admin Migration Interface
- ✅ CSV file upload with drag-and-drop support
- ✅ Real-time validation with detailed error reporting
- ✅ Dry run functionality
- ✅ Migration execution with confirmation dialogs
- ✅ Progress tracking and results display
- ✅ Invitation management and URL generation
- ✅ User filtering and search functionality
- ✅ Statistics and status tracking
- ✅ Error handling and edge cases
- ✅ Responsive design on mobile devices

### Registration Flow
- ✅ Token validation (valid, invalid, expired)
- ✅ Multi-step registration form (4 steps)
- ✅ Form validation and error handling
- ✅ Password requirements and confirmation
- ✅ Emergency contact information (optional)
- ✅ Volunteer preferences selection
- ✅ Terms and agreements acceptance
- ✅ Navigation between steps (back/forward)
- ✅ Data persistence across steps
- ✅ Successful registration and auto-login
- ✅ Token invalidation after use

### API Integration
- ✅ CSV validation endpoint
- ✅ Migration execution endpoint
- ✅ User invitation endpoints
- ✅ Registration token validation
- ✅ Authentication and authorization
- ✅ Error handling for all scenarios
- ✅ Edge cases and malformed data

## Running Tests

### Quick Commands

```bash
# Run all migration tests
npm run test:migration

# Run migration tests only (Playwright)
npm run test:e2e:migration

# Run specific test files
npx playwright test admin-migration.spec.ts --project=chromium
npx playwright test migration-registration.spec.ts --project=chromium
npx playwright test migration-api.spec.ts --project=chromium

# Run with UI for debugging
npx playwright test admin-migration.spec.ts --project=chromium --ui
```

### Using the Test Runner Script

The dedicated test runner provides enhanced output and server management:

```bash
# Make script executable (first time only)
chmod +x tests/scripts/run-migration-tests.sh

# Run migration tests with enhanced output
./tests/scripts/run-migration-tests.sh
```

The script will:
1. Check if the development server is running
2. Start the server if needed
3. Run all migration tests in sequence
4. Generate and display test reports
5. Clean up resources automatically

## Test Data

### CSV Fixtures

- **`migration-test-data.csv`** - Valid test data with 5 users
- **`migration-invalid-data.csv`** - Invalid data for error testing

### Generated Test Data

The test suite can generate custom CSV data using the `generateTestCSV()` utility:

```typescript
import { generateTestCSV } from '../helpers/migration-test-utils';

const csvContent = generateTestCSV([
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    phone: '021-555-0001'
  }
]);
```

## Test Utilities

### MigrationTestHelper

Provides helper methods for admin migration tests:

```typescript
const helper = new MigrationTestHelper(page);

await helper.loginAsAdmin();
await helper.navigateToMigrationPage();
await helper.uploadCSV('test-data.csv');
await helper.executeMigration();
await helper.sendInvitations();
```

### RegistrationTestHelper

Provides helper methods for registration flow tests:

```typescript
const helper = new RegistrationTestHelper(page);

await helper.navigateToRegistration(token);
await helper.completeFullRegistration();
```

### Database Helpers

Static methods for database operations:

```typescript
// Create test user with migration token
const user = await MigrationTestHelper.createMigrationUser('test@example.com');

// Clean up test data
await MigrationTestHelper.cleanupTestUsers(['test@example.com']);

// Get migration statistics
const stats = await MigrationTestHelper.getMigrationStats();
```

## Test Environment

### Prerequisites

1. **Database**: Tests require a working PostgreSQL database with migrations applied
2. **Seed Data**: Run `npm run prisma:seed` to populate test users (admin@everybodyeats.nz)
3. **Development Server**: Tests can auto-start the server or use existing instance

### Environment Variables

Tests respect the following environment variables:

- `NODE_ENV=test` - Enables test mode
- `E2E_TESTING=true` - Disables animations for faster testing
- `DATABASE_URL` - Database connection string

### Cleanup

Tests include automatic cleanup for:
- Created test users
- Temporary files
- Database state
- Server processes

## Best Practices

### Writing Migration Tests

1. **Use helpers**: Leverage the provided helper classes for common operations
2. **Clean up**: Always clean up test data in `afterEach` or `afterAll` hooks
3. **Isolation**: Each test should be independent and not rely on other tests
4. **Assertions**: Use specific assertions with meaningful error messages
5. **Error handling**: Test both success and failure scenarios

### Test Data Management

1. **Fixtures**: Use fixture files for static test data
2. **Generation**: Use `generateTestCSV()` for dynamic test data
3. **Unique emails**: Always use unique email addresses to avoid conflicts
4. **Cleanup**: Remove test data after each test

### Performance Considerations

1. **Parallel execution**: Tests are designed to run in parallel
2. **Database state**: Tests clean up their data to avoid conflicts
3. **Server reuse**: The test runner can reuse existing development server
4. **Browser choice**: Use Chromium for fastest execution (CI recommended)

## Troubleshooting

### Common Issues

1. **Server not starting**: Check if port 3000 is available
2. **Database errors**: Ensure migrations are applied and database is accessible
3. **Test timeouts**: Increase timeout values for slow operations
4. **File permissions**: Make sure test script is executable

### Debug Mode

Run tests with UI mode for interactive debugging:

```bash
npx playwright test admin-migration.spec.ts --ui
```

### Verbose Logging

Enable verbose logging for detailed test output:

```bash
npx playwright test admin-migration.spec.ts --reporter=verbose
```

## Contributing

When adding new migration functionality:

1. **Add tests**: Include comprehensive test coverage for new features
2. **Update helpers**: Extend helper classes with new utility methods
3. **Document**: Update this README with new test scenarios
4. **Fixtures**: Add new test data files if needed
5. **CI integration**: Ensure tests work in CI environment

## CI Integration

The migration tests are designed to work in CI environments:

- Use `--project=chromium` for fastest execution
- Include proper cleanup and error handling
- Support headless mode by default
- Generate artifacts for debugging failures

For CI usage:
```bash
npm run test:e2e:migration
```