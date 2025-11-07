/**
 * Configuration validation utilities
 */

import { Config } from '../types';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate configuration object
 * @param config Configuration to validate
 * @returns Validation result
 */
export function validateConfig(config: Partial<Config>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate defaultProvider
  if (config.defaultProvider) {
    if (!['ollama', 'openai', 'anthropic', 'gemini'].includes(config.defaultProvider)) {
      errors.push({
        field: 'defaultProvider',
        message: 'Must be one of: ollama, openai, anthropic, gemini',
        value: config.defaultProvider
      });
    }
  }

  // Validate providers
  if (config.providers) {
    // Validate Ollama
    if (config.providers.ollama) {
      const ollama = config.providers.ollama;
      if (ollama.endpoint && !isValidUrl(ollama.endpoint)) {
        errors.push({
          field: 'providers.ollama.endpoint',
          message: 'Must be a valid URL',
          value: ollama.endpoint
        });
      }
      if (ollama.model && typeof ollama.model !== 'string') {
        errors.push({
          field: 'providers.ollama.model',
          message: 'Must be a string',
          value: ollama.model
        });
      }
    }

    // Validate OpenAI
    if (config.providers.openai) {
      const openai = config.providers.openai;
      if (openai.apiKey) {
        if (!openai.apiKey.startsWith('sk-')) {
          errors.push({
            field: 'providers.openai.apiKey',
            message: 'OpenAI API keys should start with "sk-"',
            value: '[REDACTED]'
          });
        }
        if (openai.apiKey.length < 20) {
          errors.push({
            field: 'providers.openai.apiKey',
            message: 'API key seems too short',
            value: '[REDACTED]'
          });
        }
      }
      if (openai.model && typeof openai.model !== 'string') {
        errors.push({
          field: 'providers.openai.model',
          message: 'Must be a string',
          value: openai.model
        });
      }
    }

    // Validate Anthropic
    if (config.providers.anthropic) {
      const anthropic = config.providers.anthropic;
      if (anthropic.apiKey && anthropic.apiKey.length < 20) {
        errors.push({
          field: 'providers.anthropic.apiKey',
          message: 'API key seems too short',
          value: '[REDACTED]'
        });
      }
      if (anthropic.model && typeof anthropic.model !== 'string') {
        errors.push({
          field: 'providers.anthropic.model',
          message: 'Must be a string',
          value: anthropic.model
        });
      }
    }

    // Validate Gemini
    if (config.providers.gemini) {
      const gemini = config.providers.gemini;
      if (gemini.apiKey && gemini.apiKey.length < 20) {
        errors.push({
          field: 'providers.gemini.apiKey',
          message: 'API key seems too short',
          value: '[REDACTED]'
        });
      }
      if (gemini.model && typeof gemini.model !== 'string') {
        errors.push({
          field: 'providers.gemini.model',
          message: 'Must be a string',
          value: gemini.model
        });
      }
    }
  }

  // Validate UI settings
  if (config.ui) {
    if (config.ui.theme && !['dark', 'light'].includes(config.ui.theme)) {
      errors.push({
        field: 'ui.theme',
        message: 'Must be "dark" or "light"',
        value: config.ui.theme
      });
    }
    if (config.ui.markdown !== undefined && typeof config.ui.markdown !== 'boolean') {
      errors.push({
        field: 'ui.markdown',
        message: 'Must be a boolean',
        value: config.ui.markdown
      });
    }
    if (config.ui.streaming !== undefined && typeof config.ui.streaming !== 'boolean') {
      errors.push({
        field: 'ui.streaming',
        message: 'Must be a boolean',
        value: config.ui.streaming
      });
    }
  }

  // Validate context settings
  if (config.context) {
    if (config.context.maxHistory !== undefined) {
      if (typeof config.context.maxHistory !== 'number') {
        errors.push({
          field: 'context.maxHistory',
          message: 'Must be a number',
          value: config.context.maxHistory
        });
      } else if (config.context.maxHistory < 1 || config.context.maxHistory > 1000) {
        errors.push({
          field: 'context.maxHistory',
          message: 'Must be between 1 and 1000',
          value: config.context.maxHistory
        });
      }
    }
    if (config.context.includeGit !== undefined && typeof config.context.includeGit !== 'boolean') {
      errors.push({
        field: 'context.includeGit',
        message: 'Must be a boolean',
        value: config.context.includeGit
      });
    }
    if (config.context.includeFiles !== undefined && typeof config.context.includeFiles !== 'boolean') {
      errors.push({
        field: 'context.includeFiles',
        message: 'Must be a boolean',
        value: config.context.includeFiles
      });
    }
    if (config.context.autoContext !== undefined && typeof config.context.autoContext !== 'boolean') {
      errors.push({
        field: 'context.autoContext',
        message: 'Must be a boolean',
        value: config.context.autoContext
      });
    }
  }

  // Validate session settings
  if (config.session) {
    if (config.session.autosave !== undefined && typeof config.session.autosave !== 'boolean') {
      errors.push({
        field: 'session.autosave',
        message: 'Must be a boolean',
        value: config.session.autosave
      });
    }
    if (config.session.directory && typeof config.session.directory !== 'string') {
      errors.push({
        field: 'session.directory',
        message: 'Must be a string path',
        value: config.session.directory
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a string is a valid URL
 * @param url String to validate
 * @returns True if valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate a single configuration field
 * @param field Field path (e.g., 'providers.openai.apiKey')
 * @param value Value to validate
 * @returns Validation result
 */
export function validateField(field: string, value: any): ValidationResult {
  const errors: ValidationError[] = [];

  const parts = field.split('.');

  if (parts[0] === 'defaultProvider') {
    if (!['ollama', 'openai', 'anthropic', 'gemini'].includes(value)) {
      errors.push({
        field,
        message: 'Must be one of: ollama, openai, anthropic, gemini',
        value
      });
    }
  }

  if (parts[0] === 'providers') {
    if (parts[1] === 'ollama' && parts[2] === 'endpoint') {
      if (!isValidUrl(value)) {
        errors.push({
          field,
          message: 'Must be a valid URL (http:// or https://)',
          value
        });
      }
    }

    if (parts[2] === 'apiKey') {
      if (typeof value !== 'string') {
        errors.push({
          field,
          message: 'API key must be a string',
          value: '[REDACTED]'
        });
      } else if (value.length < 20) {
        errors.push({
          field,
          message: 'API key seems too short (should be at least 20 characters)',
          value: '[REDACTED]'
        });
      } else if (parts[1] === 'openai' && !value.startsWith('sk-')) {
        errors.push({
          field,
          message: 'OpenAI API keys should start with "sk-"',
          value: '[REDACTED]'
        });
      }
    }
  }

  if (parts[0] === 'ui' && parts[1] === 'theme') {
    if (!['dark', 'light'].includes(value)) {
      errors.push({
        field,
        message: 'Theme must be "dark" or "light"',
        value
      });
    }
  }

  if (parts[0] === 'context' && parts[1] === 'maxHistory') {
    if (typeof value !== 'number') {
      errors.push({
        field,
        message: 'Must be a number',
        value
      });
    } else if (value < 1 || value > 1000) {
      errors.push({
        field,
        message: 'Must be between 1 and 1000',
        value
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format validation errors for display
 * @param errors Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Configuration is valid';
  }

  let message = 'Configuration validation failed:\n\n';

  errors.forEach((error, index) => {
    message += `${index + 1}. ${error.field}: ${error.message}\n`;
    if (error.value !== '[REDACTED]' && error.value !== undefined) {
      message += `   Current value: ${JSON.stringify(error.value)}\n`;
    }
  });

  return message;
}
