#!/bin/bash

# Migration E2E Test Runner
# This script runs the migration-specific e2e tests

set -e

echo "🧪 Running Migration System E2E Tests"
echo "======================================"

# Set test environment
export NODE_ENV=test
export E2E_TESTING=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if development server is running
check_server() {
    echo "🔍 Checking if development server is running..."
    if curl -s http://localhost:3000 > /dev/null; then
        print_status "Development server is running"
        return 0
    else
        print_warning "Development server is not running"
        return 1
    fi
}

# Start server if needed
start_server() {
    echo "🚀 Starting development server..."
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo "⏳ Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            print_status "Server is ready"
            return 0
        fi
        sleep 2
    done
    
    print_error "Server failed to start within 60 seconds"
    return 1
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        echo "🧹 Cleaning up server process..."
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    echo "📋 Test Configuration:"
    echo "  - Test Directory: ./tests/e2e"
    echo "  - Base URL: http://localhost:3000"
    echo "  - Browser: Chromium (recommended for CI)"
    echo ""
    
    # Check if server is running, start if needed
    if ! check_server; then
        start_server
        STARTED_SERVER=true
    fi
    
    echo "🧪 Running Migration Tests..."
    echo ""
    
    # Run specific migration tests
    echo "1️⃣ Running Admin Migration Tests..."
    npx playwright test admin-migration.spec.ts --project=chromium --reporter=list || {
        print_error "Admin migration tests failed"
        exit 1
    }
    print_status "Admin migration tests passed"
    echo ""
    
    echo "2️⃣ Running Migration Registration Tests..."
    npx playwright test migration-registration.spec.ts --project=chromium --reporter=list || {
        print_error "Migration registration tests failed"
        exit 1
    }
    print_status "Migration registration tests passed"
    echo ""
    
    echo "3️⃣ Running Migration API Tests..."
    npx playwright test migration-api.spec.ts --project=chromium --reporter=list || {
        print_error "Migration API tests failed"
        exit 1
    }
    print_status "Migration API tests passed"
    echo ""
    
    print_status "All migration tests passed! 🎉"
    
    # Generate test report
    echo ""
    echo "📊 Generating test report..."
    npx playwright show-report --host=0.0.0.0 &
    REPORT_PID=$!
    
    echo ""
    print_status "Test report available at: http://localhost:9323"
    print_warning "Press Ctrl+C to stop the report server"
    
    # Wait for user to stop report server
    wait $REPORT_PID 2>/dev/null || true
}

# Run with error handling
if ! main; then
    print_error "Migration tests failed"
    exit 1
fi