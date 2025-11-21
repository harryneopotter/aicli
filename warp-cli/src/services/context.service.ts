import { simpleGit, SimpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { ContextData } from "../types";

type CommandResult = { output: string; error?: string };

export class ContextService {
  private git: SimpleGit;
  private commandHistory: string[] = [];
  private outputHistory: string[] = [];
  private readonly maxHistory = 50;

  constructor() {
    this.git = simpleGit();
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

  async getContext(): Promise<ContextData> {
    const cwd = process.cwd();

    const context: ContextData = {
      cwd,
      system: await this.getSystemInfo(),
      history: {
        commands: this.commandHistory.slice(-10),
        outputs: this.outputHistory.slice(-5),
      },
    };

    try {
      const gitInfo = await this.getGitInfo();
      if (gitInfo) {
        context.git = gitInfo;
      }
    } catch {
      /* ignore */
    }

    try {
      const projectInfo = await this.getProjectInfo(cwd);
      if (projectInfo) {
        context.project = projectInfo;
      }
    } catch {
      /* ignore */
    }

    return context;
  }

  // Whitelisted commands for /exec
  private static ALLOWED_COMMANDS = [
    'ls', 'pwd', 'cat', 'echo', 'whoami', 'date', 'git', 'npm', 'yarn', 'pnpm', 'node', 'python', 'python3', 'pip', 'pip3', 'cargo', 'go', 'java', 'javac', 'npx', 'tsc', 'make', 'gcc', 'g++', 'clang', 'docker', 'grep', 'find', 'head', 'tail', 'du', 'df', 'free', 'top', 'htop', 'ps', 'kill', 'uname', 'which', 'whereis', 'tree', 'stat', 'chmod', 'chown', 'curl', 'wget', 'ifconfig', 'ip', 'ping', 'traceroute', 'ssh', 'scp', 'rsync', 'zip', 'unzip', 'tar', 'gzip', 'bzip2', 'xz'
  ];

  private logCommandExecution(command: string): void {
    console.log(`[Command Execution] ${command}`);
  }

  async executeCommand(command: string): Promise<CommandResult> {
    this.addCommand(command);
    this.logCommandExecution(command);

    const trimmed = command.trim();
    const tokens = this.tokenizeCommand(trimmed);
    if (tokens.length === 0) {
      return { output: "", error: "No command provided" };
    }

    const cmd = tokens[0].toLowerCase();

    // Feature: Safe Delete
    if (cmd === "rm" || cmd === "del") {
      return this.handleSafeDelete(tokens);
    }

    // Security: Whitelist
    if (!ContextService.ALLOWED_COMMANDS.includes(cmd)) {
      const errorMsg = `Command not allowed: ${cmd}`;
      this.addOutput(errorMsg);
      return { output: '', error: errorMsg };
    }

    // Security: Path Validation
    try {
      this.validateCommandPaths(tokens.slice(1));
    } catch (error: any) {
      const errorMsg = error?.message || "Command blocked for security reasons.";
      this.addOutput(errorMsg);
      return { output: "", error: errorMsg };
    }

    return this.runShellCommand(trimmed);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const safePath = this.ensurePathInsideProject(filePath);
    await fs.promises.mkdir(path.dirname(safePath), { recursive: true });
    await fs.promises.writeFile(safePath, content, "utf8");
  }

  async readFile(filePath: string): Promise<string> {
    const safePath = this.ensurePathInsideProject(filePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.promises.readFile(safePath, "utf8");
  }

  buildSystemPrompt(context: ContextData, agentContent?: string): string {
    let prompt = agentContent
      ? `${agentContent}\n\n---\nYou are an AI coding assistant integrated into a CLI terminal. Be helpful, concise, and practical, embodying the persona described above.\n\n`
      : "You are an AI coding assistant integrated into a CLI terminal. Be helpful, concise, and practical.\n\n";

    prompt += `Current Context:\n`;
    prompt += `- Working Directory: ${context.cwd}\n`;
    prompt += `- OS: ${context.system.os} (${context.system.platform})\n`;
    prompt += `- Shell: ${context.system.shell}\n`;

    if (context.git) {
      prompt += `\nGit Repository:\n`;
      prompt += `- Branch: ${context.git.branch}\n`;
      prompt += `- Status: ${context.git.status}\n`;
      if (context.git.remotes?.length) {
        prompt += `- Remotes: ${context.git.remotes.join(", ")}\n`;
      }
    }

    if (context.project) {
      prompt += `\nProject:\n`;
      prompt += `- Type: ${context.project.type}\n`;
      prompt += `- Name: ${context.project.name}\n`;
      prompt += `- Version: ${context.project.version}\n`;
      if (context.project.scripts?.length) {
        prompt += `- Scripts: ${context.project.scripts.join(", ")}\n`;
      }
    }

    if (context.history.commands.length > 0) {
      prompt += `\nRecent Commands:\n`;
      context.history.commands.forEach((cmd, idx) => {
        prompt += `${idx + 1}. ${cmd}\n`;
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

  private async handleSafeDelete(tokens: string[]): Promise<CommandResult> {
    const targets = this.extractSafeDeleteTargets(tokens);
    if (targets.length === 0) {
      const errorMsg =
        "Safe delete intercepted but no file paths were provided.";
      this.addOutput(errorMsg);
      return { output: "", error: errorMsg };
    }

    for (const target of targets) {
      this.ensurePathInsideProject(target);
    }

    try {
      const summary = await this.safeDeleteTargets(targets);
      this.addOutput(summary);
      return { output: summary };
    } catch (error: any) {
      const errorMsg =
        error?.message || "Safe delete failed. Please check the paths.";
      this.addOutput(errorMsg);
      return { output: "", error: errorMsg };
    }
  }

  private async safeDeleteTargets(targets: string[]): Promise<string> {
    const projectRoot = process.cwd();
    const stagingDir = path.join(projectRoot, ".not-needed");
    await fs.promises.mkdir(stagingDir, { recursive: true });

    const resolvedTargets = targets.map((target) => {
      const absolute = path.resolve(projectRoot, target);
      const relative =
        path.relative(projectRoot, absolute) || path.basename(absolute);
      return { original: target, absolute, relative };
    });

    const missing = resolvedTargets
      .filter((entry) => !fs.existsSync(entry.absolute))
      .map((entry) => entry.original);

    if (missing.length > 0) {
      throw new Error(`Safe delete failed: ${missing.join(", ")} not found.`);
    }

    const normalizedStaging = path.resolve(stagingDir);
    const uniqueTargets = resolvedTargets.filter(
      (entry, index, array) =>
        array.findIndex(
          (candidate) => candidate.absolute === entry.absolute,
        ) === index,
    );

    for (const entry of uniqueTargets) {
      const normalizedAbsolute = path.resolve(entry.absolute);
      if (
        normalizedAbsolute === normalizedStaging ||
        normalizedAbsolute.startsWith(normalizedStaging + path.sep)
      ) {
        throw new Error(
          "Safe delete blocked: refusing to delete the .not-needed staging area.",
        );
      }
    }

    const timestamp = Date.now();
    const summaries: string[] = [];

    for (let i = 0; i < uniqueTargets.length; i++) {
      const entry = uniqueTargets[i];
      const sanitizedName =
        entry.relative.replace(new RegExp(`[${path.sep}/]`, "g"), "__") ||
        path.basename(entry.absolute);
      const destination = path.join(
        stagingDir,
        `${sanitizedName}.${timestamp}.${i}`,
      );

      const summary = await this.movePathWithFallback(
        entry.absolute,
        destination,
        entry.relative,
      );
      summaries.push(summary);
    }

    const header = `Safe delete completed. Items relocated to ${path.relative(projectRoot, stagingDir) || ".not-needed"
      }:`;
    return [header, ...summaries].join("\n");
  }

  private async movePathWithFallback(
    src: string,
    dest: string,
    relativeLabel: string,
  ): Promise<string> {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });

    try {
      await fs.promises.rename(src, dest);
      return this.formatSafeDeleteLog(relativeLabel, dest, "renamed");
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        throw new Error(`Safe delete failed: ${relativeLabel} does not exist.`);
      }

      const fallbackReason = error?.code || "UNKNOWN";
      await this.copyRecursive(src, dest);
      await this.removePath(src);
      return this.formatSafeDeleteLog(
        relativeLabel,
        dest,
        `copied (fallback: ${fallbackReason})`,
      );
    }
  }

  private async copyRecursive(src: string, dest: string): Promise<void> {
    const stats = await fs.promises.lstat(src);

    if (stats.isDirectory()) {
      await fs.promises.mkdir(dest, { recursive: true });
      const entries = await fs.promises.readdir(src);
      for (const entry of entries) {
        await this.copyRecursive(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.copyFile(src, dest);
    }
  }

  private async removePath(target: string): Promise<void> {
    await fs.promises.rm(target, { recursive: true, force: true });
  }

  private formatSafeDeleteLog(
    relativeSource: string,
    destination: string,
    action: string,
  ): string {
    const projectRoot = process.cwd();
    const destinationLabel =
      path.relative(projectRoot, destination) || destination;
    return `- ${relativeSource} -> ${destinationLabel} (${action})`;
  }

  private async runShellCommand(command: string): Promise<CommandResult> {
    const [cmd, ...args] = command.trim().split(/\s+/);

    try {
      const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        // @ts-ignore - execFile is imported from child_process
        import('child_process').then(({ execFile }) => {
          execFile(cmd, args, {
            cwd: process.cwd(),
            maxBuffer: 10 * 1024 * 1024,
            timeout: 10000
          }, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          });
        });
      });

      const output = stdout + (stderr || "");
      this.addOutput(output);

      return {
        output,
        error: stderr || undefined,
      };
    } catch (error: any) {
      const errorMsg = error.message || "Command execution failed.";
      this.addOutput(errorMsg);
      return {
        output: error.stdout || "",
        error: errorMsg,
      };
    }
  }

  private validateCommandPaths(args: string[]): void {
    for (const arg of args) {
      if (!arg || arg.startsWith("-")) {
        continue;
      }

      if (arg.includes("/") || arg.includes("\\") || arg.includes("..")) {
        this.ensurePathInsideProject(arg);
      }
    }
  }

  private ensurePathInsideProject(filePath: string): string {
    const projectRoot = process.cwd();
    const normalizedRoot = path.normalize(projectRoot);
    const resolved = path.resolve(projectRoot, filePath);
    const normalizedResolved = path.normalize(resolved);
    if (!normalizedResolved.startsWith(normalizedRoot)) {
      throw new Error(
        `Error: Path is outside of the project directory: ${filePath}`,
      );
    }
    return normalizedResolved;
  }

  private tokenizeCommand(command: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let quoteChar: string | null = null;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if ((char === '"' || char === "'") && quoteChar === null) {
        quoteChar = char;
        continue;
      }

      if (quoteChar && char === quoteChar) {
        quoteChar = null;
        continue;
      }

      if (!quoteChar && /\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = "";
        }
        continue;
      }

      if (char === "\\" && i + 1 < command.length) {
        const nextChar = command[i + 1];
        if (nextChar === '"' || nextChar === "'") {
          current += nextChar;
          i++;
          continue;
        }
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  private extractSafeDeleteTargets(parts: string[]): string[] {
    const targets: string[] = [];
    let afterDoubleDash = false;

    for (let i = 1; i < parts.length; i++) {
      const token = parts[i];

      if (!afterDoubleDash && token === "--") {
        afterDoubleDash = true;
        continue;
      }

      if (!afterDoubleDash && token.startsWith("-")) {
        continue;
      }

      if (token.trim()) {
        targets.push(token.trim());
      }
    }

    return targets;
  }

  private async getSystemInfo() {
    const shell = process.env.SHELL || process.env.ComSpec || "unknown";

    return {
      os: os.type(),
      platform: os.platform(),
      shell: path.basename(shell),
    };
  }

  private async getGitInfo() {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) return undefined;

      const status = await this.git.status();
      const remotes = await this.git.getRemotes(true);

      return {
        branch: status.current || "unknown",
        status: this.formatGitStatus(status),
        remotes: remotes.map(
          (remote) => `${remote.name}: ${remote.refs.fetch}`,
        ),
      };
    } catch {
      return undefined;
    }
  }

  private formatGitStatus(status: any): string {
    if (!status.files.length) return "clean";

    const segments: string[] = [];
    if (status.staged.length) segments.push(`${status.staged.length} staged`);
    if (status.modified.length)
      segments.push(`${status.modified.length} modified`);
    if (status.created.length)
      segments.push(`${status.created.length} created`);
    if (status.deleted.length)
      segments.push(`${status.deleted.length} deleted`);

    return segments.join(", ");
  }

  private async getProjectInfo(cwd: string) {
    const candidates = [
      { file: "package.json", type: "Node.js", parser: this.parsePackageJson },
      { file: "Cargo.toml", type: "Rust", parser: this.parseCargoToml },
      { file: "go.mod", type: "Go", parser: this.parseGoMod },
      { file: "pyproject.toml", type: "Python", parser: this.parsePyProject },
      { file: "requirements.txt", type: "Python", parser: null },
      { file: "pom.xml", type: "Java", parser: null },
      { file: "build.gradle", type: "Gradle", parser: null },
    ] as const;

    for (const candidate of candidates) {
      const filePath = path.join(cwd, candidate.file);
      if (!(await this.fileExists(filePath))) continue;

      const info = candidate.parser
        ? await candidate.parser.call(this, filePath)
        : { name: path.basename(cwd), version: "unknown" };

      return { type: candidate.type, ...info };
    }

    return undefined;
  }

  private async parsePackageJson(filePath: string) {
    try {
      const data = await fs.promises.readFile(filePath, "utf8");
      const pkg = JSON.parse(data);
      return {
        name: pkg.name || "unknown",
        version: pkg.version || "unknown",
        scripts: Object.keys(pkg.scripts || {}),
      };
    } catch {
      return { name: "unknown", version: "unknown" };
    }
  }

  private async parseCargoToml(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const name = content.match(/name\s*=\s*"([^"]+)"/)?.[1] || "unknown";
      const version =
        content.match(/version\s*=\s*"([^"]+)"/)?.[1] || "unknown";
      return { name, version };
    } catch {
      return { name: "unknown", version: "unknown" };
    }
  }

  private async parseGoMod(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const module =
        content
          .match(/module\s+([^\s]+)/)?.[1]
          ?.split("/")
          .pop() || "unknown";
      return { name: module, version: "unknown" };
    } catch {
      return { name: "unknown", version: "unknown" };
    }
  }

  private async parsePyProject(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const name = content.match(/name\s*=\s*"([^"]+)"/)?.[1] || "unknown";
      const version =
        content.match(/version\s*=\s*"([^"]+)"/)?.[1] || "unknown";
      return { name, version };
    } catch {
      return { name: "unknown", version: "unknown" };
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
}

export const contextService = new ContextService();
