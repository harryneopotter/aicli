// Test setup file
// Mock global objects that might not be available in test environment
global.fetch = jest.fn();

// Mock process.cwd for consistent testing
const originalCwd = process.cwd;
beforeEach(() => {
  process.cwd = jest.fn().mockReturnValue('/test/directory');
});

afterEach(() => {
  process.cwd = originalCwd;
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  };
});

afterAll(() => {
  global.console = originalConsole;
});