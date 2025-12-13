import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import type { ProjectInfo, UserConfig, InfrastructureConfig } from '../../types.js';
import { research, generateWithClaude } from '../../llm/client.js';

interface AIRecommendations {
  targetUsers: string;
  features: string[];
  techStack: string;
  technicalConstraints: string;
  successMetrics: string;
  infrastructure: {
    hosting: string;
    repository: string;
    cicd: string;
    containerization: string;
    iac: string;
  };
  rationale: string;
}

export async function conductInterview(config: UserConfig): Promise<ProjectInfo> {
  console.log(chalk.cyan('\n🎯 Let\'s define your project\n'));
  console.log(chalk.gray('Tell me about your project and I\'ll help you plan it out.\n'));

  // Step 1: Get basic project info
  const basicInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What is your project name?',
      validate: (input: string) => input.trim().length > 0 || 'Project name is required',
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Describe your project. What are you trying to build? What problem does it solve?',
      waitForUserInput: false,
    },
  ]);

  // Step 2: Ask how they want to proceed
  console.log(chalk.cyan('\n🤖 How would you like to proceed?\n'));

  const { approach } = await inquirer.prompt([
    {
      type: 'list',
      name: 'approach',
      message: 'Choose your approach:',
      choices: [
        {
          name: 'Let AI do it all - I\'ll research and recommend everything (Recommended)',
          value: 'ai-full'
        },
        {
          name: 'AI recommends, I review - Get suggestions but approve each step',
          value: 'ai-guided'
        },
        {
          name: 'Manual - I\'ll specify everything myself',
          value: 'manual'
        },
      ],
    },
  ]);

  let projectInfo: ProjectInfo;

  if (approach === 'manual') {
    projectInfo = await manualInterview(config, basicInfo);
  } else {
    projectInfo = await aiGuidedInterview(config, basicInfo, approach === 'ai-full');
  }

  return projectInfo;
}

async function aiGuidedInterview(
  config: UserConfig,
  basicInfo: { name: string; description: string },
  autoAccept: boolean
): Promise<ProjectInfo> {
  // Research the project and get AI recommendations
  const recommendations = await getAIRecommendations(config, basicInfo);

  if (autoAccept) {
    console.log(chalk.cyan('\n✨ AI Recommendations (auto-accepted)\n'));
    displayRecommendations(recommendations);

    // Ask only about target agent
    const { targetAgent } = await inquirer.prompt([
      {
        type: 'list',
        name: 'targetAgent',
        message: 'Which AI coding agent will you use?',
        choices: [
          { name: 'Claude Code (recommended)', value: 'claude-code' },
          { name: 'OpenAI Codex', value: 'codex' },
          { name: 'Both', value: 'both' },
        ],
        default: config.defaultAgent,
      },
    ]);

    // Check if there's anything specific to add
    const { hasAdditions } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasAdditions',
        message: 'Is there anything specific you\'d like to add or change?',
        default: false,
      },
    ]);

    let additions: { features?: string[]; constraints?: string } = {};
    if (hasAdditions) {
      additions = await collectAdditions();
    }

    return buildProjectInfo(basicInfo, recommendations, targetAgent, additions);
  } else {
    // AI-guided with review
    return await reviewAndModifyRecommendations(config, basicInfo, recommendations);
  }
}

