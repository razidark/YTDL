// =========================================================================
// YTDL — Jest Test Setup
// =========================================================================

import "jest-extended/all";

// Set up test environment
process.env.NODE_ENV = "test";
process.env.PORT = "3001";

// Clean up any existing test files before tests
beforeAll(() => {
  const testDir = "test-temp";
  if (require("fs").existsSync(testDir)) {
    require("fs").rmdirSync(testDir, { recursive: true });
  }
});

// Clean up after tests
afterAll(() => {
  const testDir = "test-temp";
  if (require("fs").existsSync(testDir)) {
    require("fs").rmdirSync(testDir, { recursive: true });
  }
});

// Global test timeout
jest.setTimeout(30000);
