import { describe, it, expect } from 'vitest';
import {
  generateClaudeMd,
  generateAgentsMd,
  generateSlashCommands,
  generateInitScript,
  generateTasksJson,
  generateProgressLog,
} from './agent-configs.js';
import type { ParsedPRD } from '../types.js';

const mockPRD: ParsedPRD = {
  projectInfo: {
    name: 'Test Project',
    description: 'A test project',
    targetAgent: 'claude-code',
  },
  overview: {
    summary: 'This is a test project summary.',
    goals: ['Build something', 'Ship it'],
  },
  phases: [
    {
      number: 1,
      name: 'Setup',
      description: 'Initial setup',
      entryCriteria: [],
      exitCriteria: [],
      tasks: [],
    },
  ],
  totalTasks: 0,
};

describe('generateClaudeMd', () => {
  it('includes project name', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('# Test Project');
  });

  it('includes project summary', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('This is a test project summary.');
  });

  it('includes goals', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('- Build something');
    expect(result).toContain('- Ship it');
  });

  it('includes critical before fixing section', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('CRITICAL: Before Fixing ANY Issue');
    expect(result).toContain('STOP');
    expect(result).toContain('Check `docs/progress/state.json`');
  });

  it('includes slash commands reference', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('/next-task');
    expect(result).toContain('/checkpoint');
    expect(result).toContain('/phase-status');
    expect(result).toContain('/check-issue');
  });

  it('uses configured outputDir', () => {
    const result = generateClaudeMd(mockPRD, 'custom/tasks');

    // Check output dir is used in file structure
    expect(result).toContain('custom/tasks/');
    expect(result).toContain('phases/');
  });

  it('includes session startup protocol', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('SESSION STARTUP PROTOCOL');
    expect(result).toContain('pwd');
    expect(result).toContain('git log');
    expect(result).toContain('./init.sh');
  });

  it('includes session end protocol', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('SESSION END PROTOCOL');
    expect(result).toContain('git add');
    expect(result).toContain('git commit');
  });

  it('references tasks.json for corruption-resistant tracking', () => {
    const result = generateClaudeMd(mockPRD, 'docs/prd');

    expect(result).toContain('tasks.json');
    expect(result).toContain('corruption-resistant');
  });
});

describe('generateAgentsMd', () => {
  it('includes project name with Codex reference', () => {
    const result = generateAgentsMd(mockPRD, 'docs/prd');

    expect(result).toContain('# Test Project - Codex Agent Instructions');
  });

  it('includes critical before fixing section', () => {
    const result = generateAgentsMd(mockPRD, 'docs/prd');

    expect(result).toContain('CRITICAL: Before Fixing ANY Issue');
  });

  it('includes implementation guidelines', () => {
    const result = generateAgentsMd(mockPRD, 'docs/prd');

    expect(result).toContain('Implementation Guidelines');
    expect(result).toContain('Single-Task Focus');
  });

  it('includes session protocols', () => {
    const result = generateAgentsMd(mockPRD, 'docs/prd');

    expect(result).toContain('SESSION STARTUP PROTOCOL');
    expect(result).toContain('SESSION END PROTOCOL');
  });

  it('uses configured outputDir', () => {
    const result = generateAgentsMd(mockPRD, 'my-output');

    expect(result).toContain('`my-output/PRD.md`');
  });
});

describe('generateSlashCommands', () => {
  it('generates 5 slash commands', () => {
    const result = generateSlashCommands(mockPRD, 'docs/prd');

    expect(Object.keys(result)).toHaveLength(5);
    expect(result).toHaveProperty('next-task.md');
    expect(result).toHaveProperty('checkpoint.md');
    expect(result).toHaveProperty('phase-status.md');
    expect(result).toHaveProperty('check-issue.md');
    expect(result).toHaveProperty('session-end.md');
  });

  it('session-end command includes commit and progress update instructions', () => {
    const result = generateSlashCommands(mockPRD, 'docs/prd');

    expect(result['session-end.md']).toContain('git add');
    expect(result['session-end.md']).toContain('git commit');
    expect(result['session-end.md']).toContain('progress.txt');
    expect(result['session-end.md']).toContain('tasks.json');
  });

  it('next-task command includes dependency checking instructions', () => {
    const result = generateSlashCommands(mockPRD, 'docs/prd');

    expect(result['next-task.md']).toContain('dependencies');
    expect(result['next-task.md']).toContain('completed');
  });

  it('checkpoint command includes state.json update instructions', () => {
    const result = generateSlashCommands(mockPRD, 'docs/prd');

    expect(result['checkpoint.md']).toContain('state.json');
    expect(result['checkpoint.md']).toContain('checkpoints');
  });

  it('check-issue command includes verdict options', () => {
    const result = generateSlashCommands(mockPRD, 'docs/prd');

    expect(result['check-issue.md']).toContain('BUG');
    expect(result['check-issue.md']).toContain('NOT IMPLEMENTED');
  });

  it('uses configured outputDir in all commands', () => {
    const result = generateSlashCommands(mockPRD, 'custom/dir');

    expect(result['next-task.md']).toContain('custom/dir/phases');
    expect(result['phase-status.md']).toContain('custom/dir/phases');
    expect(result['check-issue.md']).toContain('custom/dir/PRD.md');
  });
});

