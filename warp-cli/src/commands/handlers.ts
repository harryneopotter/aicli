import { uiRenderer } from "../ui/renderer";
import { sessionService } from "../services/session.service";
import { chatService } from "../services/chat.service";
import { configService } from "../services/config.service";
import { contextService } from "../services/context.service";
import { format } from "date-fns";
import { analysisService, AnalysisResult } from "../services/analysis.service";
import chalk from "chalk";
import { agentService } from "../services/agent.service";
import * as path from "path";
import * as fs from "fs";
import { trainingService } from "../services/training.service";

export class CommandHandler {
  async handleCommand(input: string): Promise<boolean> {
    const trimmed = input.trim();

    // Check if it's a command (starts with /)
    if (!trimmed.startsWith("/")) {
      return false;
    }

    const [command, ...args] = trimmed.slice(1).split(/\s+/);
    const argsString = args.join(" ");

    try {
      switch (command.toLowerCase()) {
        case "help":
          await this.handleHelp();
          break;

        case "clear":
          await this.handleClear();
          break;

        case "exit":
        case "quit":
          await this.handleExit();
          return true; // Signal to exit

        case "new":
          await this.handleNew(argsString);
          break;

        case "save":
          await this.handleSave(argsString);
          break;

        case "load":
          await this.handleLoad(argsString);
          break;

        case "list":
          await this.handleList();
          break;

        case "delete":
          await this.handleDelete(argsString);
          break;

        case "search":
          await this.handleSearch(argsString);
          break;

        case "export":
          await this.handleExport(argsString);
          break;

        case "config":
          await this.handleConfig();
          break;

        case "provider":
          await this.handleProvider(argsString);
          break;

        case "model":
          await this.handleModel(argsString);
          break;

        case "context":
          await this.handleContext();
          break;

        case "exec":
          await this.handleExec(argsString);
          break;

        case "git":
          await this.handleGit(argsString);
          break;

        case "stats":
          await this.handleStats();
          break;

        case "explain":
          await this.handleExplain(argsString);
          break;

        case "suggest":
          await this.handleSuggest(argsString);
          break;

        case "analyze":
          await this.handleAnalyze(argsString);
          break;

        case "theme":
          await this.handleTheme(argsString);
          break;

        case "agent":
          await this.handleAgent(argsString);
          break;

        case "write":
          await this.handleWrite(argsString);
          break;

        case "read":
          await this.handleRead(argsString);
          break;

        case "recover":
          await this.handleRecover(argsString);
          break;

        case "train":
          await this.handleTrain(argsString);
          break;

        default:
          uiRenderer.renderError(
            `Unknown command: /${command}. Type /help for available commands.`,
          );
      }
    } catch (error: any) {
      uiRenderer.renderError(error.message);
    }

    return false;
  }

  private async handleHelp(): Promise<void> {
    uiRenderer.renderHelp();
  }

  private async handleClear(): Promise<void> {
    uiRenderer.clear();
    uiRenderer.renderWelcome();
  }

  private async handleExit(): Promise<void> {
    uiRenderer.renderInfo("Saving session and exiting...");
    await sessionService.cleanup();
    process.exit(0);
  }

  private async handleNew(name?: string): Promise<void> {
    const session = await sessionService.createSession(name);
    uiRenderer.renderSuccess(`New session created: ${session.name}`);
    uiRenderer.renderSessionInfo({
      name: session.name,
      messageCount: session.messages.length,
      created: session.created,
    });
  }

  private async handleSave(name?: string): Promise<void> {
    const session = sessionService.getCurrentSession();
    if (!session) {
      throw new Error("No active session to save");
    }

    if (name) {
      session.name = name;
    }

    await sessionService.saveCurrentSession();
    uiRenderer.renderSuccess(
      `Session saved: ${session.name} (ID: ${session.id})`,
    );
  }

