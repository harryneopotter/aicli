import * as fs from 'fs';
import * as path from 'path';
import { chatService } from './chat.service';
import { vectorService } from './vector.service';

export class RAGService {
    private readonly IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.aicli', '.vscode', '.idea', 'out', 'bin', 'obj'];
    private readonly IGNORE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.wav', '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.war', '.ear', '.pyc', '.pyo', '.pyd', '.o', '.obj', '.a', '.lib', '.iso', '.img', '.dmg', '.pkg', '.deb', '.rpm', '.msi', '.apk', '.ipa', '.lock', '-lock.json', '.log', '.map'];

    async indexCodebase(dir: string = process.cwd(), progressCallback?: (msg: string) => void) {
        const files = await this.getFiles(dir);
        let processed = 0;

        for (const file of files) {
            if (progressCallback) progressCallback(`Indexing ${processed + 1}/${files.length}: ${path.relative(dir, file)}`);

            try {
                const content = await fs.promises.readFile(file, 'utf8');
                const chunks = this.chunkContent(content, 1000); // 1000 chars per chunk

                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    // Skip empty chunks
                    if (!chunk.trim()) continue;

                    const embedding = await chatService.getEmbedding(chunk);

                    await vectorService.addDocument({
                        id: `${file}:${i}`,
                        content: chunk,
                        embedding,
                        metadata: {
                            filePath: file,
                            chunkIndex: i,
                            totalChunks: chunks.length
                        }
                    });
                }
            } catch (e) {
                console.error(`Failed to index ${file}:`, e);
            }
            processed++;
        }

        await vectorService.save();
    }

    async search(query: string, k: number = 5) {
        const embedding = await chatService.getEmbedding(query);
        return await vectorService.search(embedding, k);
    }

    private async getFiles(dir: string): Promise<string[]> {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const files: string[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (!this.IGNORE_DIRS.includes(entry.name)) {
                    files.push(...await this.getFiles(fullPath));
                }
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                if (!this.IGNORE_EXTS.includes(ext) && !entry.name.startsWith('.')) {
                    files.push(fullPath);
                }
            }
        }
        return files;
    }

    private chunkContent(content: string, chunkSize: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < content.length; i += chunkSize) {
            chunks.push(content.slice(i, i + chunkSize));
        }
        return chunks;
    }
}

export const ragService = new RAGService();
