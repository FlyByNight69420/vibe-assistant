import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { writeMarkdown, writeJson, ensureProjectDirs, getPaths } from '../utils/files.js';
import { generateMainPRD, generatePhaseFile, generateInitialState } from './markdown.js';
import { generateClaudeMd, generateAgentsMd, generateSlashCommands } from './agent-configs.js';
import type { PRDDocument, UserConfig } from '../types.js';

export async function writePRDFiles(
  prd: PRDDocument,
  config: UserConfig,
  baseDir: string
): Promise<void> {
  const outputDir = config.outputDir;
  const paths = getPaths(baseDir, outputDir);

  const spinner = ora('Writing PRD files...').start();

  try {
    // Ensure directories exist
    await ensureProjectDirs(baseDir, outputDir);

    // Write main PRD
    await writeMarkdown(paths.prd, generateMainPRD(prd));
    spinner.text = 'Wrote PRD.md';

    // Write phase files
    for (const phase of prd.implementationRoadmap) {
      const phasePath = path.join(paths.phases, `phase-${phase.number}.md`);
      await writeMarkdown(phasePath, generatePhaseFile(phase, prd));
    }
    spinner.text = `Wrote ${prd.implementationRoadmap.length} phase files`;

    // Write initial state
    await writeJson(paths.state, generateInitialState(prd));
    spinner.text = 'Wrote initial state.json';

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

    spinner.succeed('All PRD files written successfully');

    // Print summary
    console.log(chalk.cyan('\n📁 Generated Files:\n'));
    console.log(chalk.white(`  ${outputDir}/PRD.md`));
    console.log(chalk.white(`  ${outputDir}/phases/ (${prd.implementationRoadmap.length} files)`));
    console.log(chalk.white(`  docs/progress/state.json`));

    if (prd.projectInfo.targetAgent === 'claude-code' || prd.projectInfo.targetAgent === 'both') {
      console.log(chalk.white(`  CLAUDE.md`));
      console.log(chalk.white(`  .claude/commands/ (5 slash commands)`));
    }

    if (prd.projectInfo.targetAgent === 'codex' || prd.projectInfo.targetAgent === 'both') {
      console.log(chalk.white(`  AGENTS.md`));
    }

  } catch (error) {
    spinner.fail('Failed to write PRD files');
    throw error;
  }
}