  private async handleLoad(id: string): Promise<void> {
    if (!id) {
      throw new Error(
        "Please provide a session ID. Use /list to see available sessions.",
      );
    }

    const session = await sessionService.loadSession(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    uiRenderer.renderSuccess(`Loaded session: ${session.name}`);
    uiRenderer.renderSessionInfo({
      name: session.name,
      messageCount: session.messages.length,
      created: session.created,
    });

    // Display recent messages
    if (session.messages.length > 0) {
      uiRenderer.renderInfo("Recent messages:");
      session.messages.slice(-3).forEach((msg) => {
        uiRenderer.renderMessage(msg);
      });
    }
  }

  private async handleList(): Promise<void> {
    const sessions = await sessionService.listSessions();

    if (sessions.length === 0) {
      uiRenderer.renderInfo("No sessions found.");
      return;
    }

    const headers = ["ID", "Name", "Created", "Updated"];
    const rows = sessions.map((s) => [
      s.id.substring(0, 8),
      s.name,
      format(s.created, "MMM dd, yyyy HH:mm"),
      format(s.updated, "MMM dd, yyyy HH:mm"),
    ]);

    uiRenderer.renderTable(headers, rows);
  }

  private async handleDelete(id: string): Promise<void> {
    if (!id) {
      throw new Error("Please provide a session ID to delete.");
    }

    await sessionService.deleteSession(id);
    uiRenderer.renderSuccess(`Session deleted: ${id}`);
  }

  private async handleSearch(query: string): Promise<void> {
    if (!query) {
      throw new Error("Please provide a search query.");
    }

    const sessions = await sessionService.searchSessions(query);

    if (sessions.length === 0) {
      uiRenderer.renderInfo("No matching sessions found.");
      return;
    }

    const headers = ["ID", "Name", "Created"];
    const rows = sessions.map((s) => [
      s.id.substring(0, 8),
      s.name,
      format(s.created, "MMM dd, yyyy HH:mm"),
    ]);

    uiRenderer.renderTable(headers, rows);
  }

  private async handleExport(args: string): Promise<void> {
    const [id, format] = args.split(/\s+/);

    if (!id) {
      throw new Error("Please provide a session ID to export.");
    }

    const exportFormat = (format as "json" | "markdown") || "json";
    const data = await sessionService.exportSession(id, exportFormat);

    console.log(data);
  }

  private async handleConfig(): Promise<void> {
    const config = configService.getAll();
    uiRenderer.renderBox(
      "Current Configuration",
      JSON.stringify(config, null, 2),
      {
        color: "cyan",
      },
    );
  }

  private async handleProvider(name: string): Promise<void> {
    if (!name) {
      const current = chatService.getCurrentProvider();
      uiRenderer.renderInfo(`Current provider: ${current}`);
      return;
    }

    const validProviders = ["ollama", "openai", "anthropic", "gemini"];
    if (!validProviders.includes(name)) {
      throw new Error(
        `Invalid provider. Choose from: ${validProviders.join(", ")}`,
      );
    }

    await chatService.switchProvider(name as any);
    configService.set("defaultProvider", name as any);
    uiRenderer.renderSuccess(`Switched to provider: ${name}`);
  }

  private async handleModel(name: string): Promise<void> {
    if (!name) {
      throw new Error("Please provide a model name.");
    }

    const provider = configService.get("defaultProvider");
    const providerConfig = configService.getProviderConfig(provider);

    if (providerConfig) {
      (providerConfig as any).model = name;
      configService.setProviderConfig(provider, providerConfig);
      uiRenderer.renderSuccess(`Model set to: ${name}`);
    }
  }

  private async handleContext(): Promise<void> {
    const context = await contextService.getContext();
    uiRenderer.renderBox("Current Context", JSON.stringify(context, null, 2), {
      color: "cyan",
    });
  }

  private async handleExec(command: string): Promise<void> {
    if (!command) {
      throw new Error("Please provide a command to execute.");
    }

    await chatService.executeCommand(command);
  }

  private async handleGit(args: string): Promise<void> {
    await chatService.executeCommand(`git ${args}`);
  }

  private async handleStats(): Promise<void> {
    const stats = await sessionService.getSessionStats();

    const statsText = [
      `Total Sessions: ${stats.totalSessions}`,
      `Total Messages: ${stats.totalMessages}`,
      stats.oldestSession
        ? `Oldest Session: ${format(stats.oldestSession, "MMM dd, yyyy")}`
        : "",
      stats.newestSession
        ? `Newest Session: ${format(stats.newestSession, "MMM dd, yyyy")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    uiRenderer.renderBox("Statistics", statsText, { color: "green" });
  }

  private async handleExplain(command: string): Promise<void> {
    if (!command) {
      throw new Error("Please provide a command to explain.");
    }

    await chatService.explainCommand(command);
  }

  private async handleSuggest(task: string): Promise<void> {
    if (!task) {
      throw new Error("Please describe the task.");
    }

    await chatService.suggestCommand(task);
  }

  private async handleAnalyze(args: string): Promise<void> {
    const [type, targetPath] = args.split(/\s+/);

    if (!type || !targetPath) {
      throw new Error("Usage: /analyze <security|complexity> <file|directory>");
    }

    uiRenderer.renderLoading(`Analyzing ${targetPath} for ${type}...`);
    let results: AnalysisResult[] = [];

    try {
      switch (type) {
        case "security":
          results = await analysisService.analyzeSecurity(targetPath);
          break;
        case "complexity":
          results = analysisService.analyzeComplexity(targetPath);
          break;
        default:
          throw new Error(`Unknown analysis type: ${type}`);
      }

      uiRenderer.stopLoading();

      if (results.length === 0) {
        uiRenderer.renderSuccess("No issues found.");
        return;
      }

      uiRenderer.renderBox(`Analysis Results for ${type}`, "");
      results.forEach((result) => {
        const color = result.severity === "High" ? "red" : "yellow";
        const severity = chalk[color](result.severity);
        console.log(`  [${severity}] ${result.file}:${result.line}`);
        console.log(`  ${result.message}\n`);
      });
    } catch (error: any) {
      uiRenderer.stopLoading();
      uiRenderer.renderError(error.message);
    }
  }

  private async handleTheme(themeName?: string): Promise<void> {
    const availableThemes = configService.listThemes();

    if (!themeName) {
      uiRenderer.renderInfo(`Current theme: ${configService.get("ui").theme}`);
      uiRenderer.renderList(availableThemes, false);
      return;
    }

    if (!availableThemes.includes(themeName)) {
      throw new Error(
        `Theme not found: ${themeName}. Available themes: ${availableThemes.join(", ")}`,
      );
    }

    configService.set("ui", { ...configService.get("ui"), theme: themeName });
    uiRenderer.renderSuccess(`Theme set to: ${themeName}`);
  }

  private async handleWrite(args: string): Promise<void> {
    const [filePath, ...contentParts] = args.split(/\s+/);
    const content = contentParts.join(" ");

    if (!filePath || !content) {
      throw new Error("Usage: /write <file_path> <content>");
    }

    const unwrappedContent = content
      .replace(/^"(.*)"$/, "$1")
      .replace(/^'(.*)'$/, "$1");

    await contextService.writeFile(filePath, unwrappedContent);
    uiRenderer.renderSuccess(`Successfully wrote to ${filePath}`);
  }

  private async handleAgent(agentName?: string): Promise<void> {
    if (!agentName || agentName === "list") {
      const agents = agentService.listAgents();
      if (agents.length === 0) {
        uiRenderer.renderInfo("No agents found in the /agents directory.");
        return;
      }
      uiRenderer.renderInfo("Available agents:");
      const rows = agents.map((a) => [a.name, a.description]);
      uiRenderer.renderTable(["Name", "Description"], rows);
      return;
    }

    if (
      agentName === "default" ||
      agentName === "none" ||
      agentName === "clear"
    ) {
      agentService.setCurrentAgent(null);
      uiRenderer.renderSuccess("Reverted to default agent persona.");
      return;
    }

    try {
      const agent = agentService.setCurrentAgent(agentName);
      if (agent) {
        uiRenderer.renderSuccess(`Switched to agent persona: ${agent.name}`);
      }
    } catch (error: any) {
      uiRenderer.renderError(error.message);
    }
  }

  private async handleRead(filePath: string): Promise<void> {
    if (!filePath) {
      throw new Error("Usage: /read <file_path>");
    }

    const content = await contextService.readFile(filePath);
    uiRenderer.renderCodeBlock(content, path.extname(filePath).substring(1));
  }

  private async handleTrain(argsString: string): Promise<void> {
    const parts = argsString.trim().split(/\s+/);
    const subcommand = parts[0]?.toLowerCase();

    if (subcommand === "list") {
      const playbooks = await trainingService.listPlaybooks();
      if (playbooks.length === 0) {
        uiRenderer.renderInfo("No playbooks found.");
        return;
      }
      const headers = ["Name", "Strategies", "Updated"];
      const rows = [];
      for (const name of playbooks) {
        const playbook = await trainingService.loadPlaybook(name);
        if (playbook) {
          rows.push([
            name,
            playbook.bullets.length.toString(),
            new Date(playbook.updated).toISOString().split("T")[0],
          ]);
        }
      }
      uiRenderer.renderTable(headers, rows);
      return;
    }

    if (subcommand === "load" && parts[1]) {
      const name = parts.slice(1).join(" ");
      const playbook = await trainingService.loadPlaybook(name);
      if (!playbook) {
        uiRenderer.renderError(`Playbook not found: ${name}`);
        return;
      }
      uiRenderer.renderBox(
        `Playbook: ${playbook.name}`,
        JSON.stringify(playbook, null, 2),
        { color: "cyan" },
      );
      return;
    }

    // Train mode: parse samples from argsString as semicolon-separated, pipe-delimited
    if (!argsString.trim()) {
      uiRenderer.renderInfo(
        'Usage: /train [list|load <name>] or /train "Q1|Context1|Truth1;Q2|Context2|Truth2"',
      );
      return;
    }

    const sampleStrings = argsString
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    const samples: {
      question: string;
      context: string;
      groundTruth: string;
    }[] = [];
    for (const str of sampleStrings) {
      const parts = str
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 3) {
        samples.push({
          question: parts[0],
          context: parts[1],
          groundTruth: parts[2],
        });
      }
    }

    if (samples.length === 0) {
      uiRenderer.renderError(
        "No valid samples parsed. Use format: question|context|groundTruth",
      );
      return;
    }

    const playbookName = parts[0] || "default";
    try {
      const playbook = await trainingService.train(samples, playbookName);
      uiRenderer.renderSuccess(
        `Training complete! ${playbook.bullets.length} strategies learned.`,
      );
    } catch (error: any) {
      uiRenderer.renderError(`Training failed: ${error.message}`);
    }
  }

  private async handleRecover(argsString: string): Promise<void> {
    const parts = argsString.trim().split(/\s+/);
    const subcommand = parts[0]?.toLowerCase();

    const projectRoot = process.cwd();
    const notNeededDir = path.join(projectRoot, ".not-needed");
    if (!fs.existsSync(notNeededDir)) {
      uiRenderer.renderInfo("No .not-needed directory found.");
      return;
    }

    if (subcommand === "list") {
      const items = await fs.promises.readdir(notNeededDir);
      if (items.length === 0) {
        uiRenderer.renderInfo(".not-needed is empty.");
        return;
      }

      const headers = ["Path", "Timestamp", "Size"];
      const rows: string[][] = [];
      for (const item of items) {
        const fullPath = path.join(notNeededDir, item);
        const stats = await fs.promises.stat(fullPath);
        const timestampMatch = item.match(/\.(\d+)\./);
        const ts = timestampMatch
          ? new Date(parseInt(timestampMatch[1])).toISOString().split("T")[0]
          : "unknown";
        const relPath = path.relative(projectRoot, fullPath);
        rows.push([relPath, ts, `${(stats.size / 1024).toFixed(1)} KB`]);
      }
      uiRenderer.renderTable(headers, rows);
      return;
    }

    if (subcommand === "clean") {
      await fs.promises.rm(notNeededDir, { recursive: true, force: true });
      uiRenderer.renderSuccess(".not-needed cleaned.");
      return;
    }

    if (subcommand === "restore" && parts[1]) {
      const filename = parts.slice(1).join(" ");
      const fullPath = path.join(notNeededDir, filename);
      if (!fs.existsSync(fullPath)) {
        uiRenderer.renderError(`Item not found: ${filename}`);
        return;
      }

      const resolved = path.resolve(fullPath);
      if (!resolved.startsWith(projectRoot)) {
        uiRenderer.renderError("Unsafe restore: path outside project.");
        return;
      }

      const destPath = path.join(
        projectRoot,
        filename.split(".").slice(0, -2).join("."),
      );
      await fs.promises.rename(fullPath, destPath);
      uiRenderer.renderSuccess(
        `Restored: ${path.relative(projectRoot, destPath)}`,
      );
      return;
    }

    uiRenderer.renderInfo("Usage: /recover [list|clean|restore <filename>]");
  }
}

export const commandHandler = new CommandHandler();
