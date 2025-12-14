import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { loadConfig, validateConfig } from '../../utils/config.js';
import {
  generateInitialPRD,
  refinePRD,
  formatWithRPGTemplate,
  researchProjectIdea,
  extractPRDSummary,
} from '../../generators/prd-creator.js';
import { writePRDFiles } from '../../generators/writer.js';
import { prdExists } from '../../utils/files.js';
import type { ResearchResults, DeploymentConfig, DeploymentType, CloudProvider, IaCTool } from '../../types.js';

interface CreateOptions {
  dir: string;
}

function getDeploymentSummary(config: DeploymentConfig): string {
  switch (config.type) {
    case 'local':
      return 'Local only (Git, no remote)';
    case 'github-only':
      return 'GitHub repository (no automated deployment)';
    case 'github-cloud':
      return `GitHub + ${config.cloudProvider || 'cloud hosting'} (auto-deploy)`;
    case 'github-aws':
      return `GitHub + AWS (${config.iacTool || 'IaC'})`;
    case 'github-gcp':
      return `GitHub + Google Cloud (${config.iacTool || 'IaC'})`;
    case 'github-azure':
      return `GitHub + Azure (${config.iacTool || 'IaC'})`;
    case 'self-hosted':
      return 'Self-hosted (Docker + VPS)';
    default:
      return config.type;
  }
}

