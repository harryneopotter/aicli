import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';
import { Message, UIRenderer } from '../types';

// Simple markdown-like formatting
function formatMarkdown(text: string): string {
  let formatted = text;

  // Code blocks
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return '\n' + chalk.gray('```') + (lang ? chalk.yellow(lang) : '') + '\n' +
           chalk.white(code.trim()) + '\n' + chalk.gray('```') + '\n';
  });

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, (_, code) => chalk.cyan(code));

  // Bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (_, text) => chalk.bold(text));

  // Italic (single asterisk not already part of bold)
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, text) => chalk.italic(text));

  return formatted;
}

export class WarpUIRenderer implements UIRenderer {
  private spinner?: Ora;

  setTheme(_theme: 'dark' | 'light'): void {
    // Theme support can be added later
  }

  renderWelcome(): void {
    const logo = `
 __      __  ___ ______  _____
 \\ \\    / / / _ \\| ___ \\|  __ \\
  \\ \\  / / / /_\\ \\ |_/ /| |__) |
   \\ \\/ /  |  _  ||    / |  ___/
    \\  /   | | | || |\\ \\ | |
     \\/    \\_| |_/\\_| \\_||_|

    AI Coding Assistant CLI
    `;

    console.log(chalk.cyan(logo));
    console.log(
      boxen(
        chalk.white(
          'Welcome to Warp CLI!\n\n' +
            'A powerful AI coding assistant supporting multiple LLM providers.\n' +
            'Type your questions, execute commands, or use /help for assistance.'
        ),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan'
        }
      )
    );
  }

  renderPrompt(mode: string = 'chat'): void {
    const modeColor = mode === 'chat' ? chalk.cyan : chalk.yellow;
    const symbol = mode === 'chat' ? '💬' : '⚙️';
    process.stdout.write(`\n${symbol}  ${modeColor(mode)} ${chalk.gray('>')} `);
  }

  renderMessage(message: Message): void {
    const timestamp = message.timestamp.toLocaleTimeString();
    const roleColors = {
      user: chalk.cyan,
      assistant: chalk.green,
      system: chalk.yellow
    };

    const roleEmoji = {
      user: '👤',
      assistant: '🤖',
      system: '⚙️'
    };

    const roleColor = roleColors[message.role];
    const emoji = roleEmoji[message.role];

    console.log('\n' + chalk.gray('─'.repeat(process.stdout.columns || 80)));
    console.log(
      `${emoji}  ${roleColor.bold(message.role.toUpperCase())} ${chalk.gray(
        `[${timestamp}]`
      )}`
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
    console.log(
      boxen(chalk.red.bold('ERROR\n\n') + chalk.white(error), {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red'
      })
    );
  }

  renderSuccess(message: string): void {
    console.log(
      boxen(chalk.green.bold('SUCCESS\n\n') + chalk.white(message), {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      })
    );
  }

  renderInfo(message: string): void {
    console.log(chalk.blue('ℹ'), chalk.white(message));
  }

  renderWarning(message: string): void {
    console.log(chalk.yellow('⚠'), chalk.white(message));
  }

  renderLoading(text: string): void {
    if (this.spinner) {
      this.spinner.stop();
    }
    this.spinner = ora({
      text: chalk.cyan(text),
      color: 'cyan',
      spinner: 'dots'
    }).start();
  }

  stopLoading(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }

  renderTable(headers: string[], rows: string[][]): void {
    const table = new Table({
      head: headers.map(h => chalk.cyan.bold(h)),
      style: {
        head: [],
        border: ['gray']
      }
    });

    rows.forEach(row => table.push(row));
    console.log(table.toString());
  }

  renderBox(title: string, content: string, options?: { color?: string }): void {
    const borderColor = (options?.color as any) || 'white';
    console.log(
      boxen(chalk.bold(title) + '\n\n' + content, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor
      })
    );
  }

  renderCodeBlock(code: string, language?: string): void {
    const languageLabel = language ? chalk.gray(`[${language}]`) : '';
    console.log('\n' + languageLabel);
    console.log(
      boxen(code, {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'gray'
      })
    );
  }

  renderList(items: string[], numbered: boolean = false): void {
    items.forEach((item, index) => {
      const prefix = numbered ? chalk.cyan(`${index + 1}.`) : chalk.cyan('•');
      console.log(`  ${prefix} ${item}`);
    });
  }

  renderDivider(): void {
    console.log(chalk.gray('─'.repeat(process.stdout.columns || 80)));
  }

  renderStreamingChunk(chunk: string): void {
    process.stdout.write(chunk);
  }

  startStreamingResponse(): void {
    console.log();
  }

  endStreamingResponse(): void {
    console.log('\n');
  }

  clear(): void {
    console.clear();
  }

  renderSessionInfo(session: { name: string; messageCount: number; created: Date }): void {
    const info = [
      `Session: ${chalk.cyan(session.name)}`,
      `Messages: ${chalk.yellow(session.messageCount)}`,
      `Created: ${chalk.gray(session.created.toLocaleString())}`
    ].join(' | ');

    console.log(
      boxen(info, {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        borderStyle: 'single',
        borderColor: 'cyan'
      })
    );
  }

  renderHelp(): void {
    const helpText = `
${chalk.bold.cyan('WARP CLI - Commands')}

${chalk.bold('Chat Commands:')}
  ${chalk.cyan('/help')}              Show this help message
  ${chalk.cyan('/clear')}             Clear the screen
  ${chalk.cyan('/exit, /quit')}       Exit the application
  ${chalk.cyan('/new')}               Start a new session
  ${chalk.cyan('/save [name]')}       Save current session
  ${chalk.cyan('/load <id>')}         Load a session
  ${chalk.cyan('/list')}              List all sessions
  ${chalk.cyan('/delete <id>')}       Delete a session

${chalk.bold('Configuration:')}
  ${chalk.cyan('/config')}            Show current configuration
  ${chalk.cyan('/provider <name>')}  Switch LLM provider (ollama, openai, anthropic, gemini)
  ${chalk.cyan('/model <name>')}     Set model for current provider
  ${chalk.cyan('/context')}          Show current context

${chalk.bold('Execution:')}
  ${chalk.cyan('/exec <command>')}   Execute a shell command
  ${chalk.cyan('/git <args>')}       Execute git command

${chalk.bold('Tips:')}
  • Just type naturally to chat with the AI
  • Use markdown for formatted output
  • Press Ctrl+C to cancel current operation
  • Sessions are auto-saved by default
    `;

    console.log(helpText);
  }

  getInput(prompt: string): Promise<string> {
    return new Promise(resolve => {
      process.stdout.write(prompt);
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });
  }
}

export const uiRenderer = new WarpUIRenderer();