async function getAIRecommendations(
  config: UserConfig,
  basicInfo: { name: string; description: string }
): Promise<AIRecommendations> {
  console.log(chalk.cyan('\n🔍 Researching your project...\n'));

  // Research the project domain
  const spinner = ora('Analyzing project requirements...').start();

  let researchContext = '';
  try {
    const { response } = await research(
      config,
      `What are the best practices, common features, and recommended technology stack for building: ${basicInfo.description.substring(0, 500)}? Include modern 2024-2025 approaches.`
    );
    researchContext = response;
    spinner.succeed('Research complete');
  } catch (error) {
    spinner.warn('Research skipped (continuing with AI analysis)');
  }

  // Get AI to recommend everything
  const recommendationSpinner = ora('Generating recommendations...').start();

  const systemPrompt = `You are a software architect helping plan a new project. Based on the project description and research, recommend:
1. Target users
2. Core features (5-8 practical features)
3. Tech stack (specific technologies)
4. Technical constraints to consider
5. Success metrics
6. Infrastructure choices (hosting, CI/CD, etc.)

Be practical and opinionated. Make clear recommendations rather than listing options. Choose what's best for this specific project.`;

  const userPrompt = `Project: ${basicInfo.name}
Description: ${basicInfo.description}

${researchContext ? `Research Context:\n${researchContext}\n` : ''}

Respond with a JSON object (no markdown fences):
{
  "targetUsers": "who will use this",
  "features": ["feature 1", "feature 2", ...],
  "techStack": "e.g., Next.js 14 with TypeScript, PostgreSQL, Prisma ORM, Tailwind CSS",
  "technicalConstraints": "key constraints to consider",
  "successMetrics": "how to measure success",
  "infrastructure": {
    "hosting": "e.g., Vercel for frontend, Railway for backend",
    "repository": "GitHub",
    "cicd": "GitHub Actions",
    "containerization": "Docker with docker-compose for local dev",
    "iac": "Terraform for cloud resources (if needed)"
  },
  "rationale": "Brief explanation of why these choices fit the project"
}`;

  try {
    const response = await generateWithClaude(config, systemPrompt, userPrompt, 2048);
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recommendations = JSON.parse(jsonStr) as AIRecommendations;
    recommendationSpinner.succeed('Recommendations ready');
    return recommendations;
  } catch (error) {
    recommendationSpinner.fail('Failed to generate recommendations');
    // Return sensible defaults
    return {
      targetUsers: 'Developers and end users',
      features: [
        'User authentication',
        'Core functionality based on description',
        'Data persistence',
        'API endpoints',
        'Basic UI/dashboard',
      ],
      techStack: 'TypeScript, Node.js, React, PostgreSQL',
      technicalConstraints: 'Must be maintainable and scalable',
      successMetrics: 'Functional implementation meeting requirements',
      infrastructure: {
        hosting: 'Vercel or Railway',
        repository: 'GitHub',
        cicd: 'GitHub Actions',
        containerization: 'Docker',
        iac: 'None needed for simple deployments',
      },
      rationale: 'Standard modern web stack for flexibility and rapid development',
    };
  }
}

function displayRecommendations(rec: AIRecommendations): void {
  console.log(chalk.white(`Target Users: ${rec.targetUsers}`));
  console.log(chalk.white(`\nTech Stack: ${rec.techStack}`));
  console.log(chalk.white(`\nFeatures:`));
  rec.features.forEach((f, i) => console.log(chalk.gray(`  ${i + 1}. ${f}`)));
  console.log(chalk.white(`\nInfrastructure:`));
  console.log(chalk.gray(`  Hosting: ${rec.infrastructure.hosting}`));
  console.log(chalk.gray(`  Repository: ${rec.infrastructure.repository}`));
  console.log(chalk.gray(`  CI/CD: ${rec.infrastructure.cicd}`));
  console.log(chalk.gray(`  Containers: ${rec.infrastructure.containerization}`));
  if (rec.infrastructure.iac !== 'None' && rec.infrastructure.iac !== 'None needed') {
    console.log(chalk.gray(`  IaC: ${rec.infrastructure.iac}`));
  }
  console.log(chalk.white(`\nSuccess Metrics: ${rec.successMetrics}`));
  console.log(chalk.cyan(`\n💡 Rationale: ${rec.rationale}\n`));
}

async function collectAdditions(): Promise<{ features?: string[]; constraints?: string }> {
  const { additionType } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'additionType',
      message: 'What would you like to add?',
      choices: [
        { name: 'Additional features', value: 'features' },
        { name: 'Specific constraints or requirements', value: 'constraints' },
      ],
    },
  ]);

  const additions: { features?: string[]; constraints?: string } = {};

  if (additionType.includes('features')) {
    console.log(chalk.gray('\nEnter additional features (one per line, empty line to finish):\n'));
    const features: string[] = [];
    let adding = true;
    while (adding) {
      const { feature } = await inquirer.prompt([
        {
          type: 'input',
          name: 'feature',
          message: `Feature ${features.length + 1} (or press Enter to finish):`,
        },
      ]);
      if (feature.trim()) {
        features.push(feature.trim());
      } else {
        adding = false;
      }
    }
    if (features.length > 0) {
      additions.features = features;
    }
  }

  if (additionType.includes('constraints')) {
    const { constraints } = await inquirer.prompt([
      {
        type: 'input',
        name: 'constraints',
        message: 'Specify additional constraints or requirements:',
      },
    ]);
    if (constraints.trim()) {
      additions.constraints = constraints.trim();
    }
  }

  return additions;
}

