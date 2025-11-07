/**
 * File context loading service for including file contents in conversations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LoadedFile {
  path: string;
  content: string;
  size: number;
  lines: number;
}

export interface FileContextOptions {
  maxFileSize?: number; // Max file size in bytes (default: 100KB)
  maxFiles?: number; // Max files to load (default: 10)
  exclude?: string[]; // Patterns to exclude
}

const DEFAULT_OPTIONS: Required<FileContextOptions> = {
  maxFileSize: 100_000, // 100KB
  maxFiles: 10,
  exclude: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/*.map'
  ]
};

// Text file extensions
const TEXT_EXTENSIONS = new Set([
  // Code
  'ts', 'js', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
  'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'sh', 'bash',
  // Web
  'html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
  // Config/Data
  'json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env',
  // Docs
  'md', 'txt', 'rst', 'adoc',
  // Other
  'sql', 'graphql', 'proto', 'dockerfile'
]);

export class FileContextService {
  /**
   * Simple glob pattern matching
   * @param pattern Glob pattern
   * @param str String to match against
   * @returns True if matches
   */
  private matchPattern(pattern: string, str: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(str);
  }

  /**
   * Find files matching pattern
   * @param pattern File pattern (e.g., "*.ts" or "src/... /*.ts" with double asterisk)
   * @param directory Starting directory
   * @param exclude Patterns to exclude
   * @returns Matched file paths
   */
  private async findFiles(
    pattern: string,
    directory: string,
    exclude: string[]
  ): Promise<string[]> {
    const results: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Check if excluded
        if (exclude.some(pattern => fullPath.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    }

    await walk(directory);

    // Filter by pattern
    if (pattern.includes('*') || pattern.includes('?')) {
      return results.filter(file => {
        const relative = path.relative(directory, file);
        return this.matchPattern(pattern, relative) || this.matchPattern(pattern, path.basename(file));
      });
    } else {
      // Exact match
      return results.filter(file => file.endsWith(pattern) || path.basename(file) === pattern);
    }
  }

  /**
   * Load files matching patterns
   * @param patterns Glob patterns to match files
   * @param options Loading options
   * @returns Loaded files
   */
  async loadFiles(
    patterns: string[],
    options?: FileContextOptions
  ): Promise<LoadedFile[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const loadedFiles: LoadedFile[] = [];
    const seenPaths = new Set<string>();
    const cwd = process.cwd();

    for (const pattern of patterns) {
      try {
        const matches = await this.findFiles(pattern, cwd, opts.exclude);

        for (const filePath of matches) {
          // Check if already loaded
          if (seenPaths.has(filePath)) {
            continue;
          }

          // Check file limit
          if (loadedFiles.length >= opts.maxFiles) {
            console.warn(`Reached maximum file limit (${opts.maxFiles}). Skipping remaining files.`);
            break;
          }

          // Check if it's a text file
          if (!this.isTextFile(filePath)) {
            continue;
          }

          // Check file size
          const stats = await fs.promises.stat(filePath);
          if (stats.size > opts.maxFileSize) {
            console.warn(`File too large (${stats.size} bytes): ${filePath}. Skipping.`);
            continue;
          }

          // Load file content
          try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split('\n').length;

            loadedFiles.push({
              path: path.relative(process.cwd(), filePath),
              content,
              size: stats.size,
              lines
            });

            seenPaths.add(filePath);
          } catch (error) {
            console.warn(`Failed to read file: ${filePath}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to process pattern "${pattern}":`, error);
      }
    }

    return loadedFiles;
  }

  /**
   * Format loaded files for context
   * @param files Files to format
   * @returns Formatted context string
   */
  formatFilesForContext(files: LoadedFile[]): string {
    if (files.length === 0) {
      return 'No files loaded.';
    }

    let context = `Loaded ${files.length} file(s) into context:\n\n`;

    for (const file of files) {
      const ext = path.extname(file.path).slice(1);
      context += `📄 File: ${file.path} (${file.lines} lines, ${this.formatSize(file.size)})\n`;
      context += '```' + ext + '\n';
      context += file.content;
      if (!file.content.endsWith('\n')) {
        context += '\n';
      }
      context += '```\n\n';
    }

    return context;
  }

  /**
   * Get summary of loaded files
   * @param files Files to summarize
   * @returns Summary string
   */
  getSummary(files: LoadedFile[]): string {
    if (files.length === 0) {
      return 'No files loaded.';
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

    let summary = `Loaded ${files.length} file(s):\n`;
    for (const file of files) {
      summary += `  • ${file.path} (${file.lines} lines)\n`;
    }
    summary += `\nTotal: ${totalLines} lines, ${this.formatSize(totalSize)}`;

    return summary;
  }

  /**
   * Check if a file is a text file
   * @param filePath File path
   * @returns True if text file
   */
  private isTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return TEXT_EXTENSIONS.has(ext);
  }

  /**
   * Format file size in human-readable format
   * @param bytes Size in bytes
   * @returns Formatted string
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  /**
   * Load a single file
   * @param filePath Path to file
   * @returns Loaded file or null
   */
  async loadSingleFile(filePath: string): Promise<LoadedFile | null> {
    try {
      const resolved = path.resolve(filePath);

      if (!this.isTextFile(resolved)) {
        throw new Error('Not a text file');
      }

      const stats = await fs.promises.stat(resolved);

      if (stats.size > DEFAULT_OPTIONS.maxFileSize) {
        throw new Error(`File too large (${stats.size} bytes)`);
      }

      const content = await fs.promises.readFile(resolved, 'utf8');
      const lines = content.split('\n').length;

      return {
        path: path.relative(process.cwd(), resolved),
        content,
        size: stats.size,
        lines
      };
    } catch (error: any) {
      console.error(`Failed to load file ${filePath}:`, error.message);
      return null;
    }
  }
}

export const fileContextService = new FileContextService();
