import { configService } from './config.service';
import inquirer from 'inquirer';
import { uiRenderer } from '../ui/renderer';
import { uiEvents } from '../events/ui-events';

export class OnboardingService {
    private readonly ONBOARDING_KEY = 'onboardingCompleted';

    isFirstRun(): boolean {
        try {
            const completed = configService.get(this.ONBOARDING_KEY as any);
            return !completed;
        } catch {
            return true;
        }
    }

    markOnboardingComplete(): void {
        configService.set(this.ONBOARDING_KEY as any, true);
    }

    async promptOnboarding(): Promise<boolean> {
        const { shouldOnboard } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldOnboard',
                message: 'It looks like this is your first time using Warp CLI. Would you like to run the setup wizard?',
                default: true,
            },
        ]);

        return shouldOnboard;
    }

    async runQuickOnboarding(): Promise<void> {
        uiRenderer.clear();
        uiEvents.emitInfo('\n═══ Warp CLI - Quick Setup ═══\nLet\'s get you started! This will only take a minute.\n');

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'provider',
                message: 'Choose your default LLM provider:',
                choices: [
                    { name: 'Ollama (Local - Free)', value: 'ollama' },
                    { name: 'OpenAI (API Key Required)', value: 'openai' },
                    { name: 'Anthropic Claude (API Key Required)', value: 'anthropic' },
                    { name: 'Google Gemini (API Key Required)', value: 'gemini' },
                ],
                default: 'ollama',
            },
        ]);

        configService.set('defaultProvider', answers.provider);

        // Provider-specific setup
        if (answers.provider === 'ollama') {
            const ollamaAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'endpoint',
                    message: 'Ollama endpoint:',
                    default: 'http://localhost:11434',
                },
                {
                    type: 'input',
                    name: 'model',
                    message: 'Default model:',
                    default: 'llama3.2',
                },
            ]);

            configService.setProviderConfig('ollama', ollamaAnswers);
        } else {
            const apiAnswers = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: `${answers.provider} API Key (stored securely in keychain):`,
                    mask: '*',
                },
                {
                    type: 'input',
                    name: 'model',
                    message: 'Default model:',
                    default:
                        answers.provider === 'openai'
                            ? 'gpt-4-turbo-preview'
                            : answers.provider === 'anthropic'
                                ? 'claude-3-5-sonnet-20241022'
                                : 'gemini-1.5-flash',
                },
            ]);

            configService.setProviderConfig(answers.provider, apiAnswers);
        }

        // UI preferences
        const uiAnswers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'streaming',
                message: 'Enable streaming responses?',
                default: true,
            },
        ]);

        configService.set('ui', {
            ...configService.get('ui'),
            streaming: uiAnswers.streaming,
        });

        this.markOnboardingComplete();
        uiEvents.emitSuccess('Setup complete! Starting Warp CLI...\n');
    }
}

export const onboardingService = new OnboardingService();