async function reviewAndModifyRecommendations(
  config: UserConfig,
  basicInfo: { name: string; description: string },
  recommendations: AIRecommendations
): Promise<ProjectInfo> {
  console.log(chalk.cyan('\n✨ AI Recommendations\n'));
  displayRecommendations(recommendations);

  // Review each section
  const { sections } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'sections',
      message: 'Which sections would you like to modify?',
      choices: [
        { name: 'Target Users', value: 'targetUsers' },
        { name: 'Features', value: 'features' },
        { name: 'Tech Stack', value: 'techStack' },
        { name: 'Infrastructure', value: 'infrastructure' },
        { name: 'None - accept all', value: 'none' },
      ],
    },
  ]);

  let modifiedRec = { ...recommendations };

  if (!sections.includes('none')) {
    if (sections.includes('targetUsers')) {
      const { targetUsers } = await inquirer.prompt([
        {
          type: 'input',
          name: 'targetUsers',
          message: 'Target users:',
          default: recommendations.targetUsers,
        },
      ]);
      modifiedRec.targetUsers = targetUsers;
    }

    if (sections.includes('features')) {
      modifiedRec.features = await modifyFeatures(recommendations.features);
    }

    if (sections.includes('techStack')) {
      const { techStack } = await inquirer.prompt([
        {
          type: 'input',
          name: 'techStack',
          message: 'Tech stack:',
          default: recommendations.techStack,
        },
      ]);
      modifiedRec.techStack = techStack;
    }

    if (sections.includes('infrastructure')) {
      modifiedRec.infrastructure = await modifyInfrastructure(recommendations.infrastructure);
    }
  }

  // Target agent selection
  const { targetAgent } = await inquirer.prompt([
    {
      type: 'list',
      name: 'targetAgent',
      message: 'Which AI coding agent will you use?',
      choices: [
        { name: 'Claude Code (recommended)', value: 'claude-code' },
        { name: 'OpenAI Codex', value: 'codex' },
        { name: 'Both', value: 'both' },
      ],
      default: config.defaultAgent,
    },
  ]);

  return buildProjectInfo(basicInfo, modifiedRec, targetAgent);
}

async function modifyFeatures(currentFeatures: string[]): Promise<string[]> {
  console.log(chalk.gray('\nCurrent features:'));
  currentFeatures.forEach((f, i) => console.log(chalk.gray(`  ${i + 1}. ${f}`)));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Add more features', value: 'add' },
        { name: 'Remove some features', value: 'remove' },
        { name: 'Replace all features', value: 'replace' },
      ],
    },
  ]);

  if (action === 'add') {
    const newFeatures = [...currentFeatures];
    let adding = true;
    while (adding) {
      const { feature } = await inquirer.prompt([
        {
          type: 'input',
          name: 'feature',
          message: `Add feature (or press Enter to finish):`,
        },
      ]);
      if (feature.trim()) {
        newFeatures.push(feature.trim());
      } else {
        adding = false;
      }
    }
    return newFeatures;
  } else if (action === 'remove') {
    const { keepFeatures } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'keepFeatures',
        message: 'Select features to KEEP:',
        choices: currentFeatures.map((f) => ({ name: f, value: f, checked: true })),
      },
    ]);
    return keepFeatures;
  } else {
    const features: string[] = [];
    let adding = true;
    console.log(chalk.gray('\nEnter new features:\n'));
    while (adding) {
      const { feature } = await inquirer.prompt([
        {
          type: 'input',
          name: 'feature',
          message: `Feature ${features.length + 1} (or press Enter when done):`,
        },
      ]);
      if (feature.trim()) {
        features.push(feature.trim());
      } else if (features.length > 0) {
        adding = false;
      } else {
        console.log(chalk.yellow('Please add at least one feature.'));
      }
    }
    return features;
  }
}

