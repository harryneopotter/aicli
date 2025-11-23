import { contextService } from "./context.service";
import { mcpService } from "./mcp.service";
import { docsService } from "./docs.service";
import { logger } from "./logger.service";

export interface Tool {
    name: string;
    description: string;
    usage: string;
    execute: (args: any) => Promise<string>;
}

export class ToolService {
    private tools: Tool[] = [];

    constructor() {
        this.registerTools();
    }

    private registerTools() {
        this.tools = [
            {
                name: "exec",
                description: "Execute a shell command. Use this to run system commands, git, etc.",
                usage: '{"name": "exec", "arguments": {"command": "ls -la"}}',
                execute: async (args: any) => {
                    const command = typeof args === 'string' ? args : args.command;
                    if (!command) {return "Error: Missing 'command' argument";}

                    const result = await contextService.executeCommand(command);
                    if (result.error) {
                        return `Error: ${result.error}\nOutput: ${result.output}`;
                    }
                    return result.output || "(No output)";
                },
            },
            {
                name: "read_file",
                description: "Read the contents of a file.",
                usage: '{"name": "read_file", "arguments": {"path": "path/to/file"}}',
                execute: async (args: any) => {
                    const filePath = typeof args === 'string' ? args : args.path;
                    if (!filePath) {return "Error: Missing 'path' argument";}

                    try {
                        return await contextService.readFile(filePath);
                    } catch (error: any) {
                        return `Error reading file: ${error.message}`;
                    }
                },
            },
            {
                name: "write_file",
                description: "Write content to a file. Overwrites existing content.",
                usage: '{"name": "write_file", "arguments": {"path": "path/to/file", "content": "file content"}}',
                execute: async (args: any) => {
                    let filePath, content;

                    if (typeof args === 'string') {
                        // Legacy/Fallback parsing for string args if needed, but we prefer object
                        return "Error: Please use JSON arguments with 'path' and 'content' fields.";
                    } else {
                        filePath = args.path;
                        content = args.content;
                    }

                    if (!filePath || content === undefined) {return "Error: Missing 'path' or 'content' argument";}

                    try {
                        await contextService.writeFile(filePath, content);
                        return `Successfully wrote to ${filePath}`;
                    } catch (error: any) {
                        return `Error writing file: ${error.message}`;
                    }
                },
            },
            {
                name: "list_files",
                description: "List files in a directory.",
                usage: '{"name": "list_files", "arguments": {"path": "path/to/directory"}}',
                execute: async (args: any) => {
                    const dirPath = (typeof args === 'string' ? args : args.path) || ".";
                    try {
                        const files = await contextService.listFiles(dirPath);
                        return files.join("\n") || "(Empty directory)";
                    } catch (error: any) {
                        return `Error listing files: ${error.message}`;
                    }
                },
            },
            {
                name: "search_code",
                description: "Search the codebase for relevant code snippets using semantic search.",
                usage: '{"name": "search_code", "arguments": {"query": "how is authentication handled?"}}',
                execute: async (args: any) => {
                    const query = typeof args === 'string' ? args : args.query;
                    if (!query) {return "Error: Missing 'query' argument";}

                    try {
                        // Dynamic import to avoid circular dependency if any, or just import at top
                        const { ragService } = require('./rag.service');
                        const results = await ragService.search(query);
                        if (results.length === 0) {return "No relevant code found. Try running /index first.";}

                        return results.map((r: any) => `File: ${r.metadata.filePath}\nContent:\n${r.content}\n---\n`).join("\n");
                    } catch (error: any) {
                        return `Error searching code: ${error.message}`;
                    }
                },
            },
            {
                name: "log_activity",
                description: "Log a significant activity or change to the project's changelog. Use this when you complete a task or make a meaningful change.",
                usage: '{"name": "log_activity", "arguments": {"title": "Implemented Feature X", "details": "Added X, Y, Z components...", "files": ["src/feat/x.ts"]}}',
                execute: async (args: any) => {
                    const title = args.title;
                    const details = args.details;
                    const files = args.files || [];

                    if (!title || !details) {return "Error: Missing 'title' or 'details' argument";}

                    try {
                        await docsService.logActivity(title, details, files);
                        return "Activity logged successfully.";
                    } catch (error: any) {
                        return `Error logging activity: ${error.message}`;
                    }
                },
            },
        ];
    }



    getTools(): Tool[] {
        return this.tools;
    }

    getTool(name: string): Tool | undefined {
        return this.tools.find((t) => t.name === name);
    }

    getSystemPromptAddition(): string {
        let prompt = "TOOLS AVAILABLE:\n";
        prompt += "You can use the following tools to perform actions. To use a tool, you MUST output a JSON object wrapped in <tool_code> tags.\n";
        prompt += "Format:\n<tool_code>\n{\n  \"name\": \"tool_name\",\n  \"arguments\": {\n    \"arg_name\": \"value\"\n  }\n}\n</tool_code>\n\n";

        for (const tool of this.tools) {
            prompt += `- ${tool.name}: ${tool.description}\n  Usage: ${tool.usage}\n`;
        }

        prompt += "\nExample:\nUser: List files in src\nAssistant: I will list the files.\n<tool_code>\n{\n  \"name\": \"list_files\",\n  \"arguments\": {\n    \"path\": \"src\"\n  }\n}\n</tool_code>\nSystem: [Output of ls]\nAssistant: I see the files...\n";
        return prompt;
    }

    parseToolCall(content: string): { name: string; args: any } | null {
        const match = content.match(/<tool_code>([\s\S]*?)<\/tool_code>/);
        if (!match) {return null;}

        try {
            const jsonStr = match[1].trim();
            const parsed = JSON.parse(jsonStr);
            return {
                name: parsed.name,
                args: parsed.arguments
            };
        } catch (e: any) {
            logger.error('Failed to parse tool call JSON', { error: e.message });
            return null;
        }
    }

    async registerMCPTools(serverNames: string[]) {
        for (const serverName of serverNames) {
            try {
                const tools = await mcpService.listTools(serverName);
                for (const tool of tools) {
                    // Avoid duplicates
                    const existingIndex = this.tools.findIndex(t => t.name === tool.name);
                    const newTool: Tool = {
                        name: tool.name,
                        description: tool.description || "No description provided",
                        usage: JSON.stringify({
                            name: tool.name,
                            arguments: tool.inputSchema?.properties || {}
                        }),
                        execute: async (args: any) => {
                            try {
                                const result = await mcpService.callTool(serverName, tool.name, args);
                                // Result content is usually an array of text/image content
                                if (Array.isArray(result)) {
                                    return result.map((c: any) => c.text || "").join("\n");
                                }
                                return typeof result === 'string' ? result : JSON.stringify(result);
                            } catch (e: any) {
                                return `Error calling MCP tool ${tool.name}: ${e.message}`;
                            }
                        }
                    };

                    if (existingIndex >= 0) {
                        this.tools[existingIndex] = newTool;
                    } else {
                        this.tools.push(newTool);
                    }
                }
                logger.info('Registered MCP tools', { server: serverName, count: tools.length });
            } catch (e: any) {
                logger.error('Failed to register MCP tools', { server: serverName, error: e.message });
            }
        }
    }
}

export const toolService = new ToolService();
