import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig, validateConfig } from '../utils/config.js';
import { parsePRD } from '../parsers/prd.js';
import { researchPRDContext } from '../llm/client.js';
import { writePRDFiles } from '../generators/writer.js';
import { readJson, prdExists, getPaths } from '../utils/files.js';
import type { ProgressState } from '../types.js';

export function createMcpServer() {
  const server = new McpServer({
    name: 'vibe-assistant',
    version: '0.2.0',
  });

  // Tool: parse_prd
  server.tool(
    'parse_prd',
    {
      prd_path: z.string().describe('Path to the PRD file to parse'),
      project_name: z.string().optional().describe('Project name (auto-detected if not provided)'),
      target_agent: z.enum(['claude-code', 'codex', 'both']).optional().describe('Target AI agent (defaults to claude-code)'),
      project_dir: z.string().optional().describe('Project directory to write files to (defaults to current directory)'),
    },
    async ({ prd_path, project_name, target_agent, project_dir }) => {
      try {
        const config = await loadConfig();
        const validation = validateConfig(config);

        if (!validation.valid) {
          return {
            content: [{
              type: 'text',
              text: `Configuration error: ${validation.errors.join(', ')}`,
            }],
            isError: true,
          };
        }

        // Read PRD file
        const absolutePath = path.resolve(prd_path);
        const prdContent = await fs.readFile(absolutePath, 'utf-8');

        // Set target agent
        if (target_agent) {
          config.defaultAgent = target_agent;
        }

        const baseDir = project_dir || process.cwd();

        // Research step (if Perplexity is configured)
        let researchResults: string | undefined;
        if (config.perplexityApiKey) {
          try {
            researchResults = await researchPRDContext(config, prdContent);
          } catch {
            // Continue without research
          }
        }

        // Parse the PRD
        const parsedPRD = await parsePRD(
          config,
          prdContent,
          project_name,
          researchResults
        );

        // Write files
        await writePRDFiles(parsedPRD, config, baseDir);

        return {
          content: [{
            type: 'text',
            text: `Successfully parsed PRD for "${parsedPRD.projectInfo.name}".\n\nExtracted ${parsedPRD.phases.length} phases with ${parsedPRD.totalTasks} total tasks.\n\nGenerated files:\n- ${config.outputDir}/PRD.md\n- ${config.outputDir}/phases/ (${parsedPRD.phases.length} files)\n- docs/progress/state.json\n- CLAUDE.md\n- .claude/commands/\n\nUse /next-task to get started!`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error parsing PRD: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool: get_status
  server.tool(
    'get_status',
    {
      project_dir: z.string().optional().describe('Project directory (defaults to current directory)'),
    },
    async ({ project_dir }) => {
      try {
        const config = await loadConfig();
        const baseDir = project_dir || process.cwd();
        const paths = getPaths(baseDir, config.outputDir);

        if (!(await prdExists(baseDir, config.outputDir))) {
          return {
            content: [{
              type: 'text',
              text: 'No PRD found in this directory. Run parse_prd first.',
            }],
          };
        }

        const state = await readJson<ProgressState>(paths.state);

        if (!state) {
          return {
            content: [{
              type: 'text',
              text: 'No progress state found. The state.json file may have been deleted.',
            }],
          };
        }

        const taskStatuses = Object.values(state.tasks);
        const completed = taskStatuses.filter((t) => t.status === 'completed').length;
        const inProgress = taskStatuses.filter((t) => t.status === 'in_progress').length;
        const pending = taskStatuses.filter((t) => t.status === 'pending').length;
        const total = taskStatuses.length;
        const progressPct = Math.round((completed / total) * 100);

        return {
          content: [{
            type: 'text',
            text: `Project Status\n\nCurrent Phase: ${state.currentPhase}\nLast Updated: ${new Date(state.lastUpdated).toLocaleString()}\n\nProgress: ${progressPct}% (${completed}/${total} tasks)\n- Completed: ${completed}\n- In Progress: ${inProgress}\n- Pending: ${pending}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool: get_next_task
  server.tool(
    'get_next_task',
    {
      project_dir: z.string().optional().describe('Project directory (defaults to current directory)'),
    },
    async ({ project_dir }) => {
      try {
        const config = await loadConfig();
        const baseDir = project_dir || process.cwd();
        const paths = getPaths(baseDir, config.outputDir);

        const state = await readJson<ProgressState>(paths.state);

        if (!state) {
          return {
            content: [{
              type: 'text',
              text: 'No progress state found. Run parse_prd first.',
            }],
          };
        }

        // Find tasks in current phase
        const currentPhaseTasks = Object.entries(state.tasks)
          .filter(([id]) => id.startsWith(`phase${state.currentPhase}-`));

        // Find next pending task whose dependencies are met
        for (const [taskId, taskState] of currentPhaseTasks) {
          if (taskState.status === 'pending') {
            // Read phase file to get task details
            const phaseFile = path.join(paths.phases, `phase-${state.currentPhase}.md`);
            const phaseContent = await fs.readFile(phaseFile, 'utf-8');

            // Extract task info from phase file
            const taskMatch = phaseContent.match(new RegExp(`### \\d+\\. ([^\\n]+)\\n\\*\\*ID:\\*\\* \`${taskId}\`[\\s\\S]*?(?=### \\d+\\.|## Completion|$)`));

            if (taskMatch) {
              return {
                content: [{
                  type: 'text',
                  text: `Next Task:\n\nID: ${taskId}\n\n${taskMatch[0].trim()}\n\nTo mark as in-progress, update docs/progress/state.json`,
                }],
              };
            }

            return {
              content: [{
                type: 'text',
                text: `Next Task: ${taskId}\n\nSee ${config.outputDir}/phases/phase-${state.currentPhase}.md for details.`,
              }],
            };
          }
        }

        // Check if all tasks in current phase are done
        const allDone = currentPhaseTasks.every(([, t]) => t.status === 'completed');
        if (allDone) {
          return {
            content: [{
              type: 'text',
              text: `Phase ${state.currentPhase} is complete! Check exit criteria and advance to Phase ${state.currentPhase + 1}.`,
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: 'No pending tasks found. Check if there are tasks in progress.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting next task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool: check_if_implemented
  server.tool(
    'check_if_implemented',
    {
      issue_description: z.string().describe('Description of the issue or feature to check'),
      project_dir: z.string().optional().describe('Project directory (defaults to current directory)'),
    },
    async ({ issue_description, project_dir }) => {
      try {
        const config = await loadConfig();
        const baseDir = project_dir || process.cwd();
        const paths = getPaths(baseDir, config.outputDir);

        const state = await readJson<ProgressState>(paths.state);

        if (!state) {
          return {
            content: [{
              type: 'text',
              text: 'No progress state found. Cannot determine implementation status.',
            }],
          };
        }

        // Read PRD to find related tasks
        const prdContent = await fs.readFile(paths.prd, 'utf-8');

        return {
          content: [{
            type: 'text',
            text: `Issue: ${issue_description}\n\nCurrent Phase: ${state.currentPhase}\nCompleted Tasks: ${Object.entries(state.tasks).filter(([, t]) => t.status === 'completed').map(([id]) => id).join(', ') || 'None'}\n\nTo determine if this is a bug or not implemented yet:\n1. Check if a related task exists in the PRD\n2. Check if that task is marked as completed\n3. If completed -> likely a bug\n4. If pending/in_progress -> not implemented yet\n\nReview ${config.outputDir}/PRD.md for task details.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error checking implementation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  return server;
}
