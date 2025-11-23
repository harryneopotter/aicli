import { providerFactory } from '../index';
import { ProviderName } from '../../types';

describe('ProviderFactory', () => {
  const openaiConfig = {
    provider: 'openai' as ProviderName,
    model: 'gpt-3.5-turbo',
    apiKey: 'sk-test',
    endpoint: 'https://api.openai.com',
    temperature: 0.7,
  };

  it('should return a provider instance for openai', async () => {
    const provider = await providerFactory.getProvider(openaiConfig);
    expect(provider).toBeDefined();
    expect(provider.name).toBe('openai');
  });

  it('should cache provider instances', async () => {
    const provider1 = await providerFactory.getProvider(openaiConfig);
    const provider2 = await providerFactory.getProvider(openaiConfig);
    expect(provider1).toBe(provider2);
  });

  it('should throw for unknown provider', async () => {
    const badConfig = { ...openaiConfig, provider: 'unknown' as ProviderName };
    await expect(providerFactory.getProvider(badConfig)).rejects.toThrow();
  });
});
