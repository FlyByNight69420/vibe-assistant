import { describe, it, expect } from 'vitest';
import { validateConfig } from './config.js';
import type { UserConfig } from '../types.js';

describe('validateConfig', () => {
  it('returns valid when anthropic key is set', () => {
    const config: UserConfig = {
      anthropicApiKey: 'sk-ant-test-key',
      defaultAgent: 'claude-code',
      outputDir: 'docs/prd',
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid when anthropic key is missing', () => {
    const config: UserConfig = {
      defaultAgent: 'claude-code',
      outputDir: 'docs/prd',
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Anthropic API key');
  });

  it('warns when perplexity key is missing', () => {
    const config: UserConfig = {
      anthropicApiKey: 'sk-ant-test-key',
      defaultAgent: 'claude-code',
      outputDir: 'docs/prd',
    };

    const result = validateConfig(config);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Perplexity');
  });

  it('returns no warnings when perplexity key is set', () => {
    const config: UserConfig = {
      anthropicApiKey: 'sk-ant-test-key',
      perplexityApiKey: 'pplx-test-key',
      defaultAgent: 'claude-code',
      outputDir: 'docs/prd',
    };

    const result = validateConfig(config);

    expect(result.warnings).toHaveLength(0);
  });
});
