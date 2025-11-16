import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ContextData } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateCommand, sanitizeErrorMessage } from '../utils/security';
import { auditService } from './audit.service';

const execAsync = promisify(exec);

export class ContextService {
  private git: SimpleGit;
  private commandHistory: string[] = [];
  private outputHistory: string[] = [];
  private maxHistory = 50;

  constructor() {
    this.git = simpleGit();
  }

  async getContext(): Promise<ContextData> {
    const cwd = process.cwd();

    const context: ContextData = {
      cwd,
      system: await this.getSystemInfo(),
      history: {
        commands: this.commandHistory.slice(-10),
        outputs: this.outputHistory.slice(-5)
      }
    };

    // Try to get git info
    try {
      const gitInfo = await this.getGitInfo();
      if (gitInfo) {
        context.git = gitInfo;
      }
    } catch {
      // Not a git repo or git not available
    }

    // Try to get project info
    try {
      const projectInfo = await this.getProjectInfo(cwd);
      if (projectInfo) {
        context.project = projectInfo;
      }
    } catch {
      // No project file found
    }

    return context;
  }

  private async getSystemInfo() {
    const shell = process.env.SHELL || 'unknown';

    return {
      os: os.type(),
      platform: os.platform(),
      shell: path.basename(shell)
    };
  }

  private async getGitInfo() {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) return undefined;

      const status = await this.git.status();
      const remotes = await this.git.getRemotes(true);

