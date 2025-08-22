jest.mock('command-exists', () => ({
  sync: jest.fn(),
}));

import { AIAgentTerminalDecorator } from '../src/plugin';
import commandExists from 'command-exists';

const mockAIAgentService = {
  observeCommand: jest.fn(),
  processNaturalLanguage: jest.fn(),
};

const mockContextManagerService = {
  addTerminalOutput: jest.fn(),
  addUserInput: jest.fn(),
  getFullContext: jest.fn(),
};

const mockMCPClientService = {
  getAvailableTools: jest.fn(),
};


describe('AIAgentTerminalDecorator', () => {
  let decorator: AIAgentTerminalDecorator;
  let commandExistsSyncMock: jest.Mock;

  beforeEach(() => {
    // Instantiate the decorator with mock services
    decorator = new AIAgentTerminalDecorator(mockAIAgentService as any, mockContextManagerService as any, mockMCPClientService as any);
    commandExistsSyncMock = commandExists.sync as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isCommand', () => {
    it('should return true for commands that exist', () => {
      commandExistsSyncMock.mockReturnValue(true);
      expect((decorator as any).isCommand('ls -la')).toBe(true);
      expect(commandExistsSyncMock).toHaveBeenCalledWith('ls');
    });

    it('should return false for commands that do not exist', () => {
      commandExistsSyncMock.mockImplementation(() => {
        throw new Error('Command not found');
      });
      expect((decorator as any).isCommand('nonexistentcommand')).toBe(false);
    });

    it('should return true for inputs starting with shell indicators', () => {
      expect((decorator as any).isCommand('./run.sh')).toBe(true);
      expect((decorator as any).isCommand('/bin/ls')).toBe(true);
      expect((decorator as any).isCommand('~/.bashrc')).toBe(true);
      expect((decorator as any).isCommand('$HOME')).toBe(true);
      expect((decorator as any).isCommand('echo "hello" | grep h')).toBe(true);
      expect((decorator as any).isCommand('ls > out.txt')).toBe(true);
    });

    it('should return true for windows style paths', () => {
        expect((decorator as any).isCommand('C:\\Users\\test')).toBe(true);
    });

    it('should return false for natural language queries', () => {
      commandExistsSyncMock.mockImplementation(() => {
        throw new Error('Command not found');
      });
      expect((decorator as any).isCommand('what is the current directory?')).toBe(false);
      expect((decorator as any).isCommand('list all files')).toBe(false);
    });

    it('should handle commands with hyphens', () => {
        commandExistsSyncMock.mockReturnValue(true);
        expect((decorator as any).isCommand('git-lfs pull')).toBe(true);
        expect(commandExistsSyncMock).toHaveBeenCalledWith('git-lfs');
    });

    it('should return false for empty or whitespace strings', () => {
        expect((decorator as any).isCommand('')).toBe(false);
        expect((decorator as any).isCommand('   ')).toBe(false);
    });
  });
});
