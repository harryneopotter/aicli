import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { ContextManagerService } from '../services/context-manager.service';

export type TerminalMode = 'shell' | 'ai';

export interface ContextInfo {
  workingDirectory: string;
  gitStatus: string | null;
  recentCommands: string[];
  projectType: string | null;
  recentOutput: string[];
}

@Component({
  selector: 'ai-terminal',
  template: `
    <div class="ai-terminal-container" role="main" aria-label="AI Terminal Interface">
      <!-- Mode Toggle Section -->
      <div class="mode-toggle-section" role="toolbar" aria-label="Terminal Mode Selection">
        <label class="mode-toggle-label" for="mode-toggle">
          Terminal Mode:
        </label>
        <div class="toggle-switch-container">
          <button 
            id="mode-toggle"
            class="toggle-switch"
            [class.shell-mode]="currentMode === 'shell'"
            [class.ai-mode]="currentMode === 'ai'"
            (click)="toggleMode()"
            (keydown.enter)="toggleMode()"
            (keydown.space)="$event.preventDefault(); toggleMode()"
            [attr.aria-pressed]="currentMode === 'ai'"
            aria-describedby="mode-description"
            type="button">
            <span class="toggle-slider" [attr.aria-hidden]="true"></span>
            <span class="mode-label shell-label" [class.active]="currentMode === 'shell'">Shell</span>
            <span class="mode-label ai-label" [class.active]="currentMode === 'ai'">AI</span>
          </button>
        </div>
        <div id="mode-description" class="mode-description" aria-live="polite">
          {{ getModeDescription() }}
        </div>
      </div>

      <!-- Context Information Panel -->
      <div class="context-panel" *ngIf="showContext && contextInfo" 
           role="region" aria-label="Context Information">
        <h3 class="context-title">Current Context</h3>
        
        <div class="context-section">
          <strong>Working Directory:</strong>
          <span class="context-value">{{ contextInfo.workingDirectory }}</span>
        </div>
        
        <div class="context-section" *ngIf="contextInfo.projectType">
          <strong>Project Type:</strong>
          <span class="context-value">{{ contextInfo.projectType }}</span>
        </div>
        
        <div class="context-section" *ngIf="contextInfo.gitStatus">
          <strong>Git Status:</strong>
          <span class="context-value">{{ contextInfo.gitStatus }}</span>
        </div>
        
        <div class="context-section" *ngIf="contextInfo.recentCommands.length > 0">
          <strong>Recent Commands:</strong>
          <ul class="recent-commands-list" role="list">
            <li *ngFor="let command of contextInfo.recentCommands.slice(-5)" 
                class="command-item" role="listitem">
              <code>{{ command }}</code>
            </li>
          </ul>
        </div>
        
        <div class="context-section" *ngIf="contextInfo.recentOutput.length > 0">
          <strong>Recent Output:</strong>
          <div class="recent-output">
            <pre *ngFor="let output of contextInfo.recentOutput.slice(-3)" 
                 class="output-line">{{ output }}</pre>
          </div>
        </div>
      </div>

      <!-- Control Buttons -->
      <div class="control-buttons" role="toolbar" aria-label="Terminal Controls">
        <button 
          class="btn btn-secondary"
          (click)="toggleContext()"
          [attr.aria-pressed]="showContext"
          type="button">
          {{ showContext ? 'Hide' : 'Show' }} Context
        </button>
        
        <button 
          class="btn btn-primary"
          (click)="refreshContext()"
          [disabled]="isRefreshing"
          type="button">
          {{ isRefreshing ? 'Refreshing...' : 'Refresh Context' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ai-terminal-container {
      padding: 16px;
      background: var(--bg-color, #1e1e1e);
      color: var(--text-color, #ffffff);
      border-radius: 8px;
      font-family: 'Consolas', 'Monaco', monospace;
    }

    .mode-toggle-section {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .mode-toggle-label {
      font-weight: 600;
      color: var(--text-secondary, #cccccc);
    }

    .toggle-switch-container {
      position: relative;
    }

    .toggle-switch {
      position: relative;
      width: 120px;
      height: 36px;
      background: var(--bg-secondary, #2d2d2d);
      border: 2px solid var(--border-color, #404040);
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;
      outline: none;
    }

    .toggle-switch:focus {
      box-shadow: 0 0 0 3px var(--focus-color, #007acc);
    }

    .toggle-switch:hover {
      border-color: var(--border-hover, #606060);
    }

    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 56px;
      height: 30px;
      background: var(--accent-color, #007acc);
      border-radius: 15px;
      transition: transform 0.3s ease;
      z-index: 1;
    }

    .toggle-switch.ai-mode .toggle-slider {
      transform: translateX(60px);
      background: var(--ai-color, #ff6b35);
    }

    .mode-label {
      position: relative;
      z-index: 2;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      transition: color 0.3s ease;
      pointer-events: none;
    }

    .mode-label.active {
      color: var(--text-on-accent, #ffffff);
    }

    .mode-label:not(.active) {
      color: var(--text-muted, #888888);
    }

    .mode-description {
      font-size: 14px;
      color: var(--text-secondary, #cccccc);
      font-style: italic;
    }

    .context-panel {
      background: var(--bg-tertiary, #252525);
      border: 1px solid var(--border-color, #404040);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .context-title {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary, #ffffff);
    }

    .context-section {
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .context-section strong {
      color: var(--text-accent, #4fc3f7);
      font-size: 14px;
    }

    .context-value {
      color: var(--text-secondary, #cccccc);
      font-family: monospace;
      background: var(--bg-code, #1a1a1a);
      padding: 4px 8px;
      border-radius: 4px;
      word-break: break-all;
    }

    .recent-commands-list {
      list-style: none;
      padding: 0;
      margin: 4px 0 0 0;
    }

    .command-item {
      margin-bottom: 4px;
    }

    .command-item code {
      background: var(--bg-code, #1a1a1a);
      color: var(--text-code, #f8f8f2);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      display: block;
    }

    .recent-output {
      background: var(--bg-code, #1a1a1a);
      border-radius: 4px;
      padding: 8px;
      max-height: 120px;
      overflow-y: auto;
    }

    .output-line {
      margin: 0;
      font-size: 12px;
      color: var(--text-output, #a6e22e);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .control-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      outline: none;
    }

    .btn:focus {
      box-shadow: 0 0 0 2px var(--focus-color, #007acc);
    }

    .btn-primary {
      background: var(--primary-color, #007acc);
      color: var(--text-on-primary, #ffffff);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover, #005a9e);
    }

    .btn-primary:disabled {
      background: var(--disabled-color, #666666);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--secondary-color, #6c757d);
      color: var(--text-on-secondary, #ffffff);
    }

    .btn-secondary:hover {
      background: var(--secondary-hover, #545b62);
    }

    .btn-secondary[aria-pressed="true"] {
      background: var(--secondary-active, #495057);
    }

    @media (max-width: 768px) {
      .mode-toggle-section {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .control-buttons {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
      }
    }
  `]
})
export class AITerminalComponent implements OnInit, OnDestroy {
  @Input() initialMode: TerminalMode = 'shell';
  @Output() modeChange = new EventEmitter<TerminalMode>();
  @Output() contextRefresh = new EventEmitter<void>();

