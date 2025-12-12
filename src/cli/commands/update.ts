import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadConfig, validateConfig } from '../../utils/config.js';
import { prdExists, readJson, getPaths } from '../../utils/files.js';
import { generateWithClaude } from '../../llm/client.js';
import { writePRDFiles } from '../../generators/writer.js';
import type { ProgressState, PRDDocument, ProjectInfo } from '../../types.js';
import fs from 'fs-extra';

interface UpdateOptions {
  dir: string;
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  console.log(chalk.cyan.bold('\n🔄 vibe-assistant - Update PRD\n'));

  const config = await loadConfig();
  const validation = validateConfig(config);

  if (!validation.valid) {
    console.log(chalk.red('\n❌ Configuration Error:\n'));
    validation.errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
    process.exit(1);
  }

  const paths = getPaths(options.dir, config.outputDir);

  // Check if PRD exists
  if (!(await prdExists(options.dir, config.outputDir))) {
    console.log(chalk.yellow('\n⚠️  No PRD found in this directory.'));
    console.log(chalk.gray('Run "vibe-assistant init" to create one.\n'));
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
      message: 'What would you like to update?',
      choices: [
        { name: 'Add new features/requirements', value: 'add_features' },
        { name: 'Modify existing requirements', value: 'modify' },
        { name: 'Add research findings', value: 'research' },
        { name: 'Regenerate from scratch (preserves nothing)', value: 'regenerate' },
      ],
    },
  ]);

  if (updateType === 'regenerate') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('This will delete all existing PRD files. Are you sure?'),
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

  if (updateType === 'add_features') {
    await handleAddFeatures(options.dir, config, paths);
  } else if (updateType === 'modify') {
    await handleModify(options.dir, config, paths);
  } else if (updateType === 'research') {
    await handleResearch(options.dir, config, paths);
  }
}

async function handleAddFeatures(
  baseDir: string,
  config: import('../../types.js').UserConfig,
  paths: ReturnType<typeof getPaths>
): Promise<void> {
  const { newFeatures } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'newFeatures',
      message: 'Describe the new features you want to add:',
    },
  ]);

  if (!newFeatures.trim()) {
    console.log(chalk.yellow('No features specified. Update cancelled.\n'));
    return;
  }

  const spinner = ora('Updating PRD with new features...').start();

  try {
    // Read existing PRD
    const existingPRD = await fs.readFile(paths.prd, 'utf-8');

    const prompt = `You are updating an existing PRD. Here is the current PRD:

${existingPRD}

The user wants to add these new features:
${newFeatures}

Generate an updated PRD that:
1. Preserves all existing structure and completed work
2. Adds the new features to the appropriate capability domains
3. Adds new tasks to the implementation roadmap
4. Updates dependencies as needed
5. Adds any new risks or test requirements

Output the complete updated PRD in the same JSON format as the original. Keep all existing task IDs and add new ones.`;

    const response = await generateWithClaude(
      config,
      'You are an expert at updating PRDs. Preserve existing structure and add new requirements seamlessly.',
      prompt,
      8192
    );

    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const updatedPRD: PRDDocument = JSON.parse(jsonStr);

    // Preserve state for existing tasks
    const state = await readJson<ProgressState>(paths.state);
    if (state) {
      for (const phase of updatedPRD.implementationRoadmap) {
        for (const task of phase.tasks) {
          if (state.tasks[task.id]) {
            task.status = state.tasks[task.id].status;
          }
        }
      }
    }

    await writePRDFiles(updatedPRD, config, baseDir);

    spinner.succeed('PRD updated successfully');
    console.log(chalk.green('\n✅ New features added to PRD\n'));
  } catch (error) {
    spinner.fail('Failed to update PRD');
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}

async function handleModify(
  baseDir: string,
  config: import('../../types.js').UserConfig,
  paths: ReturnType<typeof getPaths>
): Promise<void> {
  const { modifications } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'modifications',
      message: 'Describe what you want to modify in the PRD:',
    },
  ]);

  if (!modifications.trim()) {
    console.log(chalk.yellow('No modifications specified. Update cancelled.\n'));
    return;
  }

  const spinner = ora('Applying modifications...').start();

  try {
    const existingPRD = await fs.readFile(paths.prd, 'utf-8');

    const prompt = `You are modifying an existing PRD. Here is the current PRD:

${existingPRD}

The user wants to make these modifications:
${modifications}

Generate an updated PRD that applies the requested changes while preserving the overall structure. Keep existing task IDs where possible.

Output the complete updated PRD in JSON format.`;

    const response = await generateWithClaude(
      config,
      'You are an expert at modifying PRDs. Apply changes carefully while preserving structure.',
      prompt,
      8192
    );

    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const updatedPRD: PRDDocument = JSON.parse(jsonStr);

    await writePRDFiles(updatedPRD, config, baseDir);

    spinner.succeed('PRD modified successfully');
    console.log(chalk.green('\n✅ Modifications applied to PRD\n'));
  } catch (error) {
    spinner.fail('Failed to modify PRD');
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}

async function handleResearch(
  baseDir: string,
  config: import('../../types.js').UserConfig,
  paths: ReturnType<typeof getPaths>
): Promise<void> {
  const { researchTopic } = await inquirer.prompt([
    {
      type: 'input',
      name: 'researchTopic',
      message: 'What topic do you want to research?',
    },
  ]);

  if (!researchTopic.trim()) {
    console.log(chalk.yellow('No topic specified. Update cancelled.\n'));
    return;
  }

  const spinner = ora(`Researching: ${researchTopic}...`).start();

  try {
    const { research } = await import('../../llm/client.js');
    const { response, provider } = await research(config, researchTopic);

    // Save research to file
    const slug = researchTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    const researchPath = `${paths.research}/${slug}.md`;

    const researchContent = `# Research: ${researchTopic}

> Researched via ${provider} on ${new Date().toISOString()}

${response}
`;

    await fs.ensureDir(paths.research);
    await fs.writeFile(researchPath, researchContent, 'utf-8');

    spinner.succeed(`Research saved to ${researchPath}`);
    console.log(chalk.cyan('\n📄 Research Summary:\n'));
    console.log(chalk.gray(response.substring(0, 500) + (response.length > 500 ? '...' : '')));
    console.log();
  } catch (error) {
    spinner.fail('Research failed');
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}
