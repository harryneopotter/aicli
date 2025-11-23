import { v4 as uuidv4 } from "uuid";
import { Message } from "../types";

interface MemoryItem {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export class MemoryService {
  private memories: MemoryItem[] = [];

  async addMemory(
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Stub: In real impl, generate embedding via Ollama/OpenAI
    this.memories.push({
      id: uuidv4(),
      content,
      embedding: new Array(384).fill(0.5), // Mock embedding dimension
      metadata,
    });
  }

  async searchMemory(_query: string, _topK: number = 5): Promise<Message[]> {
    // Stub: return empty list, real impl uses vector DB
    return Promise.resolve([]);
  }

  async getRelevantContext(query: string): Promise<string> {
    const results = await this.searchMemory(query);
    return results.map((m) => m.content).join("\n\n");
  }

  async deleteMemory(id: string): Promise<void> {
    this.memories = this.memories.filter((m) => m.id !== id);
  }

  clear(): void {
    this.memories = [];
  }

  getMemoryCount(): number {
    return this.memories.length;
  }
}

export const memoryService = new MemoryService();
