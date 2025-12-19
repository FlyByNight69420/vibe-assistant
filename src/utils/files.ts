import fs from 'fs-extra';
import path from 'path';

export async function ensureProjectDirs(baseDir: string, outputDir: string): Promise<void> {
  const dirs = [
    path.join(baseDir, outputDir),
    path.join(baseDir, outputDir, 'phases'),
    path.join(baseDir, outputDir, 'research'),
    path.join(baseDir, outputDir, 'architecture'),
    path.join(baseDir, 'docs', 'progress'),
    path.join(baseDir, '.claude', 'commands'),
  ];

  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
}

export async function writeMarkdown(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
  } catch {
    // File doesn't exist or invalid JSON
  }
  return null;
}

export async function readMarkdown(filePath: string): Promise<string | null> {
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readFile(filePath, 'utf-8');
    }
  } catch {
    // File doesn't exist
  }
  return null;
}

export async function prdExists(baseDir: string, outputDir: string): Promise<boolean> {
  const prdPath = path.join(baseDir, outputDir, 'PRD.md');
  return fs.pathExists(prdPath);
}

export function getPaths(baseDir: string, outputDir: string) {
  return {
    prd: path.join(baseDir, outputDir, 'PRD.md'),
    phases: path.join(baseDir, outputDir, 'phases'),
    research: path.join(baseDir, outputDir, 'research'),
    architecture: path.join(baseDir, outputDir, 'architecture'),
    progress: path.join(baseDir, 'docs', 'progress'),
    state: path.join(baseDir, 'docs', 'progress', 'state.json'),
    tasksJson: path.join(baseDir, 'docs', 'progress', 'tasks.json'),
    progressLog: path.join(baseDir, 'docs', 'progress', 'progress.txt'),
    claudeMd: path.join(baseDir, 'CLAUDE.md'),
    agentsMd: path.join(baseDir, 'AGENTS.md'),
    slashCommands: path.join(baseDir, '.claude', 'commands'),
    initScript: path.join(baseDir, 'init.sh'),
  };
}
