import { OllamaProvider } from '../ollama.provider';
import fetch from 'node-fetch';
import { LLMConfig } from '../../types';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  const mockConfig: LLMConfig = {
    provider: 'ollama',
    model: 'llama3.2',
    endpoint: 'http://localhost:11434',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OllamaProvider();
    provider.initialize(mockConfig);
  });

  describe('chat', () => {
    it('should send chat request and return response', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValue(new Response(JSON.stringify({
        message: { content: 'Hello' }
      })));

      const response = await provider.chat([{ role: 'user', content: 'Hi', id: '1', timestamp: new Date() }]);
      expect(response).toBe('Hello');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"stream":false')
        })
      );
    });

    it('should handle API error', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValue(new Response('Error', { status: 500 }));

      await expect(provider.chat([])).rejects.toThrow('Ollama API error');
    });
  });

  describe('isAvailable', () => {
    it('should return true if tags endpoint returns ok', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValue(new Response('{}', { status: 200 }));
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it('should return false if fetch fails', async () => {
      (fetch as unknown as jest.Mock).mockRejectedValue(new Error('Network error'));
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('embed', () => {
    it('should return embeddings', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValue(new Response(JSON.stringify({
        embedding: [0.1, 0.2, 0.3]
      })));

      const result = await provider.embed('text');
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it('should handle embedding error', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValue(new Response('Error', { status: 500 }));
      await expect(provider.embed('text')).rejects.toThrow('Ollama Embeddings API error');
    });
  });
});
