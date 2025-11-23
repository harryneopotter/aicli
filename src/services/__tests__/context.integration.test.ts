import { contextService } from '../context.service';
import { docsService } from '../docs.service';

// Mock docsService
jest.mock('../docs.service', () => ({
    docsService: {
        getAgentRules: jest.fn(),
        getRecentChanges: jest.fn(),
    },
}));

const mockDocsService = docsService as jest.Mocked<typeof docsService>;

describe('ContextService Integration with DocsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getContext', () => {
        it('should include docs in context when available', async () => {
            const mockRules = '# Agent Rules\n\n1. Always log changes';
            const mockChanges = '- [2024-01-01] Feature X\n- [2024-01-02] Feature Y';

            mockDocsService.getAgentRules.mockResolvedValue(mockRules);
            mockDocsService.getRecentChanges.mockResolvedValue(mockChanges);

            const context = await contextService.getContext();

            expect(context.docs).toBeDefined();
            expect(context.docs?.rules).toBe(mockRules);
            expect(context.docs?.recentChanges).toBe(mockChanges);
        });

        it('should handle missing documentation gracefully', async () => {
            mockDocsService.getAgentRules.mockResolvedValue('');
            mockDocsService.getRecentChanges.mockResolvedValue('');

            const context = await contextService.getContext();

            expect(context.docs).toBeUndefined();
        });

        it('should handle docsService errors gracefully', async () => {
            mockDocsService.getAgentRules.mockRejectedValue(new Error('File not found'));
            mockDocsService.getRecentChanges.mockRejectedValue(new Error('File not found'));

            const context = await contextService.getContext();

            // Should not throw and should not have docs
            expect(context.docs).toBeUndefined();
        });

        it('should include other context properties', async () => {
            mockDocsService.getAgentRules.mockResolvedValue('');
            mockDocsService.getRecentChanges.mockResolvedValue('');

            const context = await contextService.getContext();

            expect(context.cwd).toBeDefined();
            expect(context.system).toBeDefined();
            expect(context.history).toBeDefined();
        });
    });

    describe('buildSystemPrompt', () => {
        it('should include docs in system prompt when available', () => {
            const mockContext = {
                cwd: '/test/project',
                system: {
                    os: 'Windows_NT',
                    platform: 'win32',
                    shell: 'powershell.exe',
                },
                history: {
                    commands: [],
                    outputs: [],
                },
                project: {
                    type: 'Node.js',
                    name: 'test-project',
                    version: '1.0.0',
                },
                docs: {
                    rules: '# Agent Rules\n\n1. Always log changes',
                    recentChanges: '- [2024-01-01] Feature X',
                },
            };

            const prompt = contextService.buildSystemPrompt(mockContext as any);

            expect(prompt).toContain('Project Rules:');
            expect(prompt).toContain('Always log changes');
            expect(prompt).toContain('Recent Changes:');
            expect(prompt).toContain('Feature X');
        });

        it('should not include docs section when docs are missing', () => {
            const mockContext = {
                cwd: '/test/project',
                system: {
                    os: 'Windows_NT',
                    platform: 'win32',
                    shell: 'powershell.exe',
                },
                history: {
                    commands: [],
                    outputs: [],
                },
            };

            const prompt = contextService.buildSystemPrompt(mockContext as any);

            expect(prompt).not.toContain('Project Rules:');
            expect(prompt).not.toContain('Recent Changes:');
        });

        it('should include only rules when changes are missing', () => {
            const mockContext = {
                cwd: '/test/project',
                system: {
                    os: 'Windows_NT',
                    platform: 'win32',
                    shell: 'powershell.exe',
                },
                history: {
                    commands: [],
                    outputs: [],
                },
                project: {
                    type: 'Node.js',
                    name: 'test-project',
                    version: '1.0.0',
                },
                docs: {
                    rules: '# Agent Rules\n\n1. Always log changes',
                },
            };

            const prompt = contextService.buildSystemPrompt(mockContext as any);

            expect(prompt).toContain('Project Rules:');
            expect(prompt).not.toContain('Recent Changes:');
        });
    });
});
