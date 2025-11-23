import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import { logger } from './logger.service';

export interface MCPTool {
    name: string;
    description?: string;
    inputSchema: any;
}

export class MCPService {
    private servers: Map<string, ChildProcess> = new Map();
    private httpServers: Map<string, { url: string, apiKey: string }> = new Map();
    private requestCounter = 0;
    private pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();

    async connect(name: string, command: string, args: string[] = [], env?: Record<string, string>) {
        logger.info('Connecting to MCP server', { name, command, args });
        const cp = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'inherit'],
            env: env ? { ...process.env, ...env } : process.env
        });
        this.servers.set(name, cp);

        cp.stdout?.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (!line.trim()) {continue;}
                try {
                    const msg = JSON.parse(line);
                    this.handleMessage(msg);
                } catch (e) {
                    // Ignore non-JSON lines
                }
            }
        });

        cp.on('error', (err) => {
            logger.error('MCP Server error', { name, error: err.message });
        });

        // Initialize handshake
        try {
            await this.request(name, "initialize", {
                protocolVersion: "0.1.0",
                capabilities: { tools: {} },
                clientInfo: { name: "aicli", version: "1.0.0" }
            });
            await this.notify(name, "notifications/initialized");
        } catch (e) {
            logger.error('Failed to initialize MCP server', { name, error: (e as Error).message });
        }
    }

    private handleMessage(msg: any) {
        if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
            const { resolve, reject } = this.pendingRequests.get(msg.id)!;
            this.pendingRequests.delete(msg.id);
            if (msg.error) {reject(msg.error);}
            else {resolve(msg.result);}
        }
    }

    private async request(serverName: string, method: string, params?: any) {
        const cp = this.servers.get(serverName);
        if (!cp) {throw new Error(`Server ${serverName} not connected`);}

        const id = this.requestCounter++;
        const msg = { jsonrpc: "2.0", id, method, params };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            cp.stdin?.write(JSON.stringify(msg) + "\n");
        });
    }

    private async notify(serverName: string, method: string, params?: any) {
        const cp = this.servers.get(serverName);
        if (!cp) {return;}

        const msg = { jsonrpc: "2.0", method, params };
        cp.stdin?.write(JSON.stringify(msg) + "\n");
    }

    async listTools(serverName: string): Promise<MCPTool[]> {
        // Check if it's an HTTP server first
        if (this.httpServers.has(serverName)) {
            const res: any = await this.requestHTTP(serverName, "tools/list");
            return res.tools || [];
        }

        // Otherwise use stdio
        const res: any = await this.request(serverName, "tools/list");
        return res.tools || [];
    }

    async callTool(serverName: string, toolName: string, args: any): Promise<any> {
        // Check if it's an HTTP server first
        if (this.httpServers.has(serverName)) {
            const res: any = await this.requestHTTP(serverName, "tools/call", {
                name: toolName,
                arguments: args
            });
            return res.content;
        }

        // Otherwise use stdio
        const res: any = await this.request(serverName, "tools/call", {
            name: toolName,
            arguments: args
        });
        return res.content;
    }

    // HTTP Transport Methods
    async connectHTTP(name: string, url: string, apiKey: string) {
        logger.info('Connecting to HTTP MCP server', { name, url });
        this.httpServers.set(name, { url, apiKey });

        // Initialize handshake via HTTP
        try {
            await this.requestHTTP(name, "initialize", {
                protocolVersion: "0.1.0",
                capabilities: { tools: {} },
                clientInfo: { name: "aicli", version: "1.0.0" }
            });
        } catch (e) {
            logger.error('Failed to initialize HTTP MCP server', { name, error: (e as Error).message });
            this.httpServers.delete(name);
            throw e;
        }
    }

    private async requestHTTP(serverName: string, method: string, params?: any): Promise<any> {
        const server = this.httpServers.get(serverName);
        if (!server) {throw new Error(`HTTP server ${serverName} not connected`);}

        const id = this.requestCounter++;
        const response = await fetch(server.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${server.apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id,
                method,
                params
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP MCP request failed: ${response.status} ${response.statusText}`);
        }

        const result: any = await response.json();
        if (result.error) {
            throw new Error(`MCP error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        return result.result;
    }

    // GLM-Specific Methods
    async connectGLMMCPServers(apiKey: string) {
        logger.info('Connecting to GLM MCP servers');

        try {
            // 1. Connect Vision MCP (stdio with npx)
            await this.connect(
                'zai-vision',
                'npx',
                ['-y', '@z_ai/mcp-server'],
                { Z_AI_API_KEY: apiKey, Z_AI_MODE: 'ZAI' }
            );
            logger.info('Vision MCP connected');
        } catch (e) {
            logger.warn('Failed to connect Vision MCP', { error: (e as Error).message });
        }

        try {
            // 2. Connect Web Search MCP (HTTP)
            await this.connectHTTP(
                'zai-web-search',
                'https://api.z.ai/api/mcp/web_search_prime/mcp',
                apiKey
            );
            logger.info('Web Search MCP connected');
        } catch (e) {
            logger.warn('Failed to connect Web Search MCP', { error: (e as Error).message });
        }

        try {
            // 3. Connect Web Reader MCP (HTTP)
            await this.connectHTTP(
                'zai-web-reader',
                'https://api.z.ai/api/mcp/web_reader/mcp',
                apiKey
            );
            logger.info('Web Reader MCP connected');
        } catch (e) {
            logger.warn('Failed to connect Web Reader MCP', { error: (e as Error).message });
        }
    }

    async disconnectGLMMCPServers() {
        const glmServers = ['zai-vision', 'zai-web-search', 'zai-web-reader'];

        for (const serverName of glmServers) {
            // Disconnect stdio server
            if (this.servers.has(serverName)) {
                const cp = this.servers.get(serverName);
                cp?.kill();
                this.servers.delete(serverName);
                logger.info('Disconnected stdio MCP server', { serverName });
            }

            // Disconnect HTTP server
            if (this.httpServers.has(serverName)) {
                this.httpServers.delete(serverName);
                logger.info('Disconnected HTTP MCP server', { serverName });
            }
        }
    }

    getConnectedServers(): string[] {
        return [
            ...Array.from(this.servers.keys()),
            ...Array.from(this.httpServers.keys())
        ];
    }
}

export const mcpService = new MCPService();
