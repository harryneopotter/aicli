import { agentService } from "../services/agent.service";
import chalk from "chalk";
import boxen from "boxen";
import Table from "cli-table3";
import ora, { Ora } from "ora";
import { Message, UIRenderer } from "../types";
import { configService } from "../services/config.service";
import gradient from "gradient-string";

// Simple markdown-like formatting
function formatMarkdown(text: string): string {
  let formatted = text;

  // Code blocks
  formatted = formatted.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) => {
      return (
        "\n" +
        chalk.gray("```") +
        (lang ? chalk.yellow(lang) : "") +
        "\n" +
        chalk.white(code.trim()) +
        "\n" +
        chalk.gray("```") +
        "\n"
      );
    },
  );

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, (_, code) => chalk.cyan(code));

  // Bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (_, text) =>
    chalk.bold(text),
  );

  // Italic (single asterisk not already part of bold)
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, text) =>
    chalk.italic(text),
  );

  return formatted;
}

export class WarpUIRenderer implements UIRenderer {
  private spinner?: Ora;

  private getThemeColor(
    colorName: keyof ReturnType<typeof configService.getThemeColors>,
  ): string {
    const colors = configService.getThemeColors();
    return colors[colorName] || "#FFFFFF"; // Default to white
  }

  setTheme(): void {
    // Theme support can be added later
  }

