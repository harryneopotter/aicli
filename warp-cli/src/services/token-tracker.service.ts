/**
 * Token usage tracking and cost estimation service
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TokenUsage {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: Date;
}

export interface ProviderStats {
  provider: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  firstUsed: Date;
  lastUsed: Date;
}

// Pricing per 1M tokens (as of 2025)
const PRICING = {
  'openai': {
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
  },
  'anthropic': {
    'claude-3-opus': { input: 15.00, output: 75.00 },
    'claude-3-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-haiku': { input: 0.25, output: 1.25 }
  },
  'gemini': {
    'gemini-pro': { input: 0.50, output: 1.50 },
    'gemini-1.5-pro': { input: 3.50, output: 10.50 }
  },
  'ollama': {
    'default': { input: 0, output: 0 } // Local, no cost
  }
};

export class TokenTrackerService {
  private usageHistory: TokenUsage[] = [];
  private storageFile: string;
  private maxHistorySize = 1000;

  constructor() {
    const dataDir = path.join(os.homedir(), '.warp-cli', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.storageFile = path.join(dataDir, 'token-usage.json');
    this.load();
  }

  /**
   * Track token usage for a request
   * @param provider Provider name
   * @param model Model name
   * @param inputTokens Input tokens used
   * @param outputTokens Output tokens used
   */
  trackUsage(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    const cost = this.calculateCost(provider, model, inputTokens, outputTokens);

    const usage: TokenUsage = {
      provider: `${provider}:${model}`,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: cost,
      timestamp: new Date()
    };

    this.usageHistory.push(usage);

    // Trim history if too large
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory = this.usageHistory.slice(-this.maxHistorySize);
    }

    // Save after each tracking
    this.save();
  }

  /**
   * Calculate cost for token usage
   * @param provider Provider name
   * @param model Model name
   * @param inputTokens Input tokens
   * @param outputTokens Output tokens
   * @returns Estimated cost in USD
   */
  private calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const providerPricing = PRICING[provider as keyof typeof PRICING];

    if (!providerPricing) {
      return 0; // Unknown provider
    }

    // Find matching model pricing or use default
    let pricing = { input: 0, output: 0 };

    for (const [modelKey, prices] of Object.entries(providerPricing)) {
      if (model.includes(modelKey) || modelKey === 'default') {
        pricing = prices;
        break;
      }
    }

    // Calculate cost (pricing is per 1M tokens)
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get statistics for a specific provider
   * @param providerFilter Optional provider filter
   * @returns Provider statistics
   */
  getProviderStats(providerFilter?: string): ProviderStats[] {
    const statsMap = new Map<string, ProviderStats>();

    for (const usage of this.usageHistory) {
      if (providerFilter && !usage.provider.startsWith(providerFilter)) {
        continue;
      }

      if (!statsMap.has(usage.provider)) {
        statsMap.set(usage.provider, {
          provider: usage.provider,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          firstUsed: usage.timestamp,
          lastUsed: usage.timestamp
        });
      }

      const stats = statsMap.get(usage.provider)!;
      stats.totalInputTokens += usage.inputTokens;
      stats.totalOutputTokens += usage.outputTokens;
      stats.totalTokens += usage.totalTokens;
      stats.totalCost += usage.estimatedCost;
      stats.requestCount += 1;

      if (usage.timestamp < stats.firstUsed) {
        stats.firstUsed = usage.timestamp;
      }
      if (usage.timestamp > stats.lastUsed) {
        stats.lastUsed = usage.timestamp;
      }
    }

    return Array.from(statsMap.values());
  }

  /**
   * Get total statistics across all providers
   * @returns Overall statistics
   */
  getTotalStats(): {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    providers: number;
  } {
    const providerStats = this.getProviderStats();

    return {
      totalTokens: providerStats.reduce((sum, s) => sum + s.totalTokens, 0),
      totalCost: providerStats.reduce((sum, s) => sum + s.totalCost, 0),
      requestCount: providerStats.reduce((sum, s) => sum + s.requestCount, 0),
      providers: providerStats.length
    };
  }

  /**
   * Get usage report as formatted string
   * @param detailed Include detailed breakdown
   * @returns Formatted report
   */
  getUsageReport(detailed: boolean = false): string {
    const totalStats = this.getTotalStats();
    const providerStats = this.getProviderStats();

    let report = '📊 Token Usage Report\n';
    report += '═'.repeat(60) + '\n\n';

    report += '📈 Overall Statistics:\n';
    report += `   Total Requests: ${totalStats.requestCount.toLocaleString()}\n`;
    report += `   Total Tokens: ${totalStats.totalTokens.toLocaleString()}\n`;
    report += `   Estimated Cost: $${totalStats.totalCost.toFixed(4)}\n`;
    report += `   Providers Used: ${totalStats.providers}\n\n`;

    if (providerStats.length > 0) {
      report += '🔢 By Provider:\n';
      report += '─'.repeat(60) + '\n';

      for (const stats of providerStats) {
        report += `\n${stats.provider}:\n`;
        report += `   Requests: ${stats.requestCount.toLocaleString()}\n`;
        report += `   Input Tokens: ${stats.totalInputTokens.toLocaleString()}\n`;
        report += `   Output Tokens: ${stats.totalOutputTokens.toLocaleString()}\n`;
        report += `   Total Tokens: ${stats.totalTokens.toLocaleString()}\n`;
        report += `   Cost: $${stats.totalCost.toFixed(4)}\n`;

        if (detailed) {
          report += `   First Used: ${stats.firstUsed.toLocaleString()}\n`;
          report += `   Last Used: ${stats.lastUsed.toLocaleString()}\n`;
          const avgTokens = Math.round(stats.totalTokens / stats.requestCount);
          report += `   Avg Tokens/Request: ${avgTokens.toLocaleString()}\n`;
        }
      }
    } else {
      report += 'No usage data available yet.\n';
    }

    return report;
  }

  /**
   * Clear all usage history
   */
  clearHistory(): void {
    this.usageHistory = [];
    this.save();
  }

  /**
   * Export usage history as JSON
   * @returns JSON string
   */
  exportHistory(): string {
    return JSON.stringify(this.usageHistory, null, 2);
  }

  /**
   * Load usage history from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const parsed = JSON.parse(data);

        // Convert timestamp strings back to Date objects
        this.usageHistory = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load token usage history:', error);
      this.usageHistory = [];
    }
  }

  /**
   * Save usage history to disk
   */
  private save(): void {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.usageHistory, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save token usage history:', error);
    }
  }
}

export const tokenTrackerService = new TokenTrackerService();
