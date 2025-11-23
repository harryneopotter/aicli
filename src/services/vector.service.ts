import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { logger } from './logger.service';

export interface VectorDocument {
    id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
}

export class VectorService {
    private store: VectorDocument[] = [];
    private indexPath: string = "";

    constructor() {
        // Initialize path based on CWD
        this.setProject(process.cwd());
    }

    setProject(projectPath: string) {
        const hash = crypto.createHash('md5').update(projectPath).digest('hex');
        const homeDir = os.homedir();
        const indexDir = path.join(homeDir, '.aicli', 'indexes', hash);

        if (!fs.existsSync(indexDir)) {
            fs.mkdirSync(indexDir, { recursive: true });
        }

        this.indexPath = path.join(indexDir, 'vectors.json');
        this.load();
    }

    async addDocument(doc: VectorDocument) {
        // Remove existing doc with same ID if any
        this.store = this.store.filter(d => d.id !== doc.id);
        this.store.push(doc);
    }

    async addDocuments(docs: VectorDocument[]) {
        for (const doc of docs) {
            await this.addDocument(doc);
        }
        await this.save();
    }

    async search(queryVector: number[], k: number = 5): Promise<VectorDocument[]> {
        if (this.store.length === 0) {return [];}

        const scored = this.store.map(doc => ({
            doc,
            score: this.cosineSimilarity(queryVector, doc.embedding)
        }));

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, k).map(s => s.doc);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async save() {
        await fs.promises.writeFile(this.indexPath, JSON.stringify(this.store), 'utf8');
    }

    async load() {
        if (fs.existsSync(this.indexPath)) {
            try {
                const data = await fs.promises.readFile(this.indexPath, 'utf8');
                this.store = JSON.parse(data);
            } catch (e: any) {
                logger.error('Failed to load vector index', { error: e.message });
                this.store = [];
            }
        } else {
            this.store = [];
        }
    }

    clear() {
        this.store = [];
        if (fs.existsSync(this.indexPath)) {
            fs.unlinkSync(this.indexPath);
        }
    }
}

export const vectorService = new VectorService();
