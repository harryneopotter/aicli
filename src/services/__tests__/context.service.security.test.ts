import { contextService } from '../context.service';

describe('ContextService - Security Tests', () => {
  describe('Command Injection Protection', () => {
    it('should block command chaining with semicolon', async () => {
      const result = await contextService.executeCommand('ls ; cat /etc/passwd');
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/blocked|not allowed/);
    });
  
    it('should block bash $\' syntax', async () => {
      const result = await contextService.executeCommand("echo $'hello; cat /etc/passwd'");
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/blocked/);
    });

    it('should block command substitution', async () => {
      const result = await contextService.executeCommand('echo $(whoami)');
      expect(result.error).toBeDefined();
    });

    it('should block pipe redirection', async () => {
      const result = await contextService.executeCommand('ls | grep secret');
      expect(result.error).toBeDefined();
    });

    it('should execute safe commands', async () => {
      const result = await contextService.executeCommand('echo hello');
      expect(result.error).toBeUndefined();
      expect(result.output).toContain('hello');
    });

    it('should report errors from failing commands', async () => {
      const result = await contextService.executeCommand('ls definitely-not-real-file');
      expect(result.error).toBeDefined();
    });
  });

  describe('Path Traversal Protection', () => {
    it('should block reading files outside project', async () => {
      const result = await contextService.executeCommand('cat ../../etc/passwd');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Path traversal');
    });

    it('should allow reading files inside project', async () => {
      const result = await contextService.executeCommand('cat package.json');
      expect(result.error).toBeUndefined();
    });
  });
});