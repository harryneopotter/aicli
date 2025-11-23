import { toolService } from '../tool.service';
import { docsService } from '../docs.service';

// Mock docsService
jest.mock('../docs.service', () => ({
    docsService: {
        logActivity: jest.fn(),
    },
}));

const mockDocsService = docsService as jest.Mocked<typeof docsService>;

describe('ToolService - log_activity Tool', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('log_activity tool', () => {
        it('should be registered in tools list', () => {
            const tools = toolService.getTools();
            const logActivityTool = tools.find(t => t.name === 'log_activity');

            expect(logActivityTool).toBeDefined();
            expect(logActivityTool?.description).toContain('Log a significant activity');
        });

        it('should execute successfully with valid arguments', async () => {
            mockDocsService.logActivity.mockResolvedValue(undefined);

            const tool = toolService.getTool('log_activity');
            const result = await tool?.execute({
                title: 'Test Feature',
                details: 'Implemented test feature',
                files: ['src/test.ts'],
            });

            expect(mockDocsService.logActivity).toHaveBeenCalledWith(
                'Test Feature',
                'Implemented test feature',
                ['src/test.ts']
            );
            expect(result).toBe('Activity logged successfully.');
        });

        it('should handle missing title', async () => {
            const tool = toolService.getTool('log_activity');
            const result = await tool?.execute({
                details: 'Some details',
                files: [],
            });

            expect(result).toContain('Error: Missing');
            expect(mockDocsService.logActivity).not.toHaveBeenCalled();
        });

        it('should handle missing details', async () => {
            const tool = toolService.getTool('log_activity');
            const result = await tool?.execute({
                title: 'Test',
                files: [],
            });

            expect(result).toContain('Error: Missing');
            expect(mockDocsService.logActivity).not.toHaveBeenCalled();
        });

        it('should default to empty array for files', async () => {
            mockDocsService.logActivity.mockResolvedValue(undefined);

            const tool = toolService.getTool('log_activity');
            await tool?.execute({
                title: 'Test',
                details: 'Details',
            });

            expect(mockDocsService.logActivity).toHaveBeenCalledWith(
                'Test',
                'Details',
                []
            );
        });

        it('should handle docsService errors', async () => {
            mockDocsService.logActivity.mockRejectedValue(new Error('Write failed'));

            const tool = toolService.getTool('log_activity');
            const result = await tool?.execute({
                title: 'Test',
                details: 'Details',
                files: [],
            });

            expect(result).toContain('Error logging activity');
            expect(result).toContain('Write failed');
        });
    });
});
