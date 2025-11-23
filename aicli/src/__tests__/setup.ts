// Global test setup
import { jest } from '@jest/globals';

// Mock config service globally to prevent errors in SessionService constructor
process.env.APPDATA = '/tmp/test-config';
process.env.HOME = '/tmp/test-home';

// Mock keytar globally for tests
jest.mock('keytar', () => ({
  setPassword: jest.fn().mockImplementation(() => Promise.resolve()),
  getPassword: jest.fn().mockImplementation(() => Promise.resolve('mock-api-key')),
  deletePassword: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

// Mock better-sqlite3 for tests
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn().mockReturnValue([]),
    }),
    close: jest.fn(),
    exec: jest.fn(),
  }));
});

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global cleanup
afterEach(() => {
  jest.clearAllMocks();
});