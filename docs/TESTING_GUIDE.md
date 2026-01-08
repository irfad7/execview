# ExecView Testing Guide

## 🧪 Test Suite Overview

Our comprehensive testing strategy ensures reliability, security, and maintainability across all system components.

## 📋 Test Categories

### 1. Authentication Tests (`tests/auth.test.ts`)
**Purpose**: Validate user management and session security

**Test Coverage**:
- ✅ User creation with bcrypt password hashing
- ✅ Password verification (correct/incorrect credentials)
- ✅ Session management (create, validate, expire, cleanup)
- ✅ Security isolation between users
- ✅ Token uniqueness and expiration handling
- ✅ Automated session cleanup

**Critical Security Tests**:
```typescript
// Password hashing verification
test('should use different password hashes for same password')

// Session isolation
test('should maintain session isolation between users')

// Token security
test('should generate unique session tokens')
```

### 2. Database Storage Tests (`tests/storage.test.ts`)
**Purpose**: Verify all database operations and data integrity

**Test Coverage**:
- ✅ API configuration management
- ✅ Dashboard cache operations (read/write/update)
- ✅ Profile management (create/update/retrieve)
- ✅ Field mapping system
- ✅ System settings persistence
- ✅ Comprehensive logging functionality
- ✅ Sync status tracking
- ✅ Multi-user data isolation

**Data Integrity Tests**:
```typescript
// Cache management
test('should handle invalid JSON in cache gracefully')

// Multi-tenant isolation  
test('should isolate API configs between users')

// Complex data handling
test('should handle complex data structures')
```

### 3. Integration Tests (`tests/integrations.test.ts`)
**Purpose**: Test external API connectors and data transformation

**Test Coverage**:
- ✅ Clio connector (matter fetching, data transformation)
- ✅ GoHighLevel connector (opportunity processing, lead metrics)
- ✅ QuickBooks connector (basic structure, ready for enhancement)
- ✅ OAuth token validation and error handling
- ✅ Rate limiting and API error responses
- ✅ Network error recovery

**Integration Reliability Tests**:
```typescript
// Error handling
test('should handle Clio API errors')
test('should handle GHL API errors')

// Data validation
test('should validate Clio response structure')
test('should handle opportunities with missing data gracefully')

// Token management
test('should validate token format')
```

### 4. API Route Tests (`tests/api-routes.test.ts`)
**Purpose**: Validate HTTP endpoints and security

**Test Coverage**:
- ✅ Login/logout endpoint functionality
- ✅ Session cookie management and security
- ✅ Error handling and input validation
- ✅ Security (no sensitive information leakage)
- ✅ OAuth callback structure verification

**Security Endpoint Tests**:
```typescript
// Authentication
test('should reject invalid credentials')
test('should validate required fields')

// Security
test('should not expose sensitive information in errors')
test('should set appropriate cookie security flags')
```

## 🎯 Running Tests

### Basic Test Commands
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (development)
npm run test:watch

# Run specific test file
npm test auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="authentication"
```

### Test Environment Setup
```bash
# Install test dependencies
npm install

# Set test environment variables
cp .env.local .env.test

# Run database migrations for testing
DATABASE_URL="postgresql://test:test@localhost:5432/test_db" npx prisma migrate deploy
```

## 📊 Coverage Report

### Current Coverage Targets
- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

### Coverage Areas
```bash
# Generate detailed coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Breakdown
```
Authentication System:    95%+ coverage
Database Operations:      92%+ coverage  
API Integrations:         88%+ coverage
API Routes:               90%+ coverage
Utility Functions:        85%+ coverage
```

