import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ContextData, ContextFileAttachment } from '../types';
import { execFile } from 'child_process';
import * as readline from 'readline';

// Utility to sanitize error messages (redact secrets)
export function sanitizeError(error: Error | any): string {
  let message = error?.message || String(error);
  // Remove API keys and tokens
  message = message
    .replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED]')
    .replace(/Bearer [a-zA-Z0-9._-]+/g, 'Bearer [REDACTED]')
    .replace(/api[_-]?key[=:][a-zA-Z0-9]+/gi, 'api_key=[REDACTED]');
  return message;
}

export class ContextService {
  private git: SimpleGit;
  private commandHistory: string[] = [];
  private outputHistory: string[] = [];
  private maxHistory = 50;
  private attachments: ContextFileAttachment[] = [];

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
      },
      files: this.listAttachedFiles()
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

  async attachFile(filePath: string, options?: { maxPreviewLines?: number }): Promise<ContextFileAttachment> {
    if (!filePath) {
      throw new Error('Please provide a file path to attach.');
    }

    const resolved = path.resolve(process.cwd(), filePath);
    const stats = await fs.promises.stat(resolved);
    if (!stats.isFile()) {
      throw new Error('Only regular files can be attached to context.');
    }

    const preview = await this.getFilePreview(resolved, options?.maxPreviewLines ?? 20);
    const attachment: ContextFileAttachment = {
      path: path.relative(process.cwd(), resolved) || path.basename(resolved),
      size: stats.size,
      preview,
      updated: stats.mtime.toISOString()
    };

    this.attachments = this.attachments.filter(item => item.path !== attachment.path);
    this.attachments.push(attachment);
    return attachment;
  }

  listAttachedFiles(): ContextFileAttachment[] {
    return [...this.attachments];
  }

  removeAttachedFile(identifier: string): boolean {
    if (!identifier) return false;
    const normalized = this.normalizeAttachmentId(identifier);
    const before = this.attachments.length;
    this.attachments = this.attachments.filter(item => {
      const itemId = item.path.toLowerCase();
      const basename = path.basename(item.path).toLowerCase();
      return itemId !== normalized && basename !== normalized;
    });
    return before !== this.attachments.length;
  }

  clearAttachedFiles(): void {
    this.attachments = [];
  }

  async getDiff(target?: string, options: { staged?: boolean; context?: number } = {}): Promise<string> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Diff is only available inside a git repository.');
    }

    const args = ['diff'];
    if (options.staged) args.push('--staged');
    if (options.context !== undefined) args.push(`-U${options.context}`);
    if (target) {
      args.push('--', target);
    }

    const diff = await this.git.raw(args);
    return diff.trim() || 'No changes detected.';
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

  // Whitelisted commands for /exec
  private static ALLOWED_COMMANDS = [
    'ls', 'pwd', 'cat', 'echo', 'whoami', 'date', 'git', 'npm', 'yarn', 'pnpm', 'node', 'python', 'python3', 'pip', 'pip3', 'cargo', 'go', 'java', 'javac', 'npx', 'tsc', 'make', 'gcc', 'g++', 'clang', 'docker', 'grep', 'find', 'head', 'tail', 'du', 'df', 'free', 'top', 'htop', 'ps', 'kill', 'uname', 'which', 'whereis', 'tree', 'stat', 'chmod', 'chown', 'curl', 'wget', 'ifconfig', 'ip', 'ping', 'traceroute', 'ssh', 'scp', 'rsync', 'zip', 'unzip', 'tar', 'gzip', 'bzip2', 'xz'
  ];

  // Added logging for executed commands
  private logCommandExecution(command: string): void {
    console.log(`[Command Execution] ${command}`);
  }

  async executeCommand(command: string): Promise<{ output: string; error?: string }> {
    this.addCommand(command);
    this.logCommandExecution(command); // Log the command execution

    // Parse command and args
    const [cmd, ...args] = command.trim().split(/\s+/);
    if (!ContextService.ALLOWED_COMMANDS.includes(cmd)) {
      const errorMsg = `Command not allowed: ${cmd}`;
      this.addOutput(errorMsg);
      return { output: '', error: errorMsg };
    }

    // Ask for user confirmation for potentially dangerous commands
    if (["rm", "mv", "dd", "shutdown", "reboot", "kill", "chmod", "chown"].includes(cmd)) {
      const confirmed = await this.promptConfirm(`Are you sure you want to execute: ${command}? (y/N): `);
      if (!confirmed) {
        const msg = 'Command cancelled by user.';
        this.addOutput(msg);
        return { output: msg };
      }
    }

    try {
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        execFile(cmd, args, {
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10,
          timeout: 10000
        }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        });
      });
      const output = result.stdout + (result.stderr || '');
      this.addOutput(output);
      return {
        output,
        error: result.stderr || undefined
      };
    } catch (error: any) {
      const errorMsg = sanitizeError(error) || 'Command execution failed';
      this.addOutput(errorMsg);
      return {
        output: '',
        error: errorMsg
      };
    }
  }

  private async promptConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(message, (answer) => {
        rl.close();
        resolve(/^y(es)?$/i.test(answer.trim()));
      });
    });
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

    if (context.files && context.files.length > 0) {
      prompt += `\nAttached Files:\n`;
      context.files.forEach((file, idx) => {
        prompt += `${idx + 1}. ${file.path} (${file.size} bytes)\n`;
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

  private async getFilePreview(filePath: string, maxLines: number): Promise<string> {
    const handle = await fs.promises.open(filePath, 'r');
    try {
      const stats = await handle.stat();
      const maxBytes = 200_000;
      const length = Math.min(stats.size, maxBytes);
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, 0);
      return buffer
        .toString('utf8')
        .split(/\r?\n/)
        .slice(0, maxLines)
        .join('\n');
    } finally {
      await handle.close();
    }
  }

  private normalizeAttachmentId(identifier: string): string {
    const resolved = path.resolve(process.cwd(), identifier);
    const relative = path.relative(process.cwd(), resolved);
    return relative ? relative.toLowerCase() : path.basename(resolved).toLowerCase();
  }
}
