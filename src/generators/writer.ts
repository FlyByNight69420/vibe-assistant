import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { writeMarkdown, writeJson, ensureProjectDirs, getPaths } from '../utils/files.js';
import { generateMainPRD, generatePhaseFile, generateInitialState } from './markdown.js';
import {
  generateClaudeMd,
  generateAgentsMd,
  generateSlashCommands,
  generateInitScript,
  generateTasksJson,
  generateProgressLog,
} from './agent-configs.js';
import type { ParsedPRD, UserConfig } from '../types.js';

export async function writePRDFiles(
  prd: ParsedPRD,
  config: UserConfig,
  baseDir: string
): Promise<void> {
  const outputDir = config.outputDir;
  const paths = getPaths(baseDir, outputDir);

  const spinner = ora('Writing task files...').start();

  try {
    // Ensure directories exist
    await ensureProjectDirs(baseDir, outputDir);

    // Write main PRD
    await writeMarkdown(paths.prd, generateMainPRD(prd, outputDir));
    spinner.text = 'Wrote PRD.md';

    // Write phase files
    for (const phase of prd.phases) {
      const phasePath = path.join(paths.phases, `phase-${phase.number}.md`);
      await writeMarkdown(phasePath, generatePhaseFile(phase, prd));
    }
    spinner.text = `Wrote ${prd.phases.length} phase files`;

    // Write initial state
    await writeJson(paths.state, generateInitialState(prd));
    spinner.text = 'Wrote initial state.json';

    // Write tasks.json (corruption-resistant feature tracking)
    await writeJson(paths.tasksJson, generateTasksJson(prd));
    spinner.text = 'Wrote tasks.json';

    // Write progress.txt (session-by-session log)
    await writeMarkdown(paths.progressLog, generateProgressLog(prd));
    spinner.text = 'Wrote progress.txt';

    // Write init.sh (development environment startup script)
    await writeMarkdown(paths.initScript, generateInitScript(prd));
    await fs.chmod(paths.initScript, 0o755); // Make executable
    spinner.text = 'Wrote init.sh';

    // Write agent config files based on target
    if (prd.projectInfo.targetAgent === 'claude-code' || prd.projectInfo.targetAgent === 'both') {
      await writeMarkdown(paths.claudeMd, generateClaudeMd(prd, outputDir));
      spinner.text = 'Wrote CLAUDE.md';

      // Write slash commands
      const commands = generateSlashCommands(prd, outputDir);
      for (const [filename, content] of Object.entries(commands)) {
        await writeMarkdown(path.join(paths.slashCommands, filename), content);
      }
      spinner.text = 'Wrote slash commands';
    }

    if (prd.projectInfo.targetAgent === 'codex' || prd.projectInfo.targetAgent === 'both') {
      await writeMarkdown(paths.agentsMd, generateAgentsMd(prd, outputDir));
      spinner.text = 'Wrote AGENTS.md';
    }

    spinner.succeed('All task files written successfully');

    // Print summary
    console.log(chalk.cyan('\n📁 Generated Files:\n'));
    console.log(chalk.white(`  ${outputDir}/PRD.md`));
    console.log(chalk.white(`  ${outputDir}/phases/ (${prd.phases.length} files)`));
    console.log(chalk.white(`  docs/progress/state.json`));
    console.log(chalk.white(`  docs/progress/tasks.json`));
    console.log(chalk.white(`  docs/progress/progress.txt`));
    console.log(chalk.white(`  init.sh`));

    if (prd.projectInfo.targetAgent === 'claude-code' || prd.projectInfo.targetAgent === 'both') {
      console.log(chalk.white(`  CLAUDE.md`));
      console.log(chalk.white(`  .claude/commands/ (5 slash commands)`));
    }

    if (prd.projectInfo.targetAgent === 'codex' || prd.projectInfo.targetAgent === 'both') {
      console.log(chalk.white(`  AGENTS.md`));
    }

  } catch (error) {
    spinner.fail('Failed to write task files');
    throw error;
  }
}
