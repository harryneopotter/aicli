import keytar from 'keytar';

const SERVICE_NAME = 'warp-cli';

export class SecureConfigService {
  async setApiKey(provider: string, apiKey: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, `${provider}-api-key`, apiKey);
  }

  async getApiKey(provider: string): Promise<string | null> {
    return await keytar.getPassword(SERVICE_NAME, `${provider}-api-key`);
  }

  async deleteApiKey(provider: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, `${provider}-api-key`);
  }
}

export const secureConfigService = new SecureConfigService();
