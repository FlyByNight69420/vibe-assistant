import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs/promises';
import { loadConfig, validateConfig } from '../../utils/config.js';
import { prdExists, readJson, getPaths } from '../../utils/files.js';
import { parsePRD } from '../../parsers/prd.js';
import { writePRDFiles } from '../../generators/writer.js';
import type { ProgressState } from '../../types.js';

interface UpdateOptions {
  dir: string;
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  console.log(chalk.cyan.bold('\n🔄 vibe-assistant - Update Tasks\n'));

  const config = await loadConfig();
  const validation = validateConfig(config);

  if (!validation.valid) {
    console.log(chalk.red('\n❌ Configuration Error:\n'));
    validation.errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
    process.exit(1);
  }

  const paths = getPaths(options.dir, config.outputDir);

  // Check if task files exist
  if (!(await prdExists(options.dir, config.outputDir))) {
    console.log(chalk.yellow('\n⚠️  No task files found in this directory.'));
    console.log(chalk.gray('Run "vibe-assistant init" to parse a PRD.\n'));
    return;
  }

  // Load current state
  const state = await readJson<ProgressState>(paths.state);

  if (state) {
    const completedTasks = Object.values(state.tasks).filter((t) => t.status === 'completed').length;
    const totalTasks = Object.values(state.tasks).length;

    console.log(chalk.white(`Current Progress: ${completedTasks}/${totalTasks} tasks completed`));
    console.log(chalk.gray('Completed work will be preserved.\n'));
  }

  // Ask what to update
  const { updateType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'updateType',
      message: 'What would you like to do?',
      choices: [
        { name: 'Re-parse PRD (update from new PRD file)', value: 'reparse' },
        { name: 'Regenerate from scratch (preserves nothing)', value: 'regenerate' },
      ],
    },
  ]);

  if (updateType === 'regenerate') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('This will delete all existing task files. Are you sure?'),
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Update cancelled.\n'));
      return;
    }

    // Import and run init command
    const { initCommand } = await import('./init.js');
    await initCommand(options);
    return;
  }

  if (updateType === 'reparse') {
    await handleReparse(options.dir, config, paths, state);
  }
}

async function handleReparse(
  baseDir: string,
  config: import('../../types.js').UserConfig,
  paths: ReturnType<typeof getPaths>,
  existingState: ProgressState | null
): Promise<void> {
  const { prdPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'prdPath',
      message: 'Enter the path to your updated PRD file:',
      validate: async (input: string) => {
        if (!input.trim()) {
          return 'Please enter a file path';
        }
        try {
          await fs.access(input);
          return true;
        } catch {
          return `File not found: ${input}`;
        }
      },
    },
  ]);

  const spinner = ora('Re-parsing PRD...').start();

  try {
    const prdContent = await fs.readFile(prdPath, 'utf-8');
    const parsedPRD = await parsePRD(config, prdContent);

    // Preserve status for tasks that exist in both old and new PRD
    if (existingState) {
      for (const phase of parsedPRD.phases) {
        for (const task of phase.tasks) {
          if (existingState.tasks[task.id]) {
            task.status = existingState.tasks[task.id].status;
          }
        }
      }
    }

    await writePRDFiles(parsedPRD, config, baseDir);

    spinner.succeed('PRD re-parsed successfully');
    console.log(chalk.green('\n✅ Task files updated from new PRD\n'));
  } catch (error) {
    spinner.fail('Failed to re-parse PRD');
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}
