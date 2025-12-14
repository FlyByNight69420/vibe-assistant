import { describe, it, expect } from 'vitest';
import { generateClaudeMd, generateAgentsMd, generateSlashCommands } from './agent-configs.js';
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

    expect(result).toContain('`custom/tasks/PRD.md`');
    expect(result).toContain('`custom/tasks/phases/phase-{N}.md`');
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

  it('includes task execution flow', () => {
    const result = generateAgentsMd(mockPRD, 'docs/prd');

    expect(result).toContain('Task Execution Flow');
  });

  it('uses configured outputDir', () => {
    const result = generateAgentsMd(mockPRD, 'my-output');

    expect(result).toContain('`my-output/PRD.md`');
  });
});

describe('generateSlashCommands', () => {
  it('generates 4 slash commands', () => {
    const result = generateSlashCommands(mockPRD, 'docs/prd');

    expect(Object.keys(result)).toHaveLength(4);
    expect(result).toHaveProperty('next-task.md');
    expect(result).toHaveProperty('checkpoint.md');
    expect(result).toHaveProperty('phase-status.md');
    expect(result).toHaveProperty('check-issue.md');
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