async function modifyInfrastructure(current: AIRecommendations['infrastructure']): Promise<AIRecommendations['infrastructure']> {
  const { hosting } = await inquirer.prompt([
    {
      type: 'list',
      name: 'hosting',
      message: 'Hosting platform:',
      choices: [
        { name: 'Vercel (Frontend/Serverless)', value: 'Vercel' },
        { name: 'Railway', value: 'Railway' },
        { name: 'AWS', value: 'AWS' },
        { name: 'Google Cloud', value: 'GCP' },
        { name: 'Azure', value: 'Azure' },
        { name: 'Fly.io', value: 'Fly.io' },
        { name: 'Self-hosted', value: 'Self-hosted' },
        { name: `Keep: ${current.hosting}`, value: current.hosting },
      ],
    },
  ]);

  const { cicd } = await inquirer.prompt([
    {
      type: 'list',
      name: 'cicd',
      message: 'CI/CD:',
      choices: [
        { name: 'GitHub Actions', value: 'GitHub Actions' },
        { name: 'GitLab CI', value: 'GitLab CI' },
        { name: 'None', value: 'None' },
        { name: `Keep: ${current.cicd}`, value: current.cicd },
      ],
    },
  ]);

  const { containerization } = await inquirer.prompt([
    {
      type: 'list',
      name: 'containerization',
      message: 'Containerization:',
      choices: [
        { name: 'Docker with docker-compose', value: 'Docker with docker-compose' },
        { name: 'Docker only', value: 'Docker' },
        { name: 'Kubernetes', value: 'Kubernetes' },
        { name: 'None', value: 'None' },
        { name: `Keep: ${current.containerization}`, value: current.containerization },
      ],
    },
  ]);

  return {
    ...current,
    hosting,
    cicd,
    containerization,
  };
}

function buildProjectInfo(
  basicInfo: { name: string; description: string },
  rec: AIRecommendations,
  targetAgent: 'claude-code' | 'codex' | 'both',
  additions?: { features?: string[]; constraints?: string }
): ProjectInfo {
  // Merge additional features if provided
  const features = additions?.features
    ? [...rec.features, ...additions.features]
    : rec.features;

  // Merge constraints if provided
  const constraints = additions?.constraints
    ? `${rec.technicalConstraints}. ${additions.constraints}`
    : rec.technicalConstraints;

  // Parse infrastructure recommendations into structured format
  const infrastructure = parseInfrastructureRecommendations(rec.infrastructure);

  return {
    name: basicInfo.name.trim(),
    description: basicInfo.description.trim(),
    targetUsers: rec.targetUsers,
    coreFeatures: features,
    technicalConstraints: constraints,
    successMetrics: rec.successMetrics,
    techStack: rec.techStack,
    targetAgent,
    infrastructure,
  };
}

function parseInfrastructureRecommendations(infra: AIRecommendations['infrastructure']): InfrastructureConfig {
  // Map hosting string to platform enum
  const hostingMap: Record<string, InfrastructureConfig['hosting']['platform']> = {
    'vercel': 'vercel',
    'railway': 'railway',
    'aws': 'aws',
    'gcp': 'gcp',
    'google cloud': 'gcp',
    'azure': 'azure',
    'fly.io': 'fly-io',
    'self-hosted': 'self-hosted',
    'netlify': 'netlify',
  };

  const hostingLower = infra.hosting.toLowerCase();
  let hostingPlatform: InfrastructureConfig['hosting']['platform'] = 'other';
  for (const [key, value] of Object.entries(hostingMap)) {
    if (hostingLower.includes(key)) {
      hostingPlatform = value;
      break;
    }
  }

  // Map CI/CD
  const cicdMap: Record<string, InfrastructureConfig['cicd']['platform']> = {
    'github actions': 'github-actions',
    'gitlab ci': 'gitlab-ci',
    'jenkins': 'jenkins',
    'circleci': 'circleci',
    'none': 'none',
  };

  const cicdLower = infra.cicd.toLowerCase();
  let cicdPlatform: InfrastructureConfig['cicd']['platform'] = 'github-actions';
  for (const [key, value] of Object.entries(cicdMap)) {
    if (cicdLower.includes(key)) {
      cicdPlatform = value;
      break;
    }
  }

  // Map containerization
  const useDocker = infra.containerization.toLowerCase().includes('docker');
  let orchestration: InfrastructureConfig['containerization']['orchestration'] = 'none';
  if (infra.containerization.toLowerCase().includes('compose')) {
    orchestration = 'docker-compose';
  } else if (infra.containerization.toLowerCase().includes('kubernetes')) {
    orchestration = 'kubernetes';
  }

  // Map IaC
  const iacMap: Record<string, InfrastructureConfig['infrastructure']['tool']> = {
    'terraform': 'terraform',
    'pulumi': 'pulumi',
    'cloudformation': 'cloudformation',
    'cdk': 'cdk',
    'bicep': 'bicep',
  };

  const iacLower = infra.iac.toLowerCase();
  let iacTool: InfrastructureConfig['infrastructure']['tool'] | undefined;
  for (const [key, value] of Object.entries(iacMap)) {
    if (iacLower.includes(key)) {
      iacTool = value;
      break;
    }
  }

  return {
    hosting: {
      platform: hostingPlatform,
    },
    repository: {
      platform: infra.repository.toLowerCase().includes('gitlab') ? 'gitlab' : 'github',
      visibility: 'private',
    },
    cicd: {
      platform: cicdPlatform,
      autoDeploy: true,
    },
    infrastructure: {
      asCode: !!iacTool,
      tool: iacTool,
    },
    containerization: {
      useDocker,
      orchestration,
    },
    environments: ['development', 'staging', 'production'],
    secrets: {
      management: hostingPlatform === 'aws' ? 'aws-secrets'
        : hostingPlatform === 'gcp' ? 'gcp-secrets'
        : hostingPlatform === 'azure' ? 'azure-keyvault'
        : 'env-files',
    },
  };
}