export async function createCommand(options: CreateOptions): Promise<void> {
  console.log(chalk.blue.bold('\nvibe-assistant create\n'));
  console.log(chalk.gray('Create a PRD from your project idea\n'));

  // Load and validate config
  const config = await loadConfig();
  const validation = validateConfig(config);

  if (!validation.valid) {
    console.log(chalk.red('\nConfiguration Error:\n'));
    validation.errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
    console.log(chalk.gray('\nRun: vibe-assistant config --set-anthropic-key <key>'));
    process.exit(1);
  }

  // Check for existing PRD
  if (await prdExists(options.dir, config.outputDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'A PRD already exists in this directory. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\nAborted. Existing PRD preserved.'));
      process.exit(0);
    }
  }

  // Get project idea
  console.log(chalk.white('Describe your project idea. Be as detailed as you like.'));
  console.log(chalk.gray('(Your default editor will open. Save and close when done.)\n'));

  const { idea } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'idea',
      message: 'Project idea:',
      default: `# My Project Idea

## What I want to build:


## Key features:
-

## Technical preferences (optional):
- Deployment:
- Tech stack:
- Database:

## Other notes:

`,
      validate: (input: string) => {
        if (input.trim().length < 50) {
          return 'Please provide more detail about your project (at least 50 characters)';
        }
        return true;
      },
    },
  ]);

  // Get project name
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (press enter to auto-detect):',
      default: '',
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

  // Ask for deployment strategy
  const { deploymentType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'deploymentType',
      message: 'How will this project be deployed and versioned?',
      choices: [
        {
          name: 'Local only - Git for version control, run locally',
          value: 'local',
        },
        {
          name: 'GitHub repository - No automated deployment',
          value: 'github-only',
        },
        {
          name: 'GitHub + Cloud hosting - Auto-deploy to Vercel/Netlify/etc.',
          value: 'github-cloud',
        },
        {
          name: 'GitHub + AWS - Full AWS infrastructure with CI/CD',
          value: 'github-aws',
        },
        {
          name: 'GitHub + Google Cloud - Full GCP infrastructure with CI/CD',
          value: 'github-gcp',
        },
        {
          name: 'GitHub + Azure - Full Azure infrastructure with CI/CD',
          value: 'github-azure',
        },
        {
          name: 'Self-hosted - Docker, deploy to VPS/bare metal',
          value: 'self-hosted',
        },
      ],
    },
  ]);

  // Build deployment config with follow-up questions
  const deploymentConfig: DeploymentConfig = { type: deploymentType as DeploymentType };

  // Follow-up for cloud hosting provider
  if (deploymentType === 'github-cloud') {
    const { cloudProvider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'cloudProvider',
        message: 'Which cloud hosting provider?',
        choices: [
          { name: 'Vercel (Recommended for Next.js/React)', value: 'vercel' },
          { name: 'Netlify (Great for static sites)', value: 'netlify' },
          { name: 'Railway (Good for full-stack with databases)', value: 'railway' },
          { name: 'Render (Good all-rounder)', value: 'render' },
          { name: 'Fly.io (Good for global distribution)', value: 'fly-io' },
          { name: 'Other', value: 'other' },
        ],
      },
    ]);
    deploymentConfig.cloudProvider = cloudProvider as CloudProvider;
  }

  // Follow-up for enterprise cloud IaC tool
  if (['github-aws', 'github-gcp', 'github-azure'].includes(deploymentType)) {
    const { iacTool } = await inquirer.prompt([
      {
        type: 'list',
        name: 'iacTool',
        message: 'Infrastructure as Code preference?',
        choices: [
          { name: 'Terraform (Recommended, cloud-agnostic)', value: 'terraform' },
          { name: 'AWS CDK / Pulumi (TypeScript-based)', value: 'cdk' },
          { name: 'CloudFormation / ARM templates (Native)', value: 'cloudformation' },
          { name: 'None - Manual setup via console', value: 'none' },
        ],
      },
    ]);
    deploymentConfig.iacTool = iacTool as IaCTool;
  }

  console.log(chalk.gray(`\nDeployment: ${getDeploymentSummary(deploymentConfig)}\n`));

  // Research step (if Perplexity available)
  let research: ResearchResults | undefined;
  if (config.perplexityApiKey) {
    const researchSpinner = ora('Researching technologies, versions, and best practices...').start();
    try {
      research = await researchProjectIdea(config, idea);
      researchSpinner.succeed(
        `Research complete: ${research.techStack?.length || 0} technologies, ` +
        `${research.versionInfo?.packages.length || 0} package versions`
      );
    } catch (error) {
      researchSpinner.warn('Research failed, continuing without it');
    }
  } else {
    console.log(chalk.gray('\nTip: Set PERPLEXITY_API_KEY for AI-powered research on best practices.\n'));
  }

  // Generate initial PRD
  const generateSpinner = ora('Generating PRD draft...').start();
  let currentPRD: string;
  try {
    currentPRD = await generateInitialPRD(
      config,
      idea,
      projectName || undefined,
      research,
      deploymentConfig
    );
    generateSpinner.succeed('PRD draft generated');
  } catch (error) {
    generateSpinner.fail('Failed to generate PRD');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // Iteration loop
  let approved = false;
  while (!approved) {
    // Show summary
    console.log(chalk.blue('\n--- PRD Summary ---\n'));
    console.log(extractPRDSummary(currentPRD));
    console.log(chalk.blue('--- End Summary ---\n'));

    const { feedback } = await inquirer.prompt([
      {
        type: 'input',
        name: 'feedback',
        message: 'Feedback (press enter to approve, or describe changes):',
        default: '',
      },
    ]);

    if (!feedback.trim()) {
      approved = true;
    } else {
      const refineSpinner = ora('Refining PRD based on feedback...').start();
      try {
        currentPRD = await refinePRD(config, currentPRD, feedback);
        refineSpinner.succeed('PRD refined');
      } catch (error) {
        refineSpinner.fail('Failed to refine PRD');
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        // Continue with current version
      }
    }
  }

  // Save raw PRD
  const rawPrdPath = path.join(options.dir, 'raw-prd.md');
  await fs.writeFile(rawPrdPath, currentPRD, 'utf-8');
  console.log(chalk.gray(`\nRaw PRD saved to: ${rawPrdPath}`));

  // Format with RPG template
  const formatSpinner = ora('Formatting with RPG template...').start();
  let parsedPRD;
  try {
    parsedPRD = await formatWithRPGTemplate(
      config,
      currentPRD,
      projectName || undefined
    );
    formatSpinner.succeed('PRD formatted');
  } catch (error) {
    formatSpinner.fail('Failed to format PRD');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    console.log(chalk.yellow('\nYour raw PRD has been saved. You can manually format it and run:'));
    console.log(chalk.white('  vibe-assistant init'));
    process.exit(1);
  }

  // Write formatted PRD files
  const writeSpinner = ora('Writing PRD files...').start();
  try {
    await writePRDFiles(parsedPRD, config, options.dir);
    writeSpinner.succeed('PRD files written');
  } catch (error) {
    writeSpinner.fail('Failed to write files');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // Summary
  console.log(chalk.green.bold('\nPRD Created Successfully!\n'));
  console.log(chalk.white(`Project: ${parsedPRD.projectInfo.name}`));
  console.log(chalk.white(`Phases: ${parsedPRD.phases.length}`));
  console.log(chalk.white(`Tasks: ${parsedPRD.totalTasks}`));

  console.log(chalk.gray('\nGenerated files:'));
  console.log(chalk.gray(`  - raw-prd.md (original PRD)`));
  console.log(chalk.gray(`  - ${config.outputDir}/PRD.md`));
  console.log(chalk.gray(`  - ${config.outputDir}/phases/ (${parsedPRD.phases.length} files)`));
  console.log(chalk.gray(`  - docs/progress/state.json`));
  if (parsedPRD.projectInfo.targetAgent === 'claude-code' || parsedPRD.projectInfo.targetAgent === 'both') {
    console.log(chalk.gray(`  - CLAUDE.md`));
    console.log(chalk.gray(`  - .claude/commands/`));
  }
  if (parsedPRD.projectInfo.targetAgent === 'codex' || parsedPRD.projectInfo.targetAgent === 'both') {
    console.log(chalk.gray(`  - AGENTS.md`));
  }

  console.log(chalk.white('\nNext steps:'));
  console.log(chalk.gray(`  1. Review ${config.outputDir}/PRD.md`));
  console.log(chalk.gray('  2. Start coding with Claude Code'));
  console.log(chalk.gray('  3. Use /next-task to get your first task'));
}
