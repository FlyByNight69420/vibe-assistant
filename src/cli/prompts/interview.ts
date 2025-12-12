import inquirer from 'inquirer';
import chalk from 'chalk';
import type { ProjectInfo, UserConfig, InfrastructureConfig } from '../../types.js';

export async function conductInterview(config: UserConfig): Promise<ProjectInfo> {
  console.log(chalk.cyan('\n🎯 Let\'s define your project\n'));
  console.log(chalk.gray('I\'ll ask you a series of questions to understand what you want to build.\n'));

  // Basic project info
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
      message: 'Describe your project in detail. What problem does it solve? What are the main features?',
      waitForUseInput: false,
    },
  ]);

  console.log(chalk.cyan('\n👥 Target Users\n'));

  const userInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetUsers',
      message: 'Who are the target users? (e.g., "developers", "small business owners", "data scientists")',
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
      message: 'Any technical constraints? (e.g., "must work offline", "needs to be mobile-first")',
      default: 'None specified',
    },
  ]);

  // Infrastructure & Deployment
  console.log(chalk.cyan('\n🚀 Infrastructure & Deployment\n'));
  console.log(chalk.gray('Let\'s define how this will be deployed and automated.\n'));

  const infrastructure = await collectInfrastructureConfig();

  console.log(chalk.cyan('\n📊 Success Metrics\n'));

  const metricsInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'successMetrics',
      message: 'How will you measure success? (e.g., "user adoption", "performance benchmarks")',
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
  // Hosting platform
  const hostingInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Where will this be hosted?',
      choices: [
        { name: 'AWS (EC2, Lambda, ECS, etc.)', value: 'aws' },
        { name: 'Google Cloud Platform', value: 'gcp' },
        { name: 'Microsoft Azure', value: 'azure' },
        { name: 'Vercel (Frontend/Serverless)', value: 'vercel' },
        { name: 'Netlify (Frontend/Serverless)', value: 'netlify' },
        { name: 'Railway', value: 'railway' },
        { name: 'Fly.io', value: 'fly-io' },
        { name: 'Self-hosted (on-premises or VPS)', value: 'self-hosted' },
        { name: 'Other', value: 'other' },
      ],
    },
  ]);

  let selfHostedType: InfrastructureConfig['hosting']['selfHostedType'];
  let platformDetails: string | undefined;

  if (hostingInfo.platform === 'self-hosted') {
    const selfHosted = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'How do you want to run it on your infrastructure?',
        choices: [
          { name: 'Docker Compose (recommended for single-server)', value: 'docker-compose' },
          { name: 'Kubernetes (for orchestration)', value: 'kubernetes' },
          { name: 'Shell script (./start.sh)', value: 'shell-script' },
          { name: 'Systemd service', value: 'systemd' },
          { name: 'Other', value: 'other' },
        ],
      },
    ]);
    selfHostedType = selfHosted.type;
  }

  if (hostingInfo.platform === 'other') {
    const other = await inquirer.prompt([
      {
        type: 'input',
        name: 'details',
        message: 'Please specify the hosting platform:',
      },
    ]);
    platformDetails = other.details;
  }

  // Repository
  const repoInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Where will the code be stored?',
      choices: [
        { name: 'GitHub', value: 'github' },
        { name: 'GitLab', value: 'gitlab' },
        { name: 'Bitbucket', value: 'bitbucket' },
        { name: 'Other', value: 'other' },
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

  // CI/CD - smart defaults based on repo
  const cicdChoices = getCICDChoices(repoInfo.platform);
  const cicdInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'CI/CD pipeline?',
      choices: cicdChoices,
    },
    {
      type: 'confirm',
      name: 'autoDeploy',
      message: 'Auto-deploy on merge to main branch?',
      default: true,
    },
  ]);

  // Infrastructure as Code
  const iacInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'asCode',
      message: 'Use Infrastructure as Code (IaC)?',
      default: hostingInfo.platform !== 'vercel' && hostingInfo.platform !== 'netlify',
    },
  ]);

  let iacTool: InfrastructureConfig['infrastructure']['tool'];
  if (iacInfo.asCode) {
    const iacToolChoices = getIaCToolChoices(hostingInfo.platform);
    const iacToolInfo = await inquirer.prompt([
      {
        type: 'list',
        name: 'tool',
        message: 'Which IaC tool?',
        choices: iacToolChoices,
      },
    ]);
    iacTool = iacToolInfo.tool;
  }

  // Containerization
  const containerInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDocker',
      message: 'Use Docker for containerization?',
      default: true,
    },
  ]);

  let orchestration: InfrastructureConfig['containerization']['orchestration'];
  if (containerInfo.useDocker) {
    const orchestrationChoices = getOrchestrationChoices(hostingInfo.platform);
    const orchInfo = await inquirer.prompt([
      {
        type: 'list',
        name: 'orchestration',
        message: 'Container orchestration?',
        choices: orchestrationChoices,
      },
    ]);
    orchestration = orchInfo.orchestration;
  }

  // Environments
  const envInfo = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'environments',
      message: 'Which environments do you need?',
      choices: [
        { name: 'Development (local)', value: 'development', checked: true },
        { name: 'Staging/Preview', value: 'staging', checked: true },
        { name: 'Production', value: 'production', checked: true },
      ],
    },
  ]);

  // Secrets management
  const secretsChoices = getSecretsChoices(hostingInfo.platform);
  const secretsInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'management',
      message: 'How should secrets be managed?',
      choices: secretsChoices,
    },
  ]);

  return {
    hosting: {
      platform: hostingInfo.platform,
      platformDetails,
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
      asCode: iacInfo.asCode,
      tool: iacTool,
    },
    containerization: {
      useDocker: containerInfo.useDocker,
      orchestration,
    },
    environments: envInfo.environments,
    secrets: {
      management: secretsInfo.management,
    },
  };
}