  renderWelcome(): void {
    const primaryColor = this.getThemeColor("primary");
    const secondaryColor = this.getThemeColor("secondary");

    const logo = gradient(primaryColor, secondaryColor).multiline(`
 __      __  ___ ______  _____
 \\ \\    / / / _ \\| ___ \\|  __ \\
  \\ \\  / / / /_\\ \\ |_/ /| |__) |
   \\ \\/ /  |  _  ||    / |  ___/
    \\  /   | | | || |\\ \\ | |
     \\/    \\_| |_/\\_| \\_||_|

    AI Coding Assistant CLI
    `);

    console.log(logo);
    console.log(
      boxen(
        chalk.white(
          "Welcome to Warp CLI!\n\n" +
          "A powerful AI coding assistant supporting multiple LLM providers.\n" +
          "Type your questions, execute commands, or use /help for assistance.",
        ),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: primaryColor,
        },
      ),
    );
  }

  renderPrompt(mode: string = "chat"): void {
    const primaryColor = this.getThemeColor("primary");
    const secondaryColor = this.getThemeColor("secondary");
    const modeColor =
      mode === "chat" ? chalk.hex(primaryColor) : chalk.hex(secondaryColor);
    const symbol = mode === "chat" ? "💬" : "⚙️";

    const agent = agentService.getCurrentAgent();
    const agentName = agent ? `(${chalk.hex(agent.color)(agent.name)})` : "";

    process.stdout.write(
      `\n${symbol}  ${modeColor(mode)} ${agentName} ${chalk.gray(">")} `,
    );
  }

  renderMessage(message: Message): void {
    const timestamp = message.timestamp.toLocaleTimeString();
    const roleColors = {
      user: chalk.hex(this.getThemeColor("primary")),
      assistant: chalk.hex(this.getThemeColor("success")),
      system: chalk.hex(this.getThemeColor("warning")),
    };

    const roleEmoji = {
      user: "👤",
      assistant: "🤖",
      system: "⚙️",
    };

    const roleColor = roleColors[message.role];
    const emoji = roleEmoji[message.role];

    console.log("\n" + chalk.gray("─".repeat(process.stdout.columns || 80)));
    console.log(
      `${emoji}  ${roleColor.bold(message.role.toUpperCase())} ${chalk.gray(
        `[${timestamp}]`,
      )}`,
    );

    if (message.tokens) {
      console.log(chalk.gray(`   Tokens: ${message.tokens}`));
    }

    console.log();

    // Render content with markdown-like formatting
    const rendered = formatMarkdown(message.content);
    console.log(rendered);
  }

  renderError(error: string): void {
    const errorColor = this.getThemeColor("error");
    console.log(
      boxen(chalk.hex(errorColor).bold("ERROR\n\n") + chalk.white(error), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: errorColor,
      }),
    );
  }

  renderSuccess(message: string): void {
    const successColor = this.getThemeColor("success");
    console.log(
      boxen(
        chalk.hex(successColor).bold("SUCCESS\n\n") + chalk.white(message),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: successColor,
        },
      ),
    );
  }

  renderInfo(message: string): void {
    const infoColor = this.getThemeColor("info");
    console.log(chalk.hex(infoColor)("ℹ"), chalk.white(message));
  }

  renderWarning(message: string): void {
    const warningColor = this.getThemeColor("warning");
    console.log(chalk.hex(warningColor)("⚠"), chalk.white(message));
  }

  renderLoading(text: string): void {
    if (this.spinner) {
      this.spinner.stop();
    }
    const primaryColor = this.getThemeColor("primary");
    this.spinner = ora({
      text: chalk.hex(primaryColor)(text),
      color: "cyan", // Ora color type is limited
      spinner: "dots",
    }).start();
  }

  stopLoading(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }

  renderTable(headers: string[], rows: string[][]): void {
    const primaryColor = this.getThemeColor("primary");
    const table = new Table({
      head: headers.map((h) => chalk.hex(primaryColor).bold(h)),
      style: {
        head: [],
        border: ["gray"],
      },
    });

    rows.forEach((row) => table.push(row));
    console.log(table.toString());
  }

  renderBox(
    title: string,
    content: string,
    options?: { color?: string },
  ): void {
    const borderColor = options?.color ?? this.getThemeColor("primary");
    console.log(
      boxen(chalk.bold(title) + "\n\n" + content, {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor,
      }),
    );
  }

  renderCodeBlock(code: string, language?: string): void {
    const languageLabel = language ? chalk.gray(`[${language}]`) : "";
    console.log("\n" + languageLabel);
    console.log(
      boxen(code, {
        padding: 1,
        borderStyle: "round",
        borderColor: "gray",
      }),
    );
  }

  renderList(items: string[], numbered: boolean = false): void {
    const primaryColor = this.getThemeColor("primary");
    items.forEach((item, index) => {
      const prefix = numbered
        ? chalk.hex(primaryColor)(`${index + 1}.`)
        : chalk.hex(primaryColor)("•");
      console.log(`  ${prefix} ${item}`);
    });
  }

  renderDivider(): void {
    console.log(chalk.gray("─".repeat(process.stdout.columns || 80)));
  }

  renderStreamingChunk(chunk: string): void {
    process.stdout.write(chunk);
  }

  startStreamingResponse(): void {
    console.log();
  }

  endStreamingResponse(): void {
    console.log("\n");
  }

  clear(): void {
    console.clear();
  }

  renderSessionInfo(session: {
    name: string;
    messageCount: number;
    created: Date;
  }): void {
    const primaryColor = this.getThemeColor("primary");
    const info = [
      `Session: ${chalk.hex(primaryColor)(session.name)}`,
      `Messages: ${chalk.yellow(session.messageCount)}`,
      `Created: ${chalk.gray(session.created.toLocaleString())}`,
    ].join(" | ");

    console.log(
      boxen(info, {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        borderStyle: "single",
        borderColor: primaryColor,
      }),
    );
  }

  renderHelp(): void {
    const primaryColor = this.getThemeColor("primary");
    const helpText = `
${chalk.bold.hex(primaryColor)("WARP CLI - Commands")}

${chalk.bold("Chat Commands:")}
  ${chalk.hex(primaryColor)("/help")}              Show this help message
  ${chalk.hex(primaryColor)("/clear")}             Clear the screen
  ${chalk.hex(primaryColor)("/exit, /quit")}       Exit the application
  ${chalk.hex(primaryColor)("/new")}               Start a new session
  ${chalk.hex(primaryColor)("/save [name]")}       Save current session
  ${chalk.hex(primaryColor)("/load <id>")}         Load a session
  ${chalk.hex(primaryColor)("/list")}              List all sessions
  ${chalk.hex(primaryColor)("/delete <id>")}       Delete a session

${chalk.bold("Configuration:")}
  ${chalk.hex(primaryColor)("/config")}            Show current configuration
  ${chalk.hex(primaryColor)("/provider <name>")}  Switch LLM provider (ollama, openai, anthropic, gemini)
  ${chalk.hex(primaryColor)("/model <name>")}     Set model for current provider
  ${chalk.hex(primaryColor)("/context")}          Show current context

${chalk.bold("Execution:")}
  ${chalk.hex(primaryColor)("/exec <command>")}   Execute a shell command
  ${chalk.hex(primaryColor)("/git <args>")}       Execute git command

${chalk.bold("Project Memory:")}
  ${chalk.hex(primaryColor)("/docs view [type]")} View project documentation (design|changelog|changes|agent)
  ${chalk.hex(primaryColor)("/docs init")}        Initialize .aicli documentation directory
  ${chalk.hex(primaryColor)("/docs refresh")}     Refresh all documentation files
  ${chalk.hex(primaryColor)("/index")}            Index codebase for semantic search

${chalk.bold("Tips:")}
  • Just type naturally to chat with the AI
  • Use markdown for formatted output
  • Press Ctrl+C to cancel current operation
  • Sessions are auto-saved by default
    `;

    console.log(helpText);
  }

  getInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      process.stdout.write(prompt);
      process.stdin.once("data", (data) => {
        resolve(data.toString().trim());
      });
    });
  }
}

export const uiRenderer = new WarpUIRenderer();
