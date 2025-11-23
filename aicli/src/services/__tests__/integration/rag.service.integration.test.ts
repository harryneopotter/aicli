import { RAGService } from '../../rag.service';
import { chatService } from '../../chat.service';
import { vectorService } from '../../vector.service';

// Mock fs module before importing anything else
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    promises: {
      readFile: jest.fn(),
      readdir: jest.fn(),
    },
  };
});

jest.mock('../../vector.service');
jest.mock('../../chat.service');

import * as fs from 'fs';

const mockVectorService = {
  addDocument: jest.fn(),
  search: jest.fn().mockReturnValue([]),
  save: jest.fn(),
};

describe('RAGService', () => {
  let ragService: RAGService;

  beforeEach(() => {
    jest.clearAllMocks();
    ragService = new RAGService();
    // Mock vectorService dependency injection if possible, or mock the module
    (vectorService.addDocument as jest.Mock) = mockVectorService.addDocument;
    (vectorService.search as jest.Mock) = mockVectorService.search;
    (vectorService.save as jest.Mock) = mockVectorService.save;
  });

  it('should call indexCodebase and add documents', async () => {
    // Mock file system
    (fs.promises.readdir as jest.Mock).mockResolvedValue([{ name: 'test.txt', isDirectory: () => false }]);
    (fs.promises.readFile as jest.Mock).mockResolvedValue('content');
    
    // Mock chatService
    (chatService.getEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2]);

    await ragService.indexCodebase('/mockdir');
    
    expect(chatService.getEmbedding).toHaveBeenCalledWith('content');
    expect(vectorService.addDocument).toHaveBeenCalled();
    expect(vectorService.save).toHaveBeenCalled();
  });

  it('should call search and return results', async () => {
    (chatService.getEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2]);
    (vectorService.search as jest.Mock).mockResolvedValue([{ id: '1', embedding: [0.1, 0.2], content: 'foo' }]);
    
    const result = await ragService.search('foo');
    
    expect(chatService.getEmbedding).toHaveBeenCalledWith('foo');
    expect(vectorService.search).toHaveBeenCalledWith([0.1, 0.2], 5);
    expect(result[0].content).toBe('foo');
  });
});