async function manualInterview(
  config: UserConfig,
  basicInfo: { name: string; description: string }
): Promise<ProjectInfo> {
  console.log(chalk.cyan('\n👥 Target Users\n'));

  const userInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetUsers',
      message: 'Who are the target users?',
      validate: (input: string) => input.trim().length > 0 || 'Target users are required',
    },
  ]);

  console.log(chalk.cyan('\n✨ Core Features\n'));
  console.log(chalk.gray('Enter your core features one by one. Type "done" when finished.\n'));

  const features: string[] = [];
  let addingFeatures = true;

  while (addingFeatures) {
    const { feature } = await inquirer.prompt([
      {
        type: 'input',
        name: 'feature',
        message: `Feature ${features.length + 1} (or "done"):`,
      },
    ]);

    if (feature.toLowerCase() === 'done') {
      if (features.length === 0) {
        console.log(chalk.yellow('Please add at least one feature.'));
      } else {
        addingFeatures = false;
      }
    } else if (feature.trim()) {
      features.push(feature.trim());
    }
  }

  console.log(chalk.cyan('\n🔧 Technical Details\n'));

  const techInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'techStack',
      message: 'What tech stack do you want to use? (or leave blank for AI to recommend)',
      default: '',
    },
    {
      type: 'input',
      name: 'technicalConstraints',
      message: 'Any technical constraints?',
      default: 'None specified',
    },
  ]);

  const infrastructure = await collectInfrastructureConfig();

  console.log(chalk.cyan('\n📊 Success Metrics\n'));

  const metricsInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'successMetrics',
      message: 'How will you measure success?',
      default: 'Functional implementation meeting all requirements',
    },
  ]);

  console.log(chalk.cyan('\n🤖 Coding Agent\n'));

  const agentInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'targetAgent',
      message: 'Which AI coding agent(s) will you use?',
      choices: [
        { name: 'Claude Code (recommended)', value: 'claude-code' },
        { name: 'OpenAI Codex', value: 'codex' },
        { name: 'Both', value: 'both' },
      ],
      default: config.defaultAgent,
    },
  ]);

  return {
    name: basicInfo.name.trim(),
    description: basicInfo.description.trim(),
    targetUsers: userInfo.targetUsers.trim(),
    coreFeatures: features,
    technicalConstraints: techInfo.technicalConstraints.trim(),
    successMetrics: metricsInfo.successMetrics.trim(),
    techStack: techInfo.techStack.trim() || undefined,
    targetAgent: agentInfo.targetAgent,
    infrastructure,
  };
}

