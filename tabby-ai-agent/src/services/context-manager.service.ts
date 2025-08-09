import { Injectable } from '@angular/core';
import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import { ContextInfo, PackageInfo } from '../types/interfaces';

const git: SimpleGit = simpleGit();

interface ContextCache {
  workingDir: string;
  gitStatus?: string | null;
  projectType?: string | null;
  packageInfo?: PackageInfo | null;
  lastUpdated: number;
}

@Injectable()
export class ContextManagerService {
  private terminalOutput: string[] = [];
  private userInputs: string[] = [];
  private recentCommands: string[] = [];
  private contextCache: ContextCache = {
    workingDir: process.cwd(),
    lastUpdated: 0
  };
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_HISTORY = 50;

  addTerminalOutput(data: string) {
    // Filter out ANSI escape codes and clean the output
    // eslint-disable-next-line no-control-regex
    const cleanData = data.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (cleanData.length > 0) {
      this.terminalOutput.push(cleanData);
      // Keep only recent output
      if (this.terminalOutput.length > this.MAX_HISTORY) {
        this.terminalOutput = this.terminalOutput.slice(-this.MAX_HISTORY);
      }
    }
  }

  addUserInput(data: string) {
    if (data.trim().length > 0) {
      this.userInputs.push(data.trim());
      if (this.userInputs.length > this.MAX_HISTORY) {
        this.userInputs = this.userInputs.slice(-this.MAX_HISTORY);
      }
    }
  }

  addCommand(command: string) {
    if (command.trim().length > 0) {
      this.recentCommands.push(command.trim());
      if (this.recentCommands.length > this.MAX_HISTORY) {
        this.recentCommands = this.recentCommands.slice(-this.MAX_HISTORY);
      }
    }
  }

  async getFullContext(): Promise<ContextInfo> {
    const now = Date.now();
    
    // Check if cache is still valid
    if (this.contextCache.lastUpdated && (now - this.contextCache.lastUpdated) < this.CACHE_TTL) {
      return this.buildContextResponse();
    }

    // Update cache with fresh data
    await this.updateContextCache();
    
    return this.buildContextResponse();
  }

  private async updateContextCache(): Promise<void> {
    try {
      // Get current working directory
      this.contextCache.workingDir = process.cwd();
      
      // Get git status
      this.contextCache.gitStatus = await this.getGitStatus();
      
      // Detect project type
      this.contextCache.projectType = await this.detectProjectType();
      
      // Get package info if available
      this.contextCache.packageInfo = await this.getPackageInfo();
      
      this.contextCache.lastUpdated = Date.now();
    } catch (error) {
      console.warn('Error updating context cache:', error instanceof Error ? error.message : String(error));
    }
  }

  private async getGitStatus(): Promise<string | null> {
    try {
      const status = await git.status();
      if (status.files.length > 0) {
        return `Branch: ${status.current}, Changes: ${status.files.length} files`;
      } else {
        return `Branch: ${status.current}, Clean working tree`;
      }
    } catch (error) {
      return null; // Not a git repository or git not available
    }
  }

  private async detectProjectType(): Promise<string | null> {
    const cwd = this.contextCache.workingDir;
    
    if (!cwd) {
      return null;
    }
    
    try {
      // Check for common project files
      const projectFiles = [
        { file: 'package.json', type: 'Node.js/JavaScript' },
        { file: 'Cargo.toml', type: 'Rust' },
        { file: 'go.mod', type: 'Go' },
        { file: 'requirements.txt', type: 'Python' },
        { file: 'Pipfile', type: 'Python (Pipenv)' },
        { file: 'pyproject.toml', type: 'Python (Poetry)' },
        { file: 'pom.xml', type: 'Java (Maven)' },
        { file: 'build.gradle', type: 'Java (Gradle)' },
        { file: 'Gemfile', type: 'Ruby' },
        { file: 'composer.json', type: 'PHP' },
        { file: '.csproj', type: 'C#/.NET' },
      ];

      for (const { file, type } of projectFiles) {
        if (file.endsWith('.csproj')) {
          // Check for any .csproj file
          const files = await fs.promises.readdir(cwd);
          if (files.some(f => f.endsWith('.csproj'))) {
            return type;
          }
        } else {
          const filePath = path.join(cwd, file);
          if (await this.fileExists(filePath)) {
            return type;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async getPackageInfo(): Promise<PackageInfo | null> {
    try {
      const workingDir = this.contextCache.workingDir;
      if (!workingDir) {
        return null;
      }
      
      const packageJsonPath = path.join(workingDir, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const content = await fs.promises.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(content);
        return {
          name: packageJson.name,
          version: packageJson.version,
          scripts: Object.keys(packageJson.scripts || {}),
          dependencies: Object.keys(packageJson.dependencies || {}),
          devDependencies: Object.keys(packageJson.devDependencies || {})
        };
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private buildContextResponse(): ContextInfo {
    return {
      workingDirectory: this.contextCache.workingDir || process.cwd(),
      gitStatus: this.contextCache.gitStatus,
      recentCommands: this.recentCommands.slice(-10), // Last 10 commands
      projectType: this.contextCache.projectType,
      packageInfo: this.contextCache.packageInfo,
      recentOutput: this.terminalOutput.slice(-5), // Last 5 outputs
      recentInputs: this.userInputs.slice(-5), // Last 5 inputs
      activeFiles: [], // TODO: Implement if Tabby provides active file info
      cacheAge: this.contextCache.lastUpdated ? Date.now() - this.contextCache.lastUpdated : 0
    };
  }

  // Utility method to clear cache when needed
  clearCache(): void {
    this.contextCache = {
      workingDir: process.cwd(),
      lastUpdated: 0
    };
  }

  // Get performance info
  getContextStats(): {
    terminalOutputLines: number;
    userInputs: number;
    recentCommands: number;
    cacheAge: number;
    isCacheValid: boolean;
  } {
    return {
      terminalOutputLines: this.terminalOutput.length,
      userInputs: this.userInputs.length,
      recentCommands: this.recentCommands.length,
      cacheAge: this.contextCache.lastUpdated ? Date.now() - this.contextCache.lastUpdated : 0,
      isCacheValid: this.contextCache.lastUpdated && (Date.now() - this.contextCache.lastUpdated) < this.CACHE_TTL
    };
  }
}
