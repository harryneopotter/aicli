import * as fs from 'fs/promises';
import * as path from 'path';
import { uiEvents } from '../events/ui-events';

export class DocsService {
    private docsDir: string;

    constructor() {
        this.docsDir = path.join(process.cwd(), '.aicli');
    }

    async init(): Promise<void> {
        await fs.mkdir(this.docsDir, { recursive: true });

        const files = [
            {
                name: 'design.md',
                content: '# Project Design & Architecture\n\n## Overview\n[Describe the project goal and architecture here]\n\n## Components\n- [Component 1]\n- [Component 2]\n'
            },
            {
                name: 'changelog.md',
                content: '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n'
            },
            {
                name: 'changes.md',
                content: '# Changes Index\n\nList of recent changes for quick context.\n\n'
            },
            {
                name: 'agent.md',
                content: '# Agent Rules\n\nDefine rules for the AI agent here.\n\n1. Always log changes to changelog.md and changes.md before completing a task.\n'
            }
        ];

        for (const file of files) {
            const filePath = path.join(this.docsDir, file.name);
            try {
                await fs.access(filePath);
                uiEvents.emitInfo(`File exists: ${file.name}`);
            } catch {
                await fs.writeFile(filePath, file.content, 'utf8');
                uiEvents.emitSuccess(`Created: ${file.name}`);
            }
        }
    }

    async logActivity(title: string, details: string, files: string[]): Promise<void> {
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];

        // Update changelog.md
        const changelogEntry = `\n## [${dateStr}] ${title}\n\n${details}\n\n**Modified Files:**\n${files.map(f => `- ${f}`).join('\n')}\n`;
        await this.appendToFile('changelog.md', changelogEntry);

        // Update changes.md
        const changesEntry = `- [${dateStr}] ${title}\n`;
        await this.appendToFile('changes.md', changesEntry);
    }

    async getAgentRules(): Promise<string> {
        return this.readFile('agent.md');
    }

    async getRecentChanges(lines: number = 20): Promise<string> {
        const content = await this.readFile('changes.md');
        if (!content) {return '';}
        const allLines = content.split('\n');
        return allLines.slice(-lines).join('\n');
    }

    async getDesignDoc(): Promise<string> {
        return this.readFile('design.md');
    }

    async getChangelog(): Promise<string> {
        return this.readFile('changelog.md');
    }

    async ensureDocsDirectory(): Promise<void> {
        await this.init();
    }

    private async appendToFile(filename: string, content: string): Promise<void> {
        const filePath = path.join(this.docsDir, filename);
        try {
            await fs.appendFile(filePath, content, 'utf8');
        } catch (error) {
            // If file doesn't exist, try to create it (though init should have handled it)
            try {
                await fs.writeFile(filePath, content, 'utf8');
            } catch {
                // Ignore errors if we can't write (e.g. permissions)
            }
        }
    }

    private async readFile(filename: string): Promise<string> {
        try {
            const filePath = path.join(this.docsDir, filename);
            return await fs.readFile(filePath, 'utf8');
        } catch {
            return '';
        }
    }
}

export const docsService = new DocsService();
