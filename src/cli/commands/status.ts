import chalk from 'chalk';
import path from 'path';
import { loadConfig } from '../../utils/config.js';
import { readJson, readMarkdown, getPaths, prdExists } from '../../utils/files.js';
import type { ProgressState, PRDDocument } from '../../types.js';

interface StatusOptions {
  dir: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const config = await loadConfig();
  const paths = getPaths(options.dir, config.outputDir);

  // Check if PRD exists
  if (!(await prdExists(options.dir, config.outputDir))) {
    console.log(chalk.yellow('\n⚠️  No PRD found in this directory.'));
    console.log(chalk.gray('Run "vibe-assistant init" to create one.\n'));
    return;
  }

  // Load state
  const state = await readJson<ProgressState>(paths.state);

  if (!state) {
    console.log(chalk.yellow('\n⚠️  No progress state found.'));
    console.log(chalk.gray('The state.json file may have been deleted.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n📊 Project Status\n'));

  // Current phase
  console.log(chalk.white(`Current Phase: ${state.currentPhase}`));
  console.log(chalk.gray(`Last Updated: ${new Date(state.lastUpdated).toLocaleString()}\n`));

  // Task summary
  const taskStatuses = Object.values(state.tasks);
  const completed = taskStatuses.filter((t) => t.status === 'completed').length;
  const inProgress = taskStatuses.filter((t) => t.status === 'in_progress').length;
  const pending = taskStatuses.filter((t) => t.status === 'pending').length;
  const total = taskStatuses.length;

  const progressPct = Math.round((completed / total) * 100);
  const progressBar = generateProgressBar(progressPct);

  console.log(chalk.white('Overall Progress:'));
  console.log(`  ${progressBar} ${progressPct}%`);
  console.log(chalk.gray(`  ${completed} completed, ${inProgress} in progress, ${pending} pending\n`));

  // Current phase tasks
  console.log(chalk.white(`Phase ${state.currentPhase} Tasks:`));

  const phaseTasks = Object.entries(state.tasks)
    .filter(([id]) => id.startsWith(`phase${state.currentPhase}-`))
    .map(([id, task]) => ({ id, ...task }));

  for (const task of phaseTasks) {
    const icon = task.status === 'completed' ? chalk.green('✓')
      : task.status === 'in_progress' ? chalk.yellow('→')
        : chalk.gray('○');
    const statusColor = task.status === 'completed' ? chalk.green
      : task.status === 'in_progress' ? chalk.yellow
        : chalk.gray;

    console.log(`  ${icon} ${task.id}: ${statusColor(task.status)}`);
  }

  // Recent checkpoints
  if (state.checkpoints.length > 0) {
    console.log(chalk.white('\nRecent Checkpoints:'));
    const recentCheckpoints = state.checkpoints.slice(-3);
    for (const checkpoint of recentCheckpoints) {
      const date = new Date(checkpoint.createdAt).toLocaleDateString();
      console.log(chalk.gray(`  [${date}] Phase ${checkpoint.phase} - ${checkpoint.task}`));
    }
  }

  console.log();
}

function generateProgressBar(percent: number): string {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}
