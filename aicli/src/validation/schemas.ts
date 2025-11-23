import { z } from 'zod';

/**
 * Validation schemas for tool arguments and user inputs
 */

// Common validators
export const filePathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .max(1024, 'Path too long')
  .refine(
    (path) => !path.includes('..'),
    'Path traversal not allowed'
  )
  .refine(
    (path) => !/[<>:"|?*]/.test(path),
    'Invalid characters in path'
  );

export const commandSchema = z.string()
  .min(1, 'Command cannot be empty')
  .max(2048, 'Command too long')
  .refine(
    (cmd) => !/[;&|`$()<>#\n\r\0]/.test(cmd),
    'Command contains dangerous characters'
  );

// Tool argument schemas
export const execToolArgsSchema = z.object({
  command: commandSchema,
});

export const readFileToolArgsSchema = z.object({
  path: filePathSchema,
});

export const writeFileToolArgsSchema = z.object({
  path: filePathSchema,
  content: z.string().max(1024 * 1024, 'Content too large (max 1MB)'),
});

export const listFilesToolArgsSchema = z.object({
  path: filePathSchema.default('.'),
});

export const searchCodeToolArgsSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .max(500, 'Query too long'),
  limit: z.number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .optional(),
});

export const logActivityToolArgsSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long'),
  details: z.string()
    .min(1, 'Details required')
    .max(5000, 'Details too long'),
  files: z.array(filePathSchema).default([]),
});

// Provider config schemas
export const providerConfigSchema = z.object({
  model: z.string().min(1),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

// Session schemas
export const sessionMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  created: z.date(),
  updated: z.date(),
  messageCount: z.number().int().nonnegative(),
});

// Map tool names to their schemas
export const toolSchemas: Record<string, z.ZodSchema> = {
  exec: execToolArgsSchema,
  read_file: readFileToolArgsSchema,
  write_file: writeFileToolArgsSchema,
  list_files: listFilesToolArgsSchema,
  search_code: searchCodeToolArgsSchema,
  log_activity: logActivityToolArgsSchema,
};

/**
 * Validate tool arguments
 */
export function validateToolArgs(toolName: string, args: unknown): {
  success: boolean;
  data?: any;
  errors?: string[];
} {
  const schema = toolSchemas[toolName];

  if (!schema) {
    return {
      success: false,
      errors: [`No validation schema for tool: ${toolName}`],
    };
  }

  const result = schema.safeParse(args);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    ),
  };
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: unknown): {
  success: boolean;
  data?: any;
  errors?: string[];
} {
  const result = providerConfigSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    ),
  };
}