function getCICDChoices(repoPlatform: string) {
  const choices = [
    { name: 'None (manual deployment)', value: 'none' },
  ];

  if (repoPlatform === 'github') {
    choices.unshift({ name: 'GitHub Actions (recommended)', value: 'github-actions' });
  } else if (repoPlatform === 'gitlab') {
    choices.unshift({ name: 'GitLab CI (recommended)', value: 'gitlab-ci' });
  }

  choices.push(
    { name: 'Jenkins', value: 'jenkins' },
    { name: 'CircleCI', value: 'circleci' },
    { name: 'Other', value: 'other' },
  );

  return choices;
}

function getIaCToolChoices(hostingPlatform: string) {
  const choices = [
    { name: 'Terraform (recommended - multi-cloud)', value: 'terraform' },
    { name: 'Pulumi (TypeScript/Python IaC)', value: 'pulumi' },
  ];

  if (hostingPlatform === 'aws') {
    choices.push(
      { name: 'AWS CloudFormation', value: 'cloudformation' },
      { name: 'AWS CDK', value: 'cdk' },
    );
  } else if (hostingPlatform === 'azure') {
    choices.push({ name: 'Bicep', value: 'bicep' });
  }

  choices.push({ name: 'None', value: 'none' });
  return choices;
}

function getOrchestrationChoices(hostingPlatform: string) {
  const choices = [
    { name: 'None (single container)', value: 'none' },
    { name: 'Docker Compose', value: 'docker-compose' },
    { name: 'Kubernetes', value: 'kubernetes' },
  ];

  if (hostingPlatform === 'aws') {
    choices.push({ name: 'AWS ECS', value: 'ecs' });
  } else if (hostingPlatform === 'gcp') {
    choices.push({ name: 'Cloud Run', value: 'cloud-run' });
  }

  return choices;
}

function getSecretsChoices(hostingPlatform: string) {
  const choices = [
    { name: 'Environment files (.env)', value: 'env-files' },
    { name: 'HashiCorp Vault', value: 'vault' },
    { name: 'Doppler', value: 'doppler' },
  ];

  if (hostingPlatform === 'aws') {
    choices.splice(1, 0, { name: 'AWS Secrets Manager (recommended)', value: 'aws-secrets' });
  } else if (hostingPlatform === 'gcp') {
    choices.splice(1, 0, { name: 'GCP Secret Manager (recommended)', value: 'gcp-secrets' });
  } else if (hostingPlatform === 'azure') {
    choices.splice(1, 0, { name: 'Azure Key Vault (recommended)', value: 'azure-keyvault' });
  }

  choices.push({ name: 'Other', value: 'other' });
  return choices;
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
  console.log(chalk.white(`IaC: ${infra.infrastructure.asCode ? infra.infrastructure.tool || 'Yes' : 'No'}`));
  console.log(chalk.white(`Docker: ${infra.containerization.useDocker ? `Yes${infra.containerization.orchestration ? ` (${infra.containerization.orchestration})` : ''}` : 'No'}`));
  console.log(chalk.white(`Environments: ${infra.environments.join(', ')}`));
  console.log(chalk.white(`Secrets: ${infra.secrets.management}`));

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
