import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { contextService } from '../context.service';

describe('ContextService Safe Delete', () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicli-safe-delete-'));
    process.chdir(tempDir);
    contextService.clearHistory();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('moves deleted files into the .not-needed staging area', async () => {
    const filePath = path.join(tempDir, 'sample.txt');
    await fs.promises.writeFile(filePath, 'hello');

    const result = await contextService.executeCommand('rm sample.txt');
    expect(result.error).toBeUndefined();
    const stagingPath = path.join(tempDir, '.not-needed');
    const staged = await fs.promises.readdir(stagingPath);
    expect(staged.some((name) => name.includes('sample.txt'))).toBe(true);
  });

  it('respects -- separator for targets starting with dashes', async () => {
    const dashFile = path.join(tempDir, '-strange.txt');
    await fs.promises.writeFile(dashFile, 'dash');

    const result = await contextService.executeCommand('rm -- -strange.txt');
    expect(result.error).toBeUndefined();
  });

  it('blocks deletion of the staging directory itself', async () => {
    await fs.promises.mkdir(path.join(tempDir, '.not-needed'), { recursive: true });
    const result = await contextService.executeCommand('rm .not-needed');
    expect(result.error).toMatch(/refusing to delete/i);
  });

  it('reports missing files during safe delete', async () => {
    const result = await contextService.executeCommand('rm missing.txt');
    expect(result.error).toMatch(/not found/i);
  });

  it('falls back to copy/delete when rename fails (EXDEV)', async () => {
    const filePath = path.join(tempDir, 'fallback.txt');
    await fs.promises.writeFile(filePath, 'content');

    const renameSpy = jest.spyOn(fs.promises, 'rename');
    const error: NodeJS.ErrnoException = new Error('EXDEV');
    error.code = 'EXDEV';
    renameSpy.mockImplementationOnce(() => Promise.reject(error));

    const result = await contextService.executeCommand('rm fallback.txt');
    renameSpy.mockRestore();

    expect(result.error).toBeUndefined();
    const staged = await fs.promises.readdir(path.join(tempDir, '.not-needed'));
    expect(staged.some((name) => name.includes('fallback.txt'))).toBe(true);
  });

  it('builds a sanitized environment for command execution', () => {
    const env = (contextService as unknown as { buildSafeEnv: () => NodeJS.ProcessEnv }).buildSafeEnv();
    expect(env.PATH).toBeDefined();
    expect(env.LD_PRELOAD).toBeUndefined();
  });
});
