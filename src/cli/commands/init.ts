import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadConfig, validateConfig } from '../../utils/config.js';
import { prdExists } from '../../utils/files.js';
import { parsePRD } from '../../parsers/prd.js';
import { researchPRDContext } from '../../llm/client.js';
import { writePRDFiles } from '../../generators/writer.js';

interface InitOptions {
  dir: string;
}

async function readPRDFile(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Could not read file: ${absolutePath}`);
  }
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.cyan.bold('\n📋 vibe-assistant - PRD Parser\n'));

  // Load and validate config
  const config = await loadConfig();
  const validation = validateConfig(config);

  if (!validation.valid) {
    console.log(chalk.red('\n❌ Configuration Error:\n'));
    validation.errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
    console.log(chalk.gray('\nRun "vibe-assistant config" to set up your API keys.\n'));
    process.exit(1);
  }

  // Show warnings
  if (validation.warnings.length > 0) {
    validation.warnings.forEach((warn) => console.log(chalk.yellow(`⚠️  ${warn}`)));
    console.log();
  }

  // Check if PRD already exists
  if (await prdExists(options.dir, config.outputDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Task files already exist in this directory. Do you want to overwrite them?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\nUse "vibe-assistant update" to modify the existing files.\n'));
      return;
    }
  }

  // Ask for PRD file path
  const { prdPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'prdPath',
      message: 'Enter the path to your PRD file:',
      validate: async (input: string) => {
        if (!input.trim()) {
          return 'Please enter a file path';
        }
        try {
          await fs.access(path.resolve(input));
          return true;
        } catch {
          return `File not found: ${input}`;
        }
      },
    },
  ]);

  // Read the PRD content
  const prdContent = await readPRDFile(prdPath);

  // Ask for project name (optional - will be extracted if not provided)
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (leave blank to auto-detect from PRD):',
    },
  ]);

  // Ask for target agent
  const { targetAgent } = await inquirer.prompt([
    {
      type: 'list',
      name: 'targetAgent',
      message: 'Which AI coding agent will you use?',
      choices: [
        { name: 'Claude Code', value: 'claude-code' },
        { name: 'Codex', value: 'codex' },
        { name: 'Both', value: 'both' },
      ],
      default: config.defaultAgent,
    },
  ]);

  // Update config with selected agent
  config.defaultAgent = targetAgent;

  try {
    // Research step (if Perplexity is configured)
    let researchResults: string | undefined;

    if (config.perplexityApiKey) {
      const researchSpinner = ora('Researching best practices with Perplexity...').start();
      try {
        researchResults = await researchPRDContext(config, prdContent);
        researchSpinner.succeed('Research complete');
      } catch (error) {
        researchSpinner.warn('Research failed, continuing without it');
      }
    }

    // Parse the PRD
    const parseSpinner = ora('Parsing PRD with Claude...').start();

    const parsedPRD = await parsePRD(
      config,
      prdContent,
      projectName || undefined,
      researchResults
    );

    parseSpinner.succeed(`Extracted ${parsedPRD.phases.length} phases with ${parsedPRD.totalTasks} tasks`);

    // Write files
    await writePRDFiles(parsedPRD, config, options.dir);

    // Success message
    console.log(chalk.green.bold('\n✅ PRD Parsed Successfully!\n'));

    console.log(chalk.white('Next steps:'));
    console.log(chalk.gray(`  1. Review the tasks at ${config.outputDir}/PRD.md`));
    console.log(chalk.gray(`  2. Start your AI coding agent (Claude Code or Codex)`));
    console.log(chalk.gray(`  3. The agent will read CLAUDE.md/AGENTS.md for instructions`));
    console.log(chalk.gray(`  4. Use /next-task to get started\n`));

    if (targetAgent === 'claude-code' || targetAgent === 'both') {
      console.log(chalk.cyan('For Claude Code:'));
      console.log(chalk.gray('  Run "claude" in this directory to start\n'));
    }

    if (targetAgent === 'codex' || targetAgent === 'both') {
      console.log(chalk.cyan('For Codex:'));
      console.log(chalk.gray('  Open this project in your IDE with Codex enabled\n'));
    }
  } catch (error) {
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
