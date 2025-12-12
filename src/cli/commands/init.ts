import chalk from 'chalk';
import { loadConfig, validateConfig } from '../../utils/config.js';
import { prdExists } from '../../utils/files.js';
import { conductInterview, confirmProjectInfo } from '../prompts/interview.js';
import { generatePRD, conductResearch } from '../../generators/prd.js';
import { writePRDFiles } from '../../generators/writer.js';
import inquirer from 'inquirer';

interface InitOptions {
  dir: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.cyan.bold('\n🚀 vibe-assistant - PRD Generator\n'));

  // Load and validate config
  const config = await loadConfig();
  const validation = validateConfig(config);

  if (!validation.valid) {
    console.log(chalk.red('\n❌ Configuration Error:\n'));
    validation.errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
    console.log(chalk.gray('\nRun "vibe-assistant config" to set up your API keys.\n'));
    process.exit(1);
  }

  // Check if PRD already exists
  if (await prdExists(options.dir, config.outputDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'A PRD already exists in this directory. Do you want to overwrite it?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\nUse "vibe-assistant update" to modify the existing PRD.\n'));
      return;
    }
  }

  // Conduct interview
  let confirmed = false;
  let projectInfo;

  while (!confirmed) {
    projectInfo = await conductInterview(config);
    confirmed = await confirmProjectInfo(projectInfo);

    if (!confirmed) {
      console.log(chalk.yellow('\nLet\'s try again.\n'));
    }
  }

  if (!projectInfo) {
    console.log(chalk.red('No project info collected. Exiting.'));
    process.exit(1);
  }

  // Conduct research
  const researchResults = await conductResearch(config, projectInfo);

  // Generate PRD
  console.log(chalk.cyan('\n🔨 Generating PRD...\n'));
  const prd = await generatePRD(config, projectInfo, researchResults);

  // Write files
  await writePRDFiles(prd, config, options.dir);

  // Success message
  console.log(chalk.green.bold('\n✅ PRD Generated Successfully!\n'));

  console.log(chalk.white('Next steps:'));
  console.log(chalk.gray(`  1. Review the PRD at ${config.outputDir}/PRD.md`));
  console.log(chalk.gray(`  2. Start your AI coding agent (Claude Code or Codex)`));
  console.log(chalk.gray(`  3. The agent will read CLAUDE.md/AGENTS.md for instructions`));
  console.log(chalk.gray(`  4. Use /next-task to get started\n`));

  if (projectInfo.targetAgent === 'claude-code' || projectInfo.targetAgent === 'both') {
    console.log(chalk.cyan('For Claude Code:'));
    console.log(chalk.gray('  Run "claude" in this directory to start\n'));
  }

  if (projectInfo.targetAgent === 'codex' || projectInfo.targetAgent === 'both') {
    console.log(chalk.cyan('For Codex:'));
    console.log(chalk.gray('  Open this project in your IDE with Codex enabled\n'));
  }
}