async function collectInfrastructureConfig(): Promise<InfrastructureConfig> {
  console.log(chalk.cyan('\n🚀 Infrastructure & Deployment\n'));

  const hostingInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Where will this be hosted?',
      choices: [
        { name: 'Vercel (Frontend/Serverless)', value: 'vercel' },
        { name: 'Railway', value: 'railway' },
        { name: 'AWS', value: 'aws' },
        { name: 'Google Cloud Platform', value: 'gcp' },
        { name: 'Microsoft Azure', value: 'azure' },
        { name: 'Fly.io', value: 'fly-io' },
        { name: 'Self-hosted', value: 'self-hosted' },
        { name: 'Other', value: 'other' },
      ],
    },
  ]);

  let selfHostedType: InfrastructureConfig['hosting']['selfHostedType'];
  if (hostingInfo.platform === 'self-hosted') {
    const selfHosted = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'How will it run?',
        choices: [
          { name: 'Docker Compose', value: 'docker-compose' },
          { name: 'Kubernetes', value: 'kubernetes' },
          { name: 'Shell script', value: 'shell-script' },
          { name: 'Systemd service', value: 'systemd' },
        ],
      },
    ]);
    selfHostedType = selfHosted.type;
  }

  const repoInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Repository platform?',
      choices: [
        { name: 'GitHub', value: 'github' },
        { name: 'GitLab', value: 'gitlab' },
        { name: 'Bitbucket', value: 'bitbucket' },
      ],
    },
    {
      type: 'list',
      name: 'visibility',
      message: 'Repository visibility?',
      choices: [
        { name: 'Private', value: 'private' },
        { name: 'Public', value: 'public' },
      ],
    },
  ]);

  const cicdInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'CI/CD?',
      choices: [
        { name: 'GitHub Actions', value: 'github-actions' },
        { name: 'GitLab CI', value: 'gitlab-ci' },
        { name: 'None', value: 'none' },
      ],
    },
    {
      type: 'confirm',
      name: 'autoDeploy',
      message: 'Auto-deploy on merge to main?',
      default: true,
    },
  ]);

  const containerInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDocker',
      message: 'Use Docker?',
      default: true,
    },
  ]);

  let orchestration: InfrastructureConfig['containerization']['orchestration'];
  if (containerInfo.useDocker) {
    const orchInfo = await inquirer.prompt([
      {
        type: 'list',
        name: 'orchestration',
        message: 'Container orchestration?',
        choices: [
          { name: 'Docker Compose', value: 'docker-compose' },
          { name: 'None (single container)', value: 'none' },
          { name: 'Kubernetes', value: 'kubernetes' },
        ],
      },
    ]);
    orchestration = orchInfo.orchestration;
  }

  return {
    hosting: {
      platform: hostingInfo.platform,
      selfHostedType,
    },
    repository: {
      platform: repoInfo.platform,
      visibility: repoInfo.visibility,
    },
    cicd: {
      platform: cicdInfo.platform,
      autoDeploy: cicdInfo.autoDeploy,
    },
    infrastructure: {
      asCode: false,
      tool: undefined,
    },
    containerization: {
      useDocker: containerInfo.useDocker,
      orchestration,
    },
    environments: ['development', 'staging', 'production'],
    secrets: {
      management: 'env-files',
    },
  };
}

export async function confirmProjectInfo(info: ProjectInfo): Promise<boolean> {
  console.log(chalk.cyan('\n📋 Project Summary\n'));
  console.log(chalk.white(`Name: ${info.name}`));
  console.log(chalk.white(`Description: ${info.description.substring(0, 200)}${info.description.length > 200 ? '...' : ''}`));
  console.log(chalk.white(`Target Users: ${info.targetUsers}`));
  console.log(chalk.white(`Features:`));
  info.coreFeatures.forEach((f, i) => console.log(chalk.gray(`  ${i + 1}. ${f}`)));
  console.log(chalk.white(`Tech Stack: ${info.techStack || 'AI will recommend'}`));
  console.log(chalk.white(`Constraints: ${info.technicalConstraints}`));

  console.log(chalk.cyan('\n🚀 Infrastructure\n'));
  const infra = info.infrastructure;
  console.log(chalk.white(`Hosting: ${infra.hosting.platform}${infra.hosting.selfHostedType ? ` (${infra.hosting.selfHostedType})` : ''}`));
  console.log(chalk.white(`Repository: ${infra.repository.platform} (${infra.repository.visibility})`));
  console.log(chalk.white(`CI/CD: ${infra.cicd.platform}${infra.cicd.autoDeploy ? ' (auto-deploy enabled)' : ''}`));
  console.log(chalk.white(`Docker: ${infra.containerization.useDocker ? `Yes${infra.containerization.orchestration ? ` (${infra.containerization.orchestration})` : ''}` : 'No'}`));
  console.log(chalk.white(`Environments: ${infra.environments.join(', ')}`));

  console.log(chalk.white(`\nSuccess Metrics: ${info.successMetrics}`));
  console.log(chalk.white(`Target Agent: ${info.targetAgent}`));

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Does this look correct?',
      default: true,
    },
  ]);

  return confirmed;
}
