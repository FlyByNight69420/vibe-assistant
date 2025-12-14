#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from '../cli/commands/init.js';
import { createCommand } from '../cli/commands/create.js';
import { updateCommand } from '../cli/commands/update.js';
import { statusCommand } from '../cli/commands/status.js';
import { configCommand } from '../cli/commands/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

program
  .name('vibe-assistant')
  .description('Parse PRDs into structured tasks for AI coding agents like Claude Code')
  .version(pkg.version);

program
  .command('init')
  .description('Parse a PRD file into structured tasks for AI agents')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .action(initCommand);

program
  .command('create')
  .description('Create a PRD from a rough project idea')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .action(createCommand);

program
  .command('update')
  .description('Re-parse a PRD or regenerate task files')
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
  .option('--set-perplexity-key <key>', 'Set Perplexity API key (optional, for research)')
  .option('--set-default-agent <agent>', 'Set default coding agent (claude-code, codex, or both)')
  .option('--set-model <model>', 'Set Claude model (default: claude-sonnet-4-5-20250929)')
  .option('--show', 'Show current configuration')
  .action(configCommand);

program.parse();
