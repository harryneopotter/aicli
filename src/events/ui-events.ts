import { EventEmitter } from 'events';
import { Message } from '../types';

/**
 * UI Events for decoupling services from UI rendering
 */
export enum UIEventType {
  MESSAGE = 'ui:message',
  LOADING = 'ui:loading',
  STOP_LOADING = 'ui:stopLoading',
  STREAMING_START = 'ui:streamingStart',
  STREAMING_CHUNK = 'ui:streamingChunk',
  STREAMING_END = 'ui:streamingEnd',
  INFO = 'ui:info',
  WARNING = 'ui:warning',
  ERROR = 'ui:error',
  SUCCESS = 'ui:success',
  CODE_BLOCK = 'ui:codeBlock',
}

export interface UIMessageEvent {
  message: Message;
}

export interface UILoadingEvent {
  text?: string;
}

export interface UIStreamingChunkEvent {
  chunk: string;
}

export interface UITextEvent {
  text: string;
}

export interface UIErrorEvent {
  message: string;
  error?: Error;
}

export interface UICodeBlockEvent {
  code: string;
  language?: string;
}

/**
 * Event emitter for UI events
 */
class UIEventEmitter extends EventEmitter {
  emitMessage(message: Message): void {
    this.emit(UIEventType.MESSAGE, { message } as UIMessageEvent);
  }

  emitLoading(text?: string): void {
    this.emit(UIEventType.LOADING, { text } as UILoadingEvent);
  }

  emitStopLoading(): void {
    this.emit(UIEventType.STOP_LOADING);
  }

  emitStreamingStart(): void {
    this.emit(UIEventType.STREAMING_START);
  }

  emitStreamingChunk(chunk: string): void {
    this.emit(UIEventType.STREAMING_CHUNK, { chunk } as UIStreamingChunkEvent);
  }

  emitStreamingEnd(): void {
    this.emit(UIEventType.STREAMING_END);
  }

  emitInfo(text: string): void {
    this.emit(UIEventType.INFO, { text } as UITextEvent);
  }

  emitWarning(text: string): void {
    this.emit(UIEventType.WARNING, { text } as UITextEvent);
  }

  emitError(message: string, error?: Error): void {
    this.emit(UIEventType.ERROR, { message, error } as UIErrorEvent);
  }

  emitSuccess(text: string): void {
    this.emit(UIEventType.SUCCESS, { text } as UITextEvent);
  }

  emitCodeBlock(code: string, language?: string): void {
    this.emit(UIEventType.CODE_BLOCK, { code, language } as UICodeBlockEvent);
  }

  onMessage(handler: (event: UIMessageEvent) => void): void {
    this.on(UIEventType.MESSAGE, handler);
  }

  onLoading(handler: (event: UILoadingEvent) => void): void {
    this.on(UIEventType.LOADING, handler);
  }

  onStopLoading(handler: () => void): void {
    this.on(UIEventType.STOP_LOADING, handler);
  }

  onStreamingStart(handler: () => void): void {
    this.on(UIEventType.STREAMING_START, handler);
  }

  onStreamingChunk(handler: (event: UIStreamingChunkEvent) => void): void {
    this.on(UIEventType.STREAMING_CHUNK, handler);
  }

  onStreamingEnd(handler: () => void): void {
    this.on(UIEventType.STREAMING_END, handler);
  }

  onInfo(handler: (event: UITextEvent) => void): void {
    this.on(UIEventType.INFO, handler);
  }

  onWarning(handler: (event: UITextEvent) => void): void {
    this.on(UIEventType.WARNING, handler);
  }

  onError(handler: (event: UIErrorEvent) => void): void {
    this.on(UIEventType.ERROR, handler);
  }

  onSuccess(handler: (event: UITextEvent) => void): void {
    this.on(UIEventType.SUCCESS, handler);
  }

  onCodeBlock(handler: (event: UICodeBlockEvent) => void): void {
    this.on(UIEventType.CODE_BLOCK, handler);
  }
}

export const uiEvents = new UIEventEmitter();
