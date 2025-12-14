import { describe, it, expect } from 'vitest';
import { generateMainPRD, generatePhaseFile, generateInitialState } from './markdown.js';
import type { ParsedPRD, Phase } from '../types.js';

const mockPRD: ParsedPRD = {
  projectInfo: {
    name: 'Test Project',
    description: 'A test project for testing',
    targetAgent: 'claude-code',
  },
  overview: {
    summary: 'This is a test project.',
    goals: ['Goal 1', 'Goal 2'],
  },
  phases: [
    {
      number: 1,
      name: 'Setup',
      description: 'Initial project setup',
      entryCriteria: ['Nothing exists'],
      exitCriteria: ['Project is initialized'],
      tasks: [
        {
          id: 'phase1-task1',
          title: 'Initialize project',
          description: 'Create initial project structure',
          phase: 1,
          dependencies: [],
          status: 'pending',
          parallelizable: false,
        },
        {
          id: 'phase1-task2',
          title: 'Add dependencies',
          description: 'Install required packages',
          phase: 1,
          dependencies: ['phase1-task1'],
          status: 'pending',
          parallelizable: false,
        },
      ],
    },
    {
      number: 2,
      name: 'Core Features',
      description: 'Implement core functionality',
      entryCriteria: ['Phase 1 complete'],
      exitCriteria: ['Core features working'],
      tasks: [
        {
          id: 'phase2-task1',
          title: 'Build API',
          description: 'Create REST API endpoints',
          phase: 2,
          dependencies: [],
          status: 'pending',
          parallelizable: true,
        },
      ],
    },
  ],
  totalTasks: 3,
};

describe('generateMainPRD', () => {
  it('generates PRD with project name', () => {
    const result = generateMainPRD(mockPRD, 'docs/prd');

    expect(result).toContain('# Test Project - Task Breakdown');
  });

  it('includes overview summary', () => {
    const result = generateMainPRD(mockPRD, 'docs/prd');

    expect(result).toContain('This is a test project.');
  });

  it('includes goals', () => {
    const result = generateMainPRD(mockPRD, 'docs/prd');

    expect(result).toContain('- Goal 1');
    expect(result).toContain('- Goal 2');
  });

  it('includes phase references with correct outputDir', () => {
    const result = generateMainPRD(mockPRD, 'custom/output');

    expect(result).toContain('`custom/output/phases/phase-1.md`');
    expect(result).toContain('`custom/output/phases/phase-2.md`');
  });

  it('uses configured outputDir in file structure', () => {
    const result = generateMainPRD(mockPRD, 'my-docs/tasks');

    expect(result).toContain('my-docs/tasks/');
    expect(result).toContain('my-docs/tasks/phases/');
  });
});

describe('generatePhaseFile', () => {
  it('generates phase with correct number and name', () => {
    const phase = mockPRD.phases[0];
    const result = generatePhaseFile(phase, mockPRD);

    expect(result).toContain('# Phase 1: Setup');
  });

  it('includes entry and exit criteria as checkboxes', () => {
    const phase = mockPRD.phases[0];
    const result = generatePhaseFile(phase, mockPRD);

    expect(result).toContain('- [ ] Nothing exists');
    expect(result).toContain('- [ ] Project is initialized');
  });

  it('includes task details with correct format', () => {
    const phase = mockPRD.phases[0];
    const result = generatePhaseFile(phase, mockPRD);

    expect(result).toContain('**ID:** `phase1-task1`');
    expect(result).toContain('**Status:** pending');
  });

  it('shows dependencies correctly', () => {
    const phase = mockPRD.phases[0];
    const result = generatePhaseFile(phase, mockPRD);

    expect(result).toContain('**Dependencies:** None');
    expect(result).toContain('**Dependencies:** `phase1-task1`');
  });

  it('shows parallelizable status', () => {
    const phase = mockPRD.phases[1];
    const result = generatePhaseFile(phase, mockPRD);

    expect(result).toContain('**Parallelizable:** Yes');
  });
});

describe('generateInitialState', () => {
  it('creates state with all tasks as pending', () => {
    const state = generateInitialState(mockPRD);

    expect(state.tasks['phase1-task1'].status).toBe('pending');
    expect(state.tasks['phase1-task2'].status).toBe('pending');
    expect(state.tasks['phase2-task1'].status).toBe('pending');
  });

  it('starts at phase 1', () => {
    const state = generateInitialState(mockPRD);

    expect(state.currentPhase).toBe(1);
  });

  it('has empty checkpoints array', () => {
    const state = generateInitialState(mockPRD);

    expect(state.checkpoints).toHaveLength(0);
  });

  it('includes lastUpdated timestamp', () => {
    const state = generateInitialState(mockPRD);

    expect(state.lastUpdated).toBeDefined();
    expect(new Date(state.lastUpdated).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('includes all tasks from all phases', () => {
    const state = generateInitialState(mockPRD);

    expect(Object.keys(state.tasks)).toHaveLength(3);
  });
});
