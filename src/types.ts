export interface UserConfig {
  anthropicApiKey?: string;
  perplexityApiKey?: string;
  defaultAgent: 'claude-code' | 'codex' | 'both';
  outputDir: string;
  claudeModel?: string;  // Claude model to use (default: claude-sonnet-4-5-20250929)
}

export interface ProjectInfo {
  name: string;
  description: string;
  targetAgent: 'claude-code' | 'codex' | 'both';
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

// ParsedPRD - simplified output from parsing an existing PRD
export interface ParsedPRD {
  projectInfo: ProjectInfo;
  overview: {
    summary: string;
    goals: string[];
  };
  phases: Phase[];
  totalTasks: number;
  techStack?: TechStackInfo;
}

// Tech stack information for init.sh generation
export interface TechStackInfo {
  language: 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'ruby' | 'java' | 'other';
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'pipenv' | 'cargo' | 'bundler' | 'maven' | 'gradle' | 'go';
  framework?: string;  // e.g., 'nextjs', 'django', 'fastapi', 'rails', 'express', etc.
  hasDocker?: boolean;
  devCommand?: string;  // Custom dev command if known, e.g., 'npm run dev', 'python manage.py runserver'
  buildCommand?: string;
  testCommand?: string;
}

// Research results - structured output from Perplexity research
export interface PackageVersionInfo {
  name: string;
  recommendedVersion: string;
  latestVersion?: string;
  isLTS?: boolean;
  notes?: string;
  deprecated?: boolean;
  alternative?: string;
}

export interface TaskGuidance {
  suggestedPhases: number;
  tasksPerPhase: { min: number; max: number };
  complexityRating: 'simple' | 'medium' | 'complex';
  criticalPath: string[];
  reasoning: string;
}

export interface ResearchResults {
  generalContext: string;
  versionInfo?: {
    packages: PackageVersionInfo[];
    deprecated: string[];
    alternatives: Record<string, string>;
  };
  taskGuidance?: TaskGuidance;
  techStack?: string[];
}

// Deployment strategy configuration
export type DeploymentType =
  | 'local'              // Git only, no remote, run locally
  | 'github-only'        // GitHub repo, no automated deployment
  | 'github-cloud'       // GitHub + cloud hosting (Vercel, Netlify, etc.)
  | 'github-aws'         // GitHub + AWS infrastructure
  | 'github-gcp'         // GitHub + Google Cloud infrastructure
  | 'github-azure'       // GitHub + Azure infrastructure
  | 'self-hosted';       // Docker, deploy to VPS

export type CloudProvider = 'vercel' | 'netlify' | 'railway' | 'render' | 'fly-io' | 'other';
export type IaCTool = 'terraform' | 'cdk' | 'pulumi' | 'cloudformation' | 'none';

export interface DeploymentConfig {
  type: DeploymentType;
  cloudProvider?: CloudProvider;      // For github-cloud
  iacTool?: IaCTool;                  // For github-aws/gcp/azure
  description?: string;               // User's custom description if needed
}

export const DEPLOYMENT_DESCRIPTIONS: Record<DeploymentType, string> = {
  'local': 'Local development only. Git for version control, no remote repository. Application runs locally.',
  'github-only': 'GitHub repository for version control and collaboration. No automated deployment - deploy manually or separately.',
  'github-cloud': 'GitHub with CI/CD pipeline. Auto-deploy to cloud hosting provider on push to main branch.',
  'github-aws': 'Full AWS infrastructure with GitHub Actions CI/CD. Includes IaC, staging environments, and production deployment.',
  'github-gcp': 'Full Google Cloud infrastructure with GitHub Actions CI/CD. Includes IaC, staging environments, and production deployment.',
  'github-azure': 'Full Azure infrastructure with GitHub Actions CI/CD. Includes IaC, staging environments, and production deployment.',
  'self-hosted': 'Docker containerization with deployment to VPS or bare metal. Includes Dockerfile, docker-compose, and deployment scripts.',
};
