import { PluginService } from './plugin.service';

export interface AutocompleteSuggestion {
  value: string;
  description?: string;
}

const BASE_COMMANDS: AutocompleteSuggestion[] = [
  { value: '/help', description: 'Show help menu' },
  { value: '/clear', description: 'Clear the terminal output' },
  { value: '/new', description: 'Start a new session' },
  { value: '/save', description: 'Save current session' },
  { value: '/load', description: 'Load a session by id' },
  { value: '/list', description: 'List sessions' },
  { value: '/search', description: 'Search sessions' },
  { value: '/export', description: 'Export a session' },
  { value: '/config', description: 'Show configuration' },
  { value: '/provider', description: 'Switch provider' },
  { value: '/model', description: 'Set model' },
  { value: '/context', description: 'Show context snapshot' },
  { value: '/ctxfile', description: 'Manage context file attachments' },
  { value: '/diff', description: 'Show git diff' },
  { value: '/exec', description: 'Execute shell command' },
  { value: '/git', description: 'Run git command' },
  { value: '/stats', description: 'Session statistics' },
  { value: '/explain', description: 'Explain a command' },
  { value: '/suggest', description: 'Suggest a command' },
  { value: '/plugins', description: 'List installed plugins' },
  { value: '/plugin', description: 'Run a plugin' },
  { value: '/undo', description: 'Undo last chat interaction' },
  { value: '/autocomplete', description: 'Show suggestions for prefix' }
];

export class AutocompleteService {
  constructor(private readonly pluginService: PluginService) {}

  suggest(prefix: string): AutocompleteSuggestion[] {
    if (!prefix) return [];
    const normalized = prefix.startsWith('/') ? prefix.toLowerCase() : `/${prefix.toLowerCase()}`;

    const baseMatches = BASE_COMMANDS.filter(item => item.value.startsWith(normalized));

    const pluginMatches = this.pluginService.listPlugins()
      .map(plugin => ({
        value: `/plugin ${plugin.name}`,
        description: plugin.description
      }))
      .filter(item => item.value.toLowerCase().startsWith(normalized));

    return [...baseMatches, ...pluginMatches].slice(0, 10);
  }
}
