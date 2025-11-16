/**
 * Conversation templates for common tasks
 */

export interface ConversationTemplate {
  name: string;
  description: string;
  category: string;
  prompt: string;
  variables: string[]; // Variables that need to be filled: {varName}
}

export const TEMPLATES: Record<string, ConversationTemplate> = {
  'debug': {
    name: 'Debug Error',
    description: 'Get help debugging an error message',
    category: 'debugging',
    prompt: `I have an error in my code. Here's the error message:

{error}

And here's the relevant code:

{code}

Can you help me understand what's causing this error and how to fix it?`,
    variables: ['error', 'code']
  },

  'explain': {
    name: 'Explain Code',
    description: 'Get a detailed explanation of how code works',
    category: 'learning',
    prompt: `Can you explain what this code does?

{code}

Please break it down step by step and explain:
1. What the overall purpose is
2. How each part works
3. Any important concepts or patterns used`,
    variables: ['code']
  },

  'refactor': {
    name: 'Refactor Code',
    description: 'Get suggestions for improving code',
    category: 'improvement',
    prompt: `I want to refactor this code to make it more {goal}:

{code}

Can you suggest improvements and explain why they would help?`,
    variables: ['code', 'goal']
  },

  'test': {
    name: 'Generate Tests',
    description: 'Generate unit tests for code',
    category: 'testing',
    prompt: `Generate comprehensive unit tests for this code:

{code}

Please use {framework} testing framework and include:
1. Test cases for normal operation
2. Edge cases
3. Error conditions
4. Clear test descriptions`,
    variables: ['code', 'framework']
  },

  'document': {
    name: 'Add Documentation',
    description: 'Generate documentation for code',
    category: 'documentation',
    prompt: `Add comprehensive documentation to this code:

{code}

Please include:
1. Function/class description
2. Parameter descriptions
3. Return value description
4. Usage examples
5. Any important notes or warnings

Use {style} documentation style.`,
    variables: ['code', 'style']
  },

  'review': {
    name: 'Code Review',
    description: 'Get a code review with suggestions',
    category: 'quality',
    prompt: `Please review this code:

{code}

Provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Readability and maintainability`,
    variables: ['code']
  },

  'optimize': {
    name: 'Optimize Performance',
    description: 'Get suggestions for performance optimization',
    category: 'performance',
    prompt: `This code has performance issues:

{code}

Current performance problem: {problem}

Can you suggest optimizations to improve performance?`,
    variables: ['code', 'problem']
  },

  'convert': {
    name: 'Convert Language',
    description: 'Convert code from one language to another',
    category: 'conversion',
    prompt: `Convert this {fromLang} code to {toLang}:

{code}

Please maintain the same functionality and add comments explaining any language-specific differences.`,
    variables: ['code', 'fromLang', 'toLang']
  },

  'fix': {
    name: 'Fix Bug',
    description: 'Fix a specific bug in code',
    category: 'debugging',
    prompt: `This code has a bug:

{code}

The bug is: {bugDescription}

Steps to reproduce:
{steps}

Can you identify the bug and provide a fix?`,
    variables: ['code', 'bugDescription', 'steps']
  },

  'implement': {
    name: 'Implement Feature',
    description: 'Implement a new feature',
    category: 'development',
    prompt: `I need to implement this feature:

{featureDescription}

In the context of this existing code:

{code}

Please provide:
1. Implementation code
2. Explanation of the approach
3. Any necessary tests
4. Integration steps`,
    variables: ['featureDescription', 'code']
  },

  'security': {
    name: 'Security Audit',
    description: 'Check code for security vulnerabilities',
    category: 'security',
    prompt: `Please audit this code for security vulnerabilities:

{code}

Check for:
1. SQL injection
2. XSS vulnerabilities
3. Authentication/authorization issues
4. Input validation problems
5. Other security concerns

Provide specific recommendations for fixes.`,
    variables: ['code']
  },

  'simplify': {
    name: 'Simplify Code',
    description: 'Make code simpler and more readable',
    category: 'improvement',
    prompt: `This code is too complex:

{code}

Can you simplify it while maintaining the same functionality? Focus on:
1. Reducing complexity
2. Improving readability
3. Removing duplication
4. Making it more maintainable`,
    variables: ['code']
  },

  'api': {
    name: 'API Integration',
    description: 'Help integrating with an API',
    category: 'development',
    prompt: `I need to integrate with the {apiName} API.

API documentation/endpoint: {apiDocs}

What I need to do: {task}

Can you provide:
1. Sample code for making the API calls
2. Error handling
3. Response parsing
4. Best practices for this API`,
    variables: ['apiName', 'apiDocs', 'task']
  },

  'cli': {
    name: 'CLI Command Help',
    description: 'Get help with command line commands',
    category: 'command-line',
    prompt: `I need help with a command line task:

Task: {task}

Operating System: {os}

Can you provide:
1. The exact command(s) to run
2. Explanation of what each part does
3. Any important flags or options
4. Common variations or alternatives`,
    variables: ['task', 'os']
  },

  'git': {
    name: 'Git Help',
    description: 'Get help with Git operations',
    category: 'git',
    prompt: `I need help with this Git situation:

{situation}

Current state:
{gitStatus}

What I want to achieve:
{goal}

Please provide the Git commands I need and explain what they do.`,
    variables: ['situation', 'gitStatus', 'goal']
  }
};

/**
 * Get template by name
 * @param name Template name
 * @returns Template or undefined
 */
export function getTemplate(name: string): ConversationTemplate | undefined {
  return TEMPLATES[name];
}

/**
 * List all templates
 * @returns Array of templates
 */
export function listTemplates(): ConversationTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Get templates by category
 * @param category Category name
 * @returns Array of templates in category
 */
export function getTemplatesByCategory(category: string): ConversationTemplate[] {
  return Object.values(TEMPLATES).filter(t => t.category === category);
}

/**
 * Get all categories
 * @returns Array of unique categories
 */
export function getCategories(): string[] {
  const categories = new Set(Object.values(TEMPLATES).map(t => t.category));
  return Array.from(categories).sort();
}

/**
 * Fill template with variables
 * @param template Template to fill
 * @param variables Variable values
 * @returns Filled prompt
 */
export function fillTemplate(
  template: ConversationTemplate,
  variables: Record<string, string>
): string {
  let prompt = template.prompt;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
  }

  return prompt;
}

/**
 * Extract variables from template prompt
 * @param prompt Template prompt
 * @returns Array of variable names
 */
export function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{(\w+)\}/g) || [];
  return matches.map(m => m.slice(1, -1));
}
