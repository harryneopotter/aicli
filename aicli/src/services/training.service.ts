import { chatService } from './chat.service';
import { uiRenderer } from '../ui/renderer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface TrainingSample {
  question: string;
  context: string;
  groundTruth: string;
}

interface StrategyBullet {
  id: string;
  description: string;
  promptTemplate: string;
  successRate: number;
  examples: string[];
}

interface Playbook {
  name: string;
  version: string;
  bullets: StrategyBullet[];
  created: Date;
  updated: Date;
}

export class TrainingService {
  private playbookDir: string;

  constructor() {
    this.playbookDir = path.join(process.cwd(), '.aicli', 'playbooks');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.playbookDir, { recursive: true });
  }

  async train(samples: TrainingSample[], playbookName: string = 'default'): Promise<Playbook> {
    await this.initialize();
    uiRenderer.renderLoading('Training agent...');

    const playbook = await this.loadPlaybook(playbookName) || this.createEmptyPlaybook(playbookName);

    for (const sample of samples) {
      await this.processSample(sample, playbook);
    }

    playbook.updated = new Date();
    await this.savePlaybook(playbook);

    uiRenderer.stopLoading();
    uiRenderer.renderSuccess(`Trained! Playbook '${playbookName}' now has ${playbook.bullets.length} strategies.`);

    return playbook;
  }

  private async processSample(sample: TrainingSample, playbook: Playbook): Promise<void> {
    // 1. Generate solution
    const generatePrompt = `Solve this: Q: ${sample.question}\nContext: ${sample.context}`;
    const generation = await chatService.chat(generatePrompt, { streaming: false });

    // 2. Reflect on the solution
    const reflectPrompt = `Critique this solution:\nQ: ${sample.question}\nExpected: ${sample.groundTruth}\nGenerated: ${generation}\n\nWas it correct? What strategy worked or failed?`;
    const reflection = await chatService.chat(reflectPrompt, { streaming: false });

    // 3. Simple evaluation (substring match)
    const isCorrect = generation.toLowerCase().includes(sample.groundTruth.toLowerCase());

    if (isCorrect) {
      // 4. Curate a strategy bullet
      const curatePrompt = `Extract a reusable strategy bullet from this successful solve:\nQ: ${sample.question}\nContext: ${sample.context}\nSolution: ${generation}\nReflection: ${reflection}\n\nRespond in this exact format:\nDescription: [brief description]\nPrompt template: "[reusable prompt template]"`;
      const bulletText = await chatService.chat(curatePrompt, { streaming: false });
      const bullet = this.parseBullet(bulletText);
      playbook.bullets.push(bullet);
    }
  }

  private parseBullet(text: string): StrategyBullet {
    const descriptionMatch = text.match(/Description:\s*(.+)/i);
    const templateMatch = text.match(/Prompt template:\s*["'`](.+?)["'`]/i);

    return {
      id: uuidv4(),
      description: descriptionMatch?.[1]?.trim() || 'Unnamed strategy',
      promptTemplate: templateMatch?.[1]?.trim() || '',
      successRate: 1.0,
      examples: [],
    };
  }

  async loadPlaybook(name: string): Promise<Playbook | null> {
    try {
      const filePath = path.join(this.playbookDir, `${name}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data) as Playbook;
    } catch {
      return null;
    }
  }

  private createEmptyPlaybook(name: string): Playbook {
    return {
      name,
      version: '1.0',
      bullets: [],
      created: new Date(),
      updated: new Date(),
    };
  }

  async savePlaybook(playbook: Playbook): Promise<void> {
    const filePath = path.join(this.playbookDir, `${playbook.name}.json`);
    await fs.writeFile(filePath, JSON.stringify(playbook, null, 2));
  }

  async listPlaybooks(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.playbookDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }


  async exportToPersona(name: string): Promise<void> {
    const playbook = await this.loadPlaybook(name);
    if (!playbook) {
      throw new Error(`Playbook '${name}' not found. Train it first with /train.`);
    }

    const agentsDir = path.resolve(process.cwd(), '../agents');
    await fs.mkdir(agentsDir, { recursive: true });

    const yamlFrontmatter = `---
name: ${playbook.name.replace(/[^a-zA-Z0-9-]/g, '-')}
description: Auto-trained agent playbook (${playbook.bullets.length} strategies)
system_prompt: |
  You are a specialized ${playbook.name} agent. Use these learned strategies:
  ${playbook.bullets.map((b, i) => `${i + 1}. ${b.description}`).join('\n  ')}

  Always apply the best-matching strategy to the user's query.
tools: ["/exec", "/analyze"]
---`;

    const body = playbook.bullets.map(b =>
      `## Strategy: ${b.description}

**Prompt Template**: \`${b.promptTemplate}\`

**Success Rate**: ${b.successRate.toFixed(2)}`
    ).join('\n\n');

    const mdContent = `${yamlFrontmatter.trim()}\n\n${body}`;

    const filePath = path.join(agentsDir, `${name}-persona.md`);
    await fs.writeFile(filePath, mdContent, 'utf8');

    uiRenderer.renderSuccess(`Exported to agents/${name}-persona.md (${playbook.bullets.length} strategies)`);
  }

}

export const trainingService = new TrainingService();