  currentMode: TerminalMode = 'shell';
  showContext = false;
  isRefreshing = false;
  contextInfo: ContextInfo | null = null;
  
  private subscriptions = new Subscription();

  constructor(private contextManager: ContextManagerService) {}

  ngOnInit() {
    this.currentMode = this.initialMode;
    this.refreshContext();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  toggleMode() {
    this.currentMode = this.currentMode === 'shell' ? 'ai' : 'shell';
    this.modeChange.emit(this.currentMode);
    
    // Announce mode change for screen readers
    const announcement = `Switched to ${this.currentMode} mode. ${this.getModeDescription()}`;
    this.announceToScreenReader(announcement);
  }

  toggleContext() {
    this.showContext = !this.showContext;
    if (this.showContext && !this.contextInfo) {
      this.refreshContext();
    }
  }

  async refreshContext() {
    this.isRefreshing = true;
    this.contextRefresh.emit();
    
    try {
      const context = await this.contextManager.getFullContext();
      this.contextInfo = {
        workingDirectory: context.workingDirectory,
        gitStatus: context.gitStatus || null,
        recentCommands: context.recentCommands || [],
        projectType: context.projectType || null,
        recentOutput: context.recentOutput || []
      };
    } catch (error) {
      console.error('Failed to refresh context:', error);
      this.contextInfo = null;
    } finally {
      this.isRefreshing = false;
    }
  }

  getModeDescription(): string {
    return this.currentMode === 'shell' 
      ? 'Execute commands and natural language as shell operations'
      : 'Direct conversation with AI assistant';
  }

  private announceToScreenReader(message: string) {
    // Check if we're in a browser environment
    if (typeof document === 'undefined') {
      // In Node.js environment, we can't use document
      console.log(`Screen reader announcement: ${message}`);
      return;
    }
    
    // Create a temporary element for screen reader announcements
    /* eslint-disable no-undef */
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
    /* eslint-enable no-undef */
  }
}