      return {
        branch: status.current || 'unknown',
        status: this.formatGitStatus(status),
        remotes: remotes.map(r => `${r.name}: ${r.refs.fetch}`)
      };
    } catch {
      return undefined;
    }
  }

  private formatGitStatus(status: any): string {
    if (status.files.length === 0) {
      return 'clean';
    }

    const parts = [];
    if (status.modified.length > 0) parts.push(`${status.modified.length} modified`);
    if (status.created.length > 0) parts.push(`${status.created.length} new`);
    if (status.deleted.length > 0) parts.push(`${status.deleted.length} deleted`);

    return parts.join(', ');
  }

  private async getProjectInfo(cwd: string) {
    // Check for various project types
    const projectFiles = [
      { file: 'package.json', type: 'Node.js', parser: this.parsePackageJson.bind(this) },
      { file: 'Cargo.toml', type: 'Rust', parser: this.parseCargoToml.bind(this) },
      { file: 'go.mod', type: 'Go', parser: this.parseGoMod.bind(this) },
      { file: 'pyproject.toml', type: 'Python', parser: this.parsePyProject.bind(this) },
      { file: 'requirements.txt', type: 'Python', parser: null },
      { file: 'pom.xml', type: 'Java', parser: null },
      { file: 'build.gradle', type: 'Gradle', parser: null }
    ];

    for (const { file, type, parser } of projectFiles) {
      const filePath = path.join(cwd, file);
      if (await this.fileExists(filePath)) {
        const info = parser ? await parser(filePath) : { name: path.basename(cwd), version: 'unknown' };
        return {
          type,
          ...info
        };
      }
    }

    return undefined;
  }

  private async parsePackageJson(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const pkg = JSON.parse(content);
      return {
        name: pkg.name || 'unknown',
        version: pkg.version || 'unknown',
        scripts: Object.keys(pkg.scripts || {})
      };
    } catch {
      return { name: 'unknown', version: 'unknown' };
    }
  }

  private async parseCargoToml(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
      const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
      return {
        name: nameMatch?.[1] || 'unknown',
        version: versionMatch?.[1] || 'unknown'
      };
    } catch {
      return { name: 'unknown', version: 'unknown' };
    }
  }

  private async parseGoMod(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const moduleMatch = content.match(/module\s+([^\s]+)/);
      return {
        name: moduleMatch?.[1]?.split('/').pop() || 'unknown',
        version: 'unknown'
      };
    } catch {
      return { name: 'unknown', version: 'unknown' };
    }
  }

  private async parsePyProject(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
      const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
      return {
        name: nameMatch?.[1] || 'unknown',
        version: versionMatch?.[1] || 'unknown'
      };
    } catch {
      return { name: 'unknown', version: 'unknown' };
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  addCommand(command: string): void {
    this.commandHistory.push(command);
    if (this.commandHistory.length > this.maxHistory) {
      this.commandHistory = this.commandHistory.slice(-this.maxHistory);
    }
  }

  addOutput(output: string): void {
    this.outputHistory.push(output);
    if (this.outputHistory.length > this.maxHistory) {
      this.outputHistory = this.outputHistory.slice(-this.maxHistory);
    }
  }

  clearHistory(): void {
    this.commandHistory = [];
    this.outputHistory = [];
  }

  async executeCommand(command: string): Promise<{ output: string; error?: string }> {
    // Validate command before execution
    const validation = validateCommand(command);

    if (!validation.valid) {
      const errorMsg = `Command validation failed: ${validation.error}`;

      // Log security event
      await auditService.logSecurityEvent(
        'command_validation_failed',
        `Attempted to execute invalid command: ${command}`,
        'failure'
      );

      await auditService.logCommandExecution(
        command,
        'failure',
        'Command validation failed',
        validation.error
      );

      throw new Error(errorMsg);
    }

    this.addCommand(command);

    try {
      // Log command execution attempt
      await auditService.logCommandExecution(
        command,
        'success',
        `Executing in ${process.cwd()}`
      );

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          // Sanitize environment
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });

      const output = stdout + (stderr || '');
      this.addOutput(output);

      // Log successful execution
      await auditService.logCommandExecution(
        command,
        stderr ? 'warning' : 'success',
        `Output length: ${output.length} bytes`,
        stderr || undefined
      );

      return {
        output,
        error: stderr || undefined
      };
    } catch (error: any) {
      const sanitizedError = sanitizeErrorMessage(error.message || 'Command execution failed');
      const errorMsg = `Command execution error: ${sanitizedError}`;

      this.addOutput(errorMsg);

      // Log failed execution with context
      await auditService.logCommandExecution(
        command,
        'failure',
        `Execution failed in ${process.cwd()}`,
        sanitizedError
      );

      return {
        output: error.stdout || '',
        error: errorMsg
      };
    }
  }

  buildSystemPrompt(context: ContextData): string {
    let prompt = `You are an AI coding assistant integrated into a CLI terminal. Be helpful, concise, and practical.\n\n`;
    prompt += `Current Context:\n`;
    prompt += `- Working Directory: ${context.cwd}\n`;
    prompt += `- OS: ${context.system.os} (${context.system.platform})\n`;
    prompt += `- Shell: ${context.system.shell}\n`;

    if (context.git) {
      prompt += `\nGit Repository:\n`;
      prompt += `- Branch: ${context.git.branch}\n`;
      prompt += `- Status: ${context.git.status}\n`;
    }

    if (context.project) {
      prompt += `\nProject:\n`;
      prompt += `- Type: ${context.project.type}\n`;
      prompt += `- Name: ${context.project.name}\n`;
      prompt += `- Version: ${context.project.version}\n`;
      if (context.project.scripts && context.project.scripts.length > 0) {
        prompt += `- Scripts: ${context.project.scripts.join(', ')}\n`;
      }
    }

    if (context.history.commands.length > 0) {
      prompt += `\nRecent Commands:\n`;
      context.history.commands.forEach((cmd, i) => {
        prompt += `${i + 1}. ${cmd}\n`;
      });
    }

    prompt += `\nCapabilities:\n`;
    prompt += `- Answer coding questions\n`;
    prompt += `- Explain commands and errors\n`;
    prompt += `- Suggest commands for tasks\n`;
    prompt += `- Help with debugging\n`;
    prompt += `- Provide code examples\n`;
    prompt += `- Execute shell commands (when requested with /exec)\n`;

    return prompt;
  }
}

export const contextService = new ContextService();