describe('generateInitScript', () => {
  it('generates bash script with shebang', () => {
    const result = generateInitScript(mockPRD);

    expect(result).toContain('#!/bin/bash');
  });

  it('includes project name in header', () => {
    const result = generateInitScript(mockPRD);

    expect(result).toContain('Test Project');
  });

  it('defaults to Node.js when no tech stack specified', () => {
    const result = generateInitScript(mockPRD);

    expect(result).toContain('package.json');
    expect(result).toContain('node_modules');
    expect(result).toContain('npm install');
    expect(result).toContain('npm run dev');
  });

  it('generates Python-specific script for Python projects', () => {
    const pythonPRD: ParsedPRD = {
      ...mockPRD,
      techStack: {
        language: 'python',
        packageManager: 'pip',
        framework: 'django',
      },
    };
    const result = generateInitScript(pythonPRD);

    expect(result).toContain('requirements.txt');
    expect(result).toContain('pip install');
    expect(result).toContain('manage.py runserver');
  });

  it('generates Go-specific script for Go projects', () => {
    const goPRD: ParsedPRD = {
      ...mockPRD,
      techStack: {
        language: 'go',
        packageManager: 'go',
      },
    };
    const result = generateInitScript(goPRD);

    expect(result).toContain('go.mod');
    expect(result).toContain('go mod download');
    expect(result).toContain('go run');
  });

  it('generates Rust-specific script for Rust projects', () => {
    const rustPRD: ParsedPRD = {
      ...mockPRD,
      techStack: {
        language: 'rust',
        packageManager: 'cargo',
      },
    };
    const result = generateInitScript(rustPRD);

    expect(result).toContain('Cargo.toml');
    expect(result).toContain('cargo fetch');
    expect(result).toContain('cargo run');
  });

  it('generates Docker-specific script when hasDocker is true', () => {
    const dockerPRD: ParsedPRD = {
      ...mockPRD,
      techStack: {
        language: 'typescript',
        hasDocker: true,
      },
    };
    const result = generateInitScript(dockerPRD);

    expect(result).toContain('docker-compose');
    expect(result).toContain('docker info');
  });

  it('uses custom devCommand when provided', () => {
    const customPRD: ParsedPRD = {
      ...mockPRD,
      techStack: {
        language: 'python',
        packageManager: 'poetry',
        devCommand: 'poetry run uvicorn app:main --reload',
      },
    };
    const result = generateInitScript(customPRD);

    expect(result).toContain('poetry run uvicorn app:main --reload');
  });

  it('uses yarn for yarn projects', () => {
    const yarnPRD: ParsedPRD = {
      ...mockPRD,
      techStack: {
        language: 'typescript',
        packageManager: 'yarn',
      },
    };
    const result = generateInitScript(yarnPRD);

    expect(result).toContain('yarn');
    expect(result).not.toContain('npm install');
  });
});

describe('generateTasksJson', () => {
  const prdWithTasks: ParsedPRD = {
    ...mockPRD,
    phases: [
      {
        number: 1,
        name: 'Setup',
        description: 'Initial setup',
        entryCriteria: [],
        exitCriteria: [],
        tasks: [
          {
            id: 'phase1-task1',
            title: 'Initialize project',
            description: 'Set up the project',
            phase: 1,
            dependencies: [],
            status: 'pending',
            parallelizable: false,
          },
          {
            id: 'phase1-task2',
            title: 'Add dependencies',
            description: 'Install packages',
            phase: 1,
            dependencies: ['phase1-task1'],
            status: 'pending',
            parallelizable: true,
          },
        ],
      },
    ],
    totalTasks: 2,
  };

  it('includes warning about not editing descriptions', () => {
    const result = generateTasksJson(prdWithTasks) as Record<string, unknown>;

    expect(result._warning).toContain('DO NOT edit');
  });

  it('includes project name and total tasks', () => {
    const result = generateTasksJson(prdWithTasks) as Record<string, unknown>;

    expect(result.projectName).toBe('Test Project');
    expect(result.totalTasks).toBe(2);
  });

  it('includes all tasks with correct structure', () => {
    const result = generateTasksJson(prdWithTasks) as { tasks: Array<Record<string, unknown>> };

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].id).toBe('phase1-task1');
    expect(result.tasks[0].phaseName).toBe('Setup');
    expect(result.tasks[0].status).toBe('pending');
  });

  it('preserves task dependencies', () => {
    const result = generateTasksJson(prdWithTasks) as { tasks: Array<Record<string, unknown>> };

    expect(result.tasks[1].dependencies).toContain('phase1-task1');
  });
});

describe('generateProgressLog', () => {
  it('includes project name in header', () => {
    const result = generateProgressLog(mockPRD);

    expect(result).toContain('# Test Project');
    expect(result).toContain('Progress Log');
  });

  it('includes initial session entry', () => {
    const result = generateProgressLog(mockPRD);

    expect(result).toContain('Project Initialized');
  });

  it('includes phase summary', () => {
    const result = generateProgressLog(mockPRD);

    expect(result).toContain('Phase 1');
    expect(result).toContain('Setup');
  });

  it('includes next steps guidance', () => {
    const result = generateProgressLog(mockPRD);

    expect(result).toContain('Next Steps');
    expect(result).toContain('/next-task');
  });
});
