import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

export interface Agent {
  name: string;
  description: string;
  content: string;
  color: string;
}

export interface AgentSummary {
  name: string;
  description: string;
}

class AgentService {
  private agents: Map<string, Agent> = new Map();
  private currentAgent: Agent | null = null;
  private agentsDir: string;

  constructor() {
    // Assuming the 'agents' directory is at the root of the aicli project
    this.agentsDir = path.resolve(process.cwd(), "../agents");
    this.loadAgents();
  }

  private loadAgents() {
    if (!fs.existsSync(this.agentsDir)) {
      return;
    }

    const files = fs.readdirSync(this.agentsDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        try {
          const filePath = path.join(this.agentsDir, file);
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const { data, content } = matter(fileContent);

          if (data.name && content) {
            const agent: Agent = {
              name: data.name,
              description: data.description || "No description provided.",
              color: data.color || "white",
              content: content.trim(),
            };
            this.agents.set(agent.name.toLowerCase(), agent);
          }
        } catch (error) {
          console.error(`Failed to load agent from ${file}:`, error);
        }
      }
    }
  }

  listAgents(): AgentSummary[] {
    return Array.from(this.agents.values()).map(({ name, description }) => ({
      name,
      description,
    }));
  }

  setCurrentAgent(agentName: string | null): Agent | null {
    if (agentName === null) {
      this.currentAgent = null;
      return null;
    }

    const agent = this.agents.get(agentName.toLowerCase());
    if (agent) {
      this.currentAgent = agent;
      return agent;
    }

    throw new Error(`Agent not found: ${agentName}`);
  }

  getCurrentAgent(): Agent | null {
    return this.currentAgent;
  }
}

export const agentService = new AgentService();
