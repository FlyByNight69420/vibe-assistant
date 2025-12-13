import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { UserConfig } from '../types.js';

const CONFIG_DIR = path.join(os.homedir(), '.vibe-assistant');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: UserConfig = {
  defaultAgent: 'claude-code',
  outputDir: 'docs/prd',
};

export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
}

export async function loadConfig(): Promise<UserConfig> {
  await ensureConfigDir();

  let fileConfig: Partial<UserConfig> = {};

  if (await fs.pathExists(CONFIG_FILE)) {
    try {
      fileConfig = await fs.readJson(CONFIG_FILE);
    } catch {
      // Invalid JSON, use defaults
    }
  }

  // Environment variables override file config
  const config: UserConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || fileConfig.anthropicApiKey,
    perplexityApiKey: process.env.PERPLEXITY_API_KEY || fileConfig.perplexityApiKey,
  };

  return config;
}

export async function saveConfig(config: Partial<UserConfig>): Promise<void> {
  await ensureConfigDir();

  const existingConfig = await loadConfig();
  const newConfig = { ...existingConfig, ...config };

  // Don't save API keys from env vars to file
  const configToSave = { ...newConfig };
  if (process.env.ANTHROPIC_API_KEY && configToSave.anthropicApiKey === process.env.ANTHROPIC_API_KEY) {
    delete configToSave.anthropicApiKey;
  }
  if (process.env.PERPLEXITY_API_KEY && configToSave.perplexityApiKey === process.env.PERPLEXITY_API_KEY) {
    delete configToSave.perplexityApiKey;
  }

  await fs.writeJson(CONFIG_FILE, configToSave, { spaces: 2 });
}

export function validateConfig(config: UserConfig): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.anthropicApiKey) {
    errors.push('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or run "vibe-assistant config".');
  }

  if (!config.perplexityApiKey) {
    warnings.push('Perplexity API key not set. Research will be skipped. Set PERPLEXITY_API_KEY for better task generation.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
