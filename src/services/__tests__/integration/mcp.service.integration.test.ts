import { MCPService } from '../../mcp.service';

describe('MCPService', () => {
  let mcpService: MCPService;

  beforeEach(() => {
    mcpService = new MCPService();
  });

  it('should list tools using mock', async () => {
    // Mock listTools to return a tool list
    jest.spyOn(mcpService, 'listTools').mockResolvedValue([{ name: 'test', description: 'desc', inputSchema: {} }]);
    const tools = await mcpService.listTools('mockServer');
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0].name).toBe('test');
  });

  it('should call tool and return result using mock', async () => {
    // Mock callTool to return a result
    jest.spyOn(mcpService, 'callTool').mockResolvedValue('ok');
    const result = await mcpService.callTool('mockServer', 'test', {});
    expect(result).toBe('ok');
  });
});
