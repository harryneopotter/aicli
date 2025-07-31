import { Injectable } from '@angular/core';

@Injectable()
export class ContextManagerService {
  addTerminalOutput(data: string) {
    // Placeholder
  }

  addUserInput(data: string) {
    // Placeholder
  }

  addCommand(command: string) {
    // Placeholder
  }

  async getFullContext(): Promise<any> {
    return {
      workingDirectory: process.cwd(),
      gitStatus: null,
      recentCommands: [],
      projectType: null,
      activeFiles: []
    };
  }
}