## 🔍 Testing Best Practices

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Clean up test data
    await cleanup();
  });

  test('should perform expected behavior', async () => {
    // Arrange
    const testData = createTestData();
    
    // Act
    const result = await functionUnderTest(testData);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.property).toBe(expectedValue);
  });
});
```

### Mocking External Services
```typescript
// Mock external APIs
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => mockResponse
} as Response);
```

### Database Testing
```typescript
// Use transaction rollback for isolation
beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.session.deleteMany();
  // Clean slate for each test
});
```

## 🚨 Critical Test Scenarios

### Security Tests
1. **Password Security**
   - Passwords are hashed with bcrypt
   - No plaintext password storage
   - Unique salts for each password

2. **Session Security**
   - HTTP-only cookies
   - Proper expiration handling
   - Session isolation between users

3. **Data Isolation**
   - Users can only access their own data
   - No data leakage between tenants
   - Proper authorization checks

### Error Handling Tests
1. **API Failures**
   - Network timeouts
   - Invalid API responses
   - Rate limiting scenarios

2. **Database Errors**
   - Connection failures
   - Constraint violations
   - Transaction rollbacks

3. **Input Validation**
   - Malformed data handling
   - SQL injection prevention
   - XSS protection

### Performance Tests
1. **Database Queries**
   - Efficient query patterns
   - Proper indexing usage
   - Connection pooling

2. **API Response Times**
   - Authentication speed
   - Data retrieval performance
   - Cache effectiveness

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

### Test Environment Variables
```env
# Test database
DATABASE_URL="postgresql://test:test@localhost:5432/test_db"

# Test OAuth (mock values)
CLIO_CLIENT_ID="test_client_id"
CLIO_CLIENT_SECRET="test_client_secret"

# Test settings
NODE_ENV="test"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

## 📈 Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test && npm run lint",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

## 🐛 Debugging Tests

### Common Issues

#### Test Database Connection
```bash
# Check database connectivity
npx prisma db pull

# Reset test database
npx prisma migrate reset --force
```

#### Mock Issues
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Restore original implementation
afterAll(() => {
  jest.restoreAllMocks();
});
```

#### Async Test Timeout
```typescript
// Increase timeout for slow tests
test('slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Test Debugging Tips
1. **Use `console.log`** strategically in tests
2. **Run single test** with `npm test -- --testNamePattern="specific test"`
3. **Use debugger** with `node --inspect-brk`
4. **Check mock calls** with `expect(mockFunction).toHaveBeenCalledWith()`

## 📝 Writing New Tests

### Test File Structure
```typescript
/**
 * [Feature Name] Tests
 * 
 * Tests the [feature description] including:
 * - Primary functionality
 * - Error handling
 * - Edge cases
 * - Security considerations
 */

import { functionToTest } from '../src/lib/feature';
import { prisma } from './setup';

describe('[Feature Name]', () => {
  // Test setup and teardown
  
  describe('[Sub-feature]', () => {
    // Specific test cases
  });
});
```

### Test Naming Convention
```typescript
// Good test names
test('should create user with hashed password')
test('should reject invalid credentials')
test('should handle API timeout gracefully')

// Poor test names  
test('user test')
test('login works')
test('API call')
```

### Assertion Patterns
```typescript
// Use specific assertions
expect(result).toBe(expectedValue);           // Exact match
expect(result).toEqual(expectedObject);       // Deep equality
expect(result).toContain(expectedItem);       // Array/string contains
expect(result).toBeGreaterThan(0);           // Numeric comparison
expect(mockFunction).toHaveBeenCalledWith();  // Mock verification
```

## 📊 Test Metrics & Monitoring

### Key Metrics to Track
- **Test Execution Time**: Monitor for performance regressions
- **Coverage Percentage**: Maintain high coverage standards
- **Flaky Tests**: Identify and fix unstable tests
- **Test Maintenance**: Update tests when features change

### Quality Gates
```bash
# Fail build if coverage drops below threshold
npm run test:coverage -- --coverageThreshold='{"global":{"lines":90}}'

# Fail build if any tests are skipped
npm test -- --passWithNoTests=false
```

## 🎯 Testing Roadmap

### Current State (v1.0)
- ✅ Core functionality coverage
- ✅ Security testing
- ✅ Error handling validation
- ✅ API integration testing

### Future Enhancements (v1.1+)
- 🔄 **E2E Testing** with Playwright
- 🔄 **Performance Testing** with load testing
- 🔄 **Visual Regression Testing** for UI components
- 🔄 **Contract Testing** for API integrations
- 🔄 **Chaos Engineering** for resilience testing

### Test Automation Goals
1. **100% Critical Path Coverage** - All user workflows tested
2. **Automated Security Scanning** - Regular security test runs
3. **Performance Benchmarks** - Automated performance regression detection
4. **Cross-browser Testing** - Ensure compatibility across browsers