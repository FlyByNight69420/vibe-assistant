export interface UserConfig {
  anthropicApiKey?: string;
  perplexityApiKey?: string;
  defaultAgent: 'claude-code' | 'codex' | 'both';
  outputDir: string;
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
}
