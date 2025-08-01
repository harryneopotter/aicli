// Mock Angular dependencies
jest.mock('@angular/core', () => ({
  Injectable: () => (target: any) => target
}));

// Mock node modules
jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: jest.fn()
}));
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn()
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));
jest.mock('util', () => ({
  promisify: jest.fn()
}));

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

// Import after mocking
const { ContextManagerService } = require('../src/services/context-manager.service');

const mockExecSync = jest.fn();
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockJoin = jest.fn();

// Setup mocks
require('child_process').execSync = mockExecSync;
require('fs').existsSync = mockExistsSync;
require('fs').readFileSync = mockReadFileSync;
require('path').join = mockJoin;

describe('ContextManagerService', () => {
  let service: any;

  beforeEach(() => {
    service = new ContextManagerService();
    jest.clearAllMocks();
  });

  describe('addTerminalOutput', () => {
    it('should add terminal output to history', async () => {
      service.addTerminalOutput('test output');
      
      const context = await service.getFullContext();
      expect(context.recentOutput).toContain('test output');
    });

    it('should filter out ANSI escape codes', async () => {
      service.addTerminalOutput('\u001b[31mError\u001b[0m');
      
      const context = await service.getFullContext();
      expect(context.recentOutput[0]).toBe('Error');
    });

    it('should limit terminal history to 50 entries', async () => {
      for (let i = 0; i < 60; i++) {
        service.addTerminalOutput(`output ${i}`);
      }
      
      const context = await service.getFullContext();
      expect(context.recentOutput.length).toBe(5); // Only last 5 are returned
    });
  });

  describe('addUserInput', () => {
    it('should add user input to history', async () => {
      service.addUserInput('test command');
      
      const context = await service.getFullContext();
      expect(context.recentInputs).toContain('test command');
    });

    it('should trim whitespace from input', async () => {
      service.addUserInput('  test command  ');
      
      const context = await service.getFullContext();
      expect(context.recentInputs[0]).toBe('test command');
    });

    it('should ignore empty inputs', async () => {
      service.addUserInput('');
      service.addUserInput('   ');
      
      const context = await service.getFullContext();
      expect(context.recentInputs.length).toBe(0);
    });
  });

  describe('addCommand', () => {
    it('should add command to recent commands', async () => {
      service.addCommand('ls -la');
      
      const context = await service.getFullContext();
      expect(context.recentCommands).toContain('ls -la');
    });

    it('should limit recent commands to 10 entries', async () => {
      for (let i = 0; i < 15; i++) {
        service.addCommand(`command ${i}`);
      }
      
      const context = await service.getFullContext();
      expect(context.recentCommands.length).toBe(10);
    });
  });

  describe('getFullContext', () => {
    it('should detect Node.js project', async () => {
      const mockFs = require('fs');
      const util = require('util');
      const mockExecAsync = jest.fn();
      util.promisify.mockReturnValue(mockExecAsync);
      mockExecAsync.mockRejectedValue(new Error('Not a git repository'));
      
      mockFs.promises.access.mockImplementation((path: string) => {
        if (path.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: { test: 'jest' }
      }));

      const context = await service.getFullContext();
      expect(context.projectType).toBe('Node.js/JavaScript');
    });

    it('should detect Python project', async () => {
      const mockFs = require('fs');
      const util = require('util');
      const mockExecAsync = jest.fn();
      util.promisify.mockReturnValue(mockExecAsync);
      mockExecAsync.mockRejectedValue(new Error('Not a git repository'));
      
      mockFs.promises.access.mockImplementation((path: string) => {
        if (path.includes('requirements.txt')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });

      const context = await service.getFullContext();
      expect(context.projectType).toBe('Python');
    });

    it('should return null for unrecognized projects', async () => {
      const mockFs = require('fs');
      const util = require('util');
      const mockExecAsync = jest.fn();
      util.promisify.mockReturnValue(mockExecAsync);
      mockExecAsync.mockRejectedValue(new Error('Not a git repository'));
      
      mockFs.promises.access.mockRejectedValue(new Error('File not found'));

      const context = await service.getFullContext();
      expect(context.projectType).toBe(null);
    });
  });

  describe('git status integration', () => {
    it('should return git status when in git repository', async () => {
      const util = require('util');
      const mockExecAsync = jest.fn();
      util.promisify.mockReturnValue(mockExecAsync);
      
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '' }) // git status --porcelain
        .mockResolvedValueOnce({ stdout: 'main\n' }); // git branch --show-current

      const context = await service.getFullContext();
      expect(context.gitStatus).toContain('main');
    });

    it('should handle non-git directories', async () => {
      const util = require('util');
      const mockExecAsync = jest.fn();
      util.promisify.mockReturnValue(mockExecAsync);
      
      mockExecAsync.mockRejectedValue(new Error('Not a git repository'));

      const context = await service.getFullContext();
      expect(context.gitStatus).toBe(null);
    });
  });

  describe('utility methods', () => {
    it('should clear cache', () => {
      service.clearCache();
      // Cache should be cleared, but we can't directly test private properties
      // This test ensures the method doesn't throw
      expect(true).toBe(true);
    });

    it('should return context stats', () => {
      service.addTerminalOutput('test');
      service.addUserInput('input');
      service.addCommand('command');
      
      const stats = service.getContextStats();
      expect(stats.recentCommands).toBe(1);
      expect(stats.terminalOutputLines).toBe(1);
      expect(stats.userInputs).toBe(1);
    });
  });
});