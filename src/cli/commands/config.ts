import chalk from 'chalk';
import { loadConfig, saveConfig, getConfigPath } from '../../utils/config.js';
import type { UserConfig } from '../../types.js';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

interface ConfigOptions {
  setAnthropicKey?: string;
  setPerplexityKey?: string;
  setDefaultAgent?: string;
  setModel?: string;
  show?: boolean;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  const config = await loadConfig();

  if (options.show || Object.keys(options).length === 0) {
    console.log(chalk.cyan('\n📋 Current Configuration\n'));
    console.log(chalk.gray(`Config file: ${getConfigPath()}\n`));

    console.log(`Anthropic API Key: ${config.anthropicApiKey ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
    console.log(`Perplexity API Key: ${config.perplexityApiKey ? chalk.green('✓ Set') : chalk.yellow('○ Not set (optional)')}`);
    console.log(`Default Agent: ${chalk.white(config.defaultAgent)}`);
    console.log(`Output Directory: ${chalk.white(config.outputDir)}`);
    console.log(`Claude Model: ${chalk.white(config.claudeModel || DEFAULT_MODEL)}`);

    console.log(chalk.gray('\nEnvironment variables (override config file):'));
    console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? chalk.green('✓ Set') : chalk.gray('Not set')}`);
    console.log(`  PERPLEXITY_API_KEY: ${process.env.PERPLEXITY_API_KEY ? chalk.green('✓ Set') : chalk.gray('Not set')}`);
    return;
  }

  const updates: Partial<UserConfig> = {};

  if (options.setAnthropicKey) {
    updates.anthropicApiKey = options.setAnthropicKey;
    console.log(chalk.green('✓ Anthropic API key updated'));
  }

  if (options.setPerplexityKey) {
    updates.perplexityApiKey = options.setPerplexityKey;
    console.log(chalk.green('✓ Perplexity API key updated'));
  }

  if (options.setDefaultAgent) {
    if (!['claude-code', 'codex', 'both'].includes(options.setDefaultAgent)) {
      console.log(chalk.red('✗ Invalid agent. Use "claude-code", "codex", or "both".'));
      process.exit(1);
    }
    updates.defaultAgent = options.setDefaultAgent as 'claude-code' | 'codex' | 'both';
    console.log(chalk.green(`✓ Default agent set to ${options.setDefaultAgent}`));
  }

  if (options.setModel) {
    updates.claudeModel = options.setModel;
    console.log(chalk.green(`✓ Claude model set to ${options.setModel}`));
  }

  if (Object.keys(updates).length > 0) {
    await saveConfig(updates);
    console.log(chalk.gray(`\nConfig saved to ${getConfigPath()}`));
  }
}
