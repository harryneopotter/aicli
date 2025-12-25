import { validateToolArgs, validateProviderConfig } from '../schemas';

describe('Validation Schemas', () => {
  it('should reject path traversal in write_file', () => {
    const result = validateToolArgs('write_file', { path: '../etc/passwd', content: 'data' });
    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('traversal');
  });

  it('should reject dangerous command in exec', () => {
    const result = validateToolArgs('exec', { command: 'ls; rm -rf /' });
    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('dangerous characters');
  });

  it('should validate provider config', () => {
    const valid = validateProviderConfig({ model: 'gpt-4', apiKey: 'sk-xxx', endpoint: 'http://localhost' });
    expect(valid.success).toBe(true);
    expect(valid.data).toBeDefined();
  });

  it('should reject invalid provider config', () => {
    const invalid = validateProviderConfig({ model: '', apiKey: 'sk-xxx', endpoint: 'not-a-url' });
    expect(invalid.success).toBe(false);
    expect(invalid.errors?.length).toBeGreaterThan(0);
  });
  it('should flag unsupported tools', () => {
    const result = validateToolArgs('nonexistent', { foo: 'bar' });
    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('No validation schema');
  });

  it('should enforce search_code limits', () => {
    const result = validateToolArgs('search_code', { query: '', limit: 200 });
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThanOrEqual(1);
  });
});
