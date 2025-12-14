import { describe, it, expect } from 'vitest';
import { getPaths } from './files.js';

describe('getPaths', () => {
  it('returns correct paths for default outputDir', () => {
    const paths = getPaths('/project', 'docs/prd');

    expect(paths.prd).toBe('/project/docs/prd/PRD.md');
    expect(paths.phases).toBe('/project/docs/prd/phases');
    expect(paths.research).toBe('/project/docs/prd/research');
    expect(paths.architecture).toBe('/project/docs/prd/architecture');
    expect(paths.progress).toBe('/project/docs/progress');
    expect(paths.state).toBe('/project/docs/progress/state.json');
    expect(paths.claudeMd).toBe('/project/CLAUDE.md');
    expect(paths.agentsMd).toBe('/project/AGENTS.md');
    expect(paths.slashCommands).toBe('/project/.claude/commands');
  });

  it('handles custom outputDir', () => {
    const paths = getPaths('/my-project', 'custom/tasks');

    expect(paths.prd).toBe('/my-project/custom/tasks/PRD.md');
    expect(paths.phases).toBe('/my-project/custom/tasks/phases');
  });

  it('handles outputDir with leading slash (path.join normalizes)', () => {
    const paths = getPaths('/base', '/output');

    // path.join normalizes double slashes
    expect(paths.prd).toBe('/base/output/PRD.md');
  });

  it('always puts progress in docs/progress', () => {
    const paths = getPaths('/project', 'different/location');

    expect(paths.progress).toBe('/project/docs/progress');
    expect(paths.state).toBe('/project/docs/progress/state.json');
  });

  it('always puts CLAUDE.md and AGENTS.md in project root', () => {
    const paths = getPaths('/project', 'nested/deep/prd');

    expect(paths.claudeMd).toBe('/project/CLAUDE.md');
    expect(paths.agentsMd).toBe('/project/AGENTS.md');
  });

  it('always puts slash commands in .claude/commands', () => {
    const paths = getPaths('/project', 'anywhere');

    expect(paths.slashCommands).toBe('/project/.claude/commands');
  });
});
