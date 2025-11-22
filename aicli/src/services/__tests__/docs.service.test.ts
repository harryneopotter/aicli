import { DocsService } from '../docs.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock the fs/promises module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock uiRenderer
jest.mock('../../ui/renderer', () => ({
    uiRenderer: {
        renderInfo: jest.fn(),
        renderSuccess: jest.fn(),
    },
}));

describe('DocsService', () => {
    let docsService: DocsService;
    const testDocsDir = path.join(process.cwd(), '.aicli');

    beforeEach(() => {
        jest.clearAllMocks();
        docsService = new DocsService();
    });

    describe('init', () => {
        it('should create .aicli directory', async () => {
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.writeFile.mockResolvedValue(undefined);

            await docsService.init();

            expect(mockFs.mkdir).toHaveBeenCalledWith(testDocsDir, { recursive: true });
        });

        it('should create all documentation files', async () => {
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.writeFile.mockResolvedValue(undefined);

            await docsService.init();

            const expectedFiles = ['design.md', 'changelog.md', 'changes.md', 'agent.md'];

            expect(mockFs.writeFile).toHaveBeenCalledTimes(4);
            expectedFiles.forEach(fileName => {
                expect(mockFs.writeFile).toHaveBeenCalledWith(
                    path.join(testDocsDir, fileName),
                    expect.any(String),
                    'utf8'
                );
            });
        });

        it('should not overwrite existing files', async () => {
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.access.mockResolvedValue(undefined); // File exists
            mockFs.writeFile.mockResolvedValue(undefined);

            await docsService.init();

            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('logActivity', () => {
        it('should append to changelog.md and changes.md', async () => {
            mockFs.appendFile.mockResolvedValue(undefined);

            const title = 'Test Feature';
            const details = 'Implemented test feature';
            const files = ['src/test.ts', 'src/test.spec.ts'];

            await docsService.logActivity(title, details, files);

            expect(mockFs.appendFile).toHaveBeenCalledTimes(2);

            // Check changelog entry
            expect(mockFs.appendFile).toHaveBeenCalledWith(
                path.join(testDocsDir, 'changelog.md'),
                expect.stringContaining(title),
                'utf8'
            );

            // Check changes entry
            expect(mockFs.appendFile).toHaveBeenCalledWith(
                path.join(testDocsDir, 'changes.md'),
                expect.stringContaining(title),
                'utf8'
            );
        });

        it('should include file list in changelog', async () => {
            mockFs.appendFile.mockResolvedValue(undefined);

            const files = ['src/file1.ts', 'src/file2.ts'];
            await docsService.logActivity('Test', 'Details', files);

            const changelogCall = (mockFs.appendFile as jest.Mock).mock.calls.find(
                call => call[0].includes('changelog.md')
            );

            expect(changelogCall[1]).toContain('src/file1.ts');
            expect(changelogCall[1]).toContain('src/file2.ts');
        });
    });

    describe('getAgentRules', () => {
        it('should read agent.md file', async () => {
            const mockContent = '# Agent Rules\n\n1. Rule 1\n2. Rule 2';
            mockFs.readFile.mockResolvedValue(mockContent);

            const result = await docsService.getAgentRules();

            expect(mockFs.readFile).toHaveBeenCalledWith(
                path.join(testDocsDir, 'agent.md'),
                'utf8'
            );
            expect(result).toBe(mockContent);
        });

        it('should return empty string if file does not exist', async () => {
            mockFs.readFile.mockRejectedValue(new Error('File not found'));

            const result = await docsService.getAgentRules();

            expect(result).toBe('');
        });
    });

    describe('getRecentChanges', () => {
        it('should return last N lines from changes.md', async () => {
            const mockContent = Array.from({ length: 30 }, (_, i) => `- Change ${i + 1}`).join('\n');
            mockFs.readFile.mockResolvedValue(mockContent);

            const result = await docsService.getRecentChanges(10);

            expect(result.split('\n').length).toBeLessThanOrEqual(10);
        });

        it('should default to 20 lines', async () => {
            const mockContent = Array.from({ length: 30 }, (_, i) => `- Change ${i + 1}`).join('\n');
            mockFs.readFile.mockResolvedValue(mockContent);

            const result = await docsService.getRecentChanges();

            expect(result.split('\n').length).toBeLessThanOrEqual(20);
        });

        it('should return empty string if file does not exist', async () => {
            mockFs.readFile.mockRejectedValue(new Error('File not found'));

            const result = await docsService.getRecentChanges();

            expect(result).toBe('');
        });
    });

    describe('getDesignDoc', () => {
        it('should read design.md file', async () => {
            const mockContent = '# Project Design\n\nArchitecture details...';
            mockFs.readFile.mockResolvedValue(mockContent);

            const result = await docsService.getDesignDoc();

            expect(mockFs.readFile).toHaveBeenCalledWith(
                path.join(testDocsDir, 'design.md'),
                'utf8'
            );
            expect(result).toBe(mockContent);
        });
    });

    describe('getChangelog', () => {
        it('should read changelog.md file', async () => {
            const mockContent = '# Changelog\n\n## [2024-01-01] Feature X\n\nDetails...';
            mockFs.readFile.mockResolvedValue(mockContent);

            const result = await docsService.getChangelog();

            expect(mockFs.readFile).toHaveBeenCalledWith(
                path.join(testDocsDir, 'changelog.md'),
                'utf8'
            );
            expect(result).toBe(mockContent);
        });
    });

    describe('ensureDocsDirectory', () => {
        it('should call init method', async () => {
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.writeFile.mockResolvedValue(undefined);

            await docsService.ensureDocsDirectory();

            expect(mockFs.mkdir).toHaveBeenCalledWith(testDocsDir, { recursive: true });
        });
    });
});
