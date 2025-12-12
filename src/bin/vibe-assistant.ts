#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from '../cli/commands/init.js';
import { updateCommand } from '../cli/commands/update.js';
import { statusCommand } from '../cli/commands/status.js';
import { configCommand } from '../cli/commands/config.js';

program
  .name('vibe-assistant')
  .description('AI-agent-optimized PRD generator using RPG methodology')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new PRD through interactive interview')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .action(initCommand);

program
  .command('update')
  .description('Update an existing PRD with new requirements')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .action(updateCommand);

program
  .command('status')
  .description('Show current project progress')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .action(statusCommand);

program
  .command('config')
  .description('Configure API keys and preferences')
  .option('--set-anthropic-key <key>', 'Set Anthropic API key')
  .option('--set-perplexity-key <key>', 'Set Perplexity API key')
  .option('--set-research-provider <provider>', 'Set research provider (perplexity or claude)')
  .option('--set-default-agent <agent>', 'Set default coding agent (claude-code, codex, or both)')
  .option('--show', 'Show current configuration')
  .action(configCommand);

program.parse();
