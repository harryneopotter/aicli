import { validateToolArgs, providerConfigSchema } from '../schemas';

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
    const valid = providerConfigSchema.safeParse({ model: 'gpt-4', apiKey: 'sk-xxx', endpoint: 'http://localhost' });
    expect(valid.success).toBe(true);
  });

  it('should reject invalid provider config', () => {
    const invalid = providerConfigSchema.safeParse({ model: '', apiKey: 'sk-xxx', endpoint: 'not-a-url' });
    expect(invalid.success).toBe(false);
  });
});
