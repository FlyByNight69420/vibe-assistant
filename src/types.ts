export interface UserConfig {
  anthropicApiKey?: string;
  perplexityApiKey?: string;
  researchProvider: 'perplexity' | 'claude';
  defaultAgent: 'claude-code' | 'codex' | 'both';
  outputDir: string;
}

export interface InfrastructureConfig {
  hosting: {
    platform: 'aws' | 'gcp' | 'azure' | 'vercel' | 'netlify' | 'railway' | 'fly-io' | 'self-hosted' | 'other';
    platformDetails?: string; // For 'other' or additional details
    selfHostedType?: 'docker-compose' | 'kubernetes' | 'shell-script' | 'systemd' | 'other';
  };
  repository: {
    platform: 'github' | 'gitlab' | 'bitbucket' | 'other';
    visibility: 'public' | 'private';
  };
  cicd: {
    platform: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci' | 'none' | 'other';
    autoDeploy: boolean; // Deploy on merge to main
  };
  infrastructure: {
    asCode: boolean; // Use IaC
    tool?: 'terraform' | 'pulumi' | 'cloudformation' | 'cdk' | 'bicep' | 'none';
  };
  containerization: {
    useDocker: boolean;
    orchestration?: 'none' | 'docker-compose' | 'kubernetes' | 'ecs' | 'cloud-run';
  };
  environments: string[]; // e.g., ['development', 'staging', 'production']
  secrets: {
    management: 'env-files' | 'vault' | 'aws-secrets' | 'gcp-secrets' | 'azure-keyvault' | 'doppler' | 'other';
  };
}

export interface ProjectInfo {
  name: string;
  description: string;
  targetUsers: string;
  coreFeatures: string[];
  technicalConstraints: string;
  successMetrics: string;
  techStack?: string;
  targetAgent: 'claude-code' | 'codex' | 'both';
  infrastructure: InfrastructureConfig;
}

export interface PRDOverview {
  problemStatement: string;
  targetUsers: string;
  successMetrics: string[];
}

export interface Feature {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  behavior: string;
}

export interface CapabilityDomain {
  name: string;
  description: string;
  features: Feature[];
}

export interface Module {
  name: string;
  path: string;
  description: string;
  capabilities: string[];
  dependencies: string[];
}

export interface DependencyLayer {
  name: string;
  modules: string[];
  dependsOn: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  phase: number;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
  parallelizable: boolean;
  researchRequired?: string;
}

export interface Phase {
  number: number;
  name: string;
  description: string;
  entryCriteria: string[];
  exitCriteria: string[];
  tasks: Task[];
}

export interface TestStrategy {
  unitTests: string[];
  integrationTests: string[];
  e2eTests: string[];
  coverageTarget: number;
  criticalScenarios: string[];
}

export interface Risk {
  type: 'technical' | 'dependency' | 'scope';
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface DeploymentPipeline {
  description: string;
  steps: string[];
  triggers: string[];
  artifacts: string[];
}

export interface InfrastructureSpec {
  overview: string;
  hosting: {
    platform: string;
    services: string[]; // e.g., ['EC2', 'RDS', 'S3'] or ['Cloud Run', 'Cloud SQL']
    regions: string[];
  };
  iacFiles: {
    path: string;
    description: string;
    tool: string;
  }[];
  cicdPipeline: DeploymentPipeline;
  containerization: {
    dockerfile: string; // Path or description
    composeFile?: string;
    orchestration: string;
  };
  environments: {
    name: string;
    purpose: string;
    url?: string;
    autoDeployBranch?: string;
  }[];
  secrets: {
    strategy: string;
    requiredSecrets: string[];
  };
  bootstrapSteps: string[]; // Steps to go from zero to running
  teardownSteps: string[]; // Steps to clean up everything
}

export interface PRDDocument {
  projectInfo: ProjectInfo;
  overview: PRDOverview;
  functionalDecomposition: CapabilityDomain[];
  structuralDecomposition: Module[];
  dependencyGraph: DependencyLayer[];
  implementationRoadmap: Phase[];
  testStrategy: TestStrategy;
  architecture: {
    decisions: string[];
    dataModels: string[];
    techStackRationale: string;
  };
  infrastructure: InfrastructureSpec;
  risks: Risk[];
  appendix: {
    glossary: Record<string, string>;
    openQuestions: string[];
    references: string[];
  };
}

export interface ProgressState {
  currentPhase: number;
  tasks: Record<string, {
    status: 'pending' | 'in_progress' | 'completed';
    completedAt?: string;
    notes?: string;
  }>;
  checkpoints: {
    phase: number;
    task: string;
    summary: string;
    createdAt: string;
  }[];
  lastUpdated: string;
}

export interface ResearchResult {
  query: string;
  provider: 'perplexity' | 'claude';
  response: string;
  timestamp: string;
}
