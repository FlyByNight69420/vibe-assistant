import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig, validateConfig } from '../utils/config.js';
import { parsePRD } from '../parsers/prd.js';
import { researchPRDContext, generateWithClaude } from '../llm/client.js';
import { writePRDFiles } from '../generators/writer.js';
import {
  generateInitialPRD,
  refinePRD,
  formatWithRPGTemplate,
  researchProjectIdea,
} from '../generators/prd-creator.js';
import { readJson, prdExists, getPaths } from '../utils/files.js';
import type { ProgressState, ResearchResults, DeploymentConfig, DeploymentType, CloudProvider, IaCTool } from '../types.js';

export function createMcpServer(version: string = '0.0.0') {
  const server = new McpServer({
    name: 'vibe-assistant',
    version,
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
        let researchResults: ResearchResults | undefined;
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

        const agentFiles = parsedPRD.projectInfo.targetAgent === 'codex'
          ? '- AGENTS.md'
          : parsedPRD.projectInfo.targetAgent === 'both'
            ? '- CLAUDE.md\n- .claude/commands/\n- AGENTS.md'
            : '- CLAUDE.md\n- .claude/commands/';

        return {
          content: [{
            type: 'text',
            text: `Successfully parsed PRD for "${parsedPRD.projectInfo.name}".\n\nExtracted ${parsedPRD.phases.length} phases with ${parsedPRD.totalTasks} total tasks.\n\nGenerated files:\n- ${config.outputDir}/PRD.md\n- ${config.outputDir}/phases/ (${parsedPRD.phases.length} files)\n- docs/progress/state.json\n${agentFiles}\n\nUse /next-task to get started!`,
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

        // Read phase file to get task details and dependencies
        const phaseFile = path.join(paths.phases, `phase-${state.currentPhase}.md`);
        let phaseContent: string;
        try {
          phaseContent = await fs.readFile(phaseFile, 'utf-8');
        } catch {
          return {
            content: [{
              type: 'text',
              text: `Phase file not found: ${phaseFile}`,
            }],
            isError: true,
          };
        }

        // Parse task dependencies from phase file
        const taskDependencies: Record<string, string[]> = {};
        const taskRegex = /\*\*ID:\*\* `([^`]+)`[\s\S]*?\*\*Dependencies:\*\* ([^\n]+)/g;
        let match;
        while ((match = taskRegex.exec(phaseContent)) !== null) {
          const taskId = match[1];
          const depsStr = match[2].trim();
          if (depsStr === 'None') {
            taskDependencies[taskId] = [];
          } else {
            // Extract task IDs from backticks: `phase1-task1`, `phase1-task2`
            const deps = depsStr.match(/`([^`]+)`/g)?.map(d => d.replace(/`/g, '')) || [];
            taskDependencies[taskId] = deps;
          }
        }

        // Find tasks in current phase
        const currentPhaseTasks = Object.entries(state.tasks)
          .filter(([id]) => id.startsWith(`phase${state.currentPhase}-`));

        // Helper function to check if all dependencies are completed
        const areDependenciesMet = (taskId: string): boolean => {
          const deps = taskDependencies[taskId] || [];
          return deps.every(depId => {
            const depState = state.tasks[depId];
            return depState && depState.status === 'completed';
          });
        };

        // Find next pending task whose dependencies are met
        for (const [taskId, taskState] of currentPhaseTasks) {
          if (taskState.status === 'pending' && areDependenciesMet(taskId)) {
            // Extract task info from phase file
            const taskMatch = phaseContent.match(new RegExp(`### \\d+\\. ([^\\n]+)\\n\\*\\*ID:\\*\\* \`${taskId}\`[\\s\\S]*?(?=### \\d+\\.|## Completion|$)`));

            const deps = taskDependencies[taskId] || [];
            const depsStatus = deps.length > 0
              ? `\nDependencies (all completed): ${deps.map(d => `\`${d}\``).join(', ')}`
              : '\nDependencies: None';

            if (taskMatch) {
              return {
                content: [{
                  type: 'text',
                  text: `Next Task:\n\nID: ${taskId}${depsStatus}\n\n${taskMatch[0].trim()}\n\nTo mark as in-progress, update docs/progress/state.json`,
                }],
              };
            }

            return {
              content: [{
                type: 'text',
                text: `Next Task: ${taskId}${depsStatus}\n\nSee ${config.outputDir}/phases/phase-${state.currentPhase}.md for details.`,
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

        // Check if there are pending tasks blocked by dependencies
        const pendingTasks = currentPhaseTasks.filter(([, t]) => t.status === 'pending');
        const inProgressTasks = currentPhaseTasks.filter(([, t]) => t.status === 'in_progress');

        if (pendingTasks.length > 0 && inProgressTasks.length > 0) {
          const blockedTasks = pendingTasks
            .filter(([id]) => !areDependenciesMet(id))
            .map(([id]) => {
              const deps = taskDependencies[id] || [];
              const unmetDeps = deps.filter(d => state.tasks[d]?.status !== 'completed');
              return `- ${id} (waiting on: ${unmetDeps.join(', ')})`;
            });

          return {
            content: [{
              type: 'text',
              text: `No tasks available - ${inProgressTasks.length} task(s) in progress.\n\nIn progress: ${inProgressTasks.map(([id]) => id).join(', ')}\n\nBlocked tasks:\n${blockedTasks.join('\n')}\n\nComplete in-progress tasks to unblock pending work.`,
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

        // Build task status map
        const completedTasks = Object.entries(state.tasks)
          .filter(([, t]) => t.status === 'completed')
          .map(([id]) => id);
        const pendingTasks = Object.entries(state.tasks)
          .filter(([, t]) => t.status === 'pending')
          .map(([id]) => id);
        const inProgressTasks = Object.entries(state.tasks)
          .filter(([, t]) => t.status === 'in_progress')
          .map(([id]) => id);

        // Use Claude to analyze the issue
        const analysisPrompt = `You are analyzing whether a reported issue is a BUG or a feature that is NOT YET IMPLEMENTED.

PROJECT STATE:
- Current Phase: ${state.currentPhase}
- Completed Tasks: ${completedTasks.join(', ') || 'None'}
- In Progress Tasks: ${inProgressTasks.join(', ') || 'None'}
- Pending Tasks: ${pendingTasks.join(', ') || 'None'}

PRD CONTENT:
${prdContent}

REPORTED ISSUE:
${issue_description}

ANALYSIS INSTRUCTIONS:
1. Identify what feature or functionality the issue relates to
2. Find which task(s) in the PRD would implement this feature
3. Check the status of those tasks
4. Make a determination:
   - If the relevant task is COMPLETED -> This is likely a BUG
   - If the relevant task is PENDING or IN_PROGRESS -> NOT IMPLEMENTED YET
   - If no task covers this feature -> Feature not in scope (NOT IMPLEMENTED)

Respond with this exact format:
VERDICT: [BUG or NOT_IMPLEMENTED]
RELATED_TASK: [task-id or "none"]
TASK_STATUS: [completed/pending/in_progress/not_found]
EXPLANATION: [1-2 sentence explanation]
RECOMMENDATION: [What the user should do next]`;

        const analysis = await generateWithClaude(
          config,
          'You analyze project implementation status to determine if issues are bugs or unimplemented features.',
          analysisPrompt,
          500
        );

        return {
          content: [{
            type: 'text',
            text: `Issue Analysis: ${issue_description}\n\n${analysis}`,
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

  // Tool: create_prd
  server.tool(
    'create_prd',
    {
      idea: z.string().describe('Project idea or description'),
      project_name: z.string().optional().describe('Project name (auto-detected if not provided)'),
      project_dir: z.string().optional().describe('Project directory to write files to (defaults to current directory)'),
      deployment_type: z.enum(['local', 'github-only', 'github-cloud', 'github-aws', 'github-gcp', 'github-azure', 'self-hosted'])
        .describe('Deployment strategy: local (Git only), github-only (no auto-deploy), github-cloud (Vercel/Netlify/etc.), github-aws/gcp/azure (full infrastructure), self-hosted (Docker/VPS)'),
      cloud_provider: z.enum(['vercel', 'netlify', 'railway', 'render', 'fly-io', 'other']).optional()
        .describe('Cloud hosting provider (required if deployment_type is github-cloud)'),
      iac_tool: z.enum(['terraform', 'cdk', 'pulumi', 'cloudformation', 'none']).optional()
        .describe('Infrastructure as Code tool (required if deployment_type is github-aws/gcp/azure)'),
      refinement_passes: z.number().optional().describe('Number of self-refinement passes (default: 1)'),
      interactive: z.boolean().optional().describe('If true, returns PRD for user feedback instead of auto-refining (default: false)'),
      feedback: z.string().optional().describe('User feedback to refine an existing PRD (used with interactive mode)'),
      current_prd: z.string().optional().describe('Current PRD content to refine (used with interactive mode and feedback)'),
    },
    async ({ idea, project_name, project_dir, deployment_type, cloud_provider, iac_tool, refinement_passes = 1, interactive = false, feedback, current_prd }) => {
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

        const baseDir = project_dir || process.cwd();

        // If we have feedback and current_prd, this is a refinement request
        if (feedback && current_prd) {
          const refinedPRD = await refinePRD(config, current_prd, feedback);

          if (interactive) {
            // Return refined PRD for further feedback
            return {
              content: [{
                type: 'text',
                text: `PRD refined based on your feedback.\n\n---\n\n${refinedPRD}\n\n---\n\nProvide more feedback to continue refining, or call create_prd with interactive=false to finalize.`,
              }],
            };
          }

          // Finalize the refined PRD
          const rawPrdPath = path.join(baseDir, 'raw-prd.md');
          await fs.writeFile(rawPrdPath, refinedPRD, 'utf-8');

          const parsedPRD = await formatWithRPGTemplate(config, refinedPRD, project_name);
          await writePRDFiles(parsedPRD, config, baseDir);

          const createdAgentFiles = parsedPRD.projectInfo.targetAgent === 'codex'
            ? '- AGENTS.md'
            : parsedPRD.projectInfo.targetAgent === 'both'
              ? '- CLAUDE.md\n- .claude/commands/\n- AGENTS.md'
              : '- CLAUDE.md\n- .claude/commands/';

          return {
            content: [{
              type: 'text',
              text: `Successfully created PRD for "${parsedPRD.projectInfo.name}".\n\nGenerated ${parsedPRD.phases.length} phases with ${parsedPRD.totalTasks} total tasks.\n\nFiles created:\n- raw-prd.md (original PRD)\n- ${config.outputDir}/PRD.md\n- ${config.outputDir}/phases/ (${parsedPRD.phases.length} files)\n- docs/progress/state.json\n${createdAgentFiles}\n\nUse /next-task to get started!`,
            }],
          };
        }

        // Build deployment config
        const deploymentConfig: DeploymentConfig = {
          type: deployment_type as DeploymentType,
          cloudProvider: cloud_provider as CloudProvider | undefined,
          iacTool: iac_tool as IaCTool | undefined,
        };

        // Research step (if Perplexity is configured)
        let research: ResearchResults | undefined;
        if (config.perplexityApiKey) {
          try {
            research = await researchProjectIdea(config, idea);
          } catch {
            // Continue without research
          }
        }

        // Generate initial PRD
        let currentPRD = await generateInitialPRD(
          config,
          idea,
          project_name,
          research,
          deploymentConfig
        );

        // Interactive mode: return PRD for user feedback
        if (interactive) {
          return {
            content: [{
              type: 'text',
              text: `Generated initial PRD. Please review and provide feedback.\n\n---\n\n${currentPRD}\n\n---\n\nTo refine this PRD, call create_prd again with:\n- feedback: "your feedback here"\n- current_prd: (the PRD above)\n- interactive: true (to continue refining) or false (to finalize)`,
            }],
          };
        }

        // Self-refinement passes (Claude critiques and improves its own PRD)
        for (let i = 0; i < refinement_passes; i++) {
          const critiquePrompt = `Review this PRD and identify any gaps, inconsistencies, or areas that could be improved. Then provide specific feedback:\n\n${currentPRD}`;

          const critique = await generateWithClaude(
            config,
            'You are a critical reviewer of PRDs. Identify gaps, missing details, unclear requirements, and suggest improvements.',
            critiquePrompt,
            1000
          );

          currentPRD = await refinePRD(config, currentPRD, critique);
        }

        // Save raw PRD
        const rawPrdPath = path.join(baseDir, 'raw-prd.md');
        await fs.writeFile(rawPrdPath, currentPRD, 'utf-8');

        // Format with RPG template
        const parsedPRD = await formatWithRPGTemplate(
          config,
          currentPRD,
          project_name
        );

        // Write all files
        await writePRDFiles(parsedPRD, config, baseDir);

        const createdAgentFiles = parsedPRD.projectInfo.targetAgent === 'codex'
          ? '- AGENTS.md'
          : parsedPRD.projectInfo.targetAgent === 'both'
            ? '- CLAUDE.md\n- .claude/commands/\n- AGENTS.md'
            : '- CLAUDE.md\n- .claude/commands/';

        return {
          content: [{
            type: 'text',
            text: `Successfully created PRD for "${parsedPRD.projectInfo.name}".\n\nGenerated ${parsedPRD.phases.length} phases with ${parsedPRD.totalTasks} total tasks.\n\nFiles created:\n- raw-prd.md (original PRD)\n- ${config.outputDir}/PRD.md\n- ${config.outputDir}/phases/ (${parsedPRD.phases.length} files)\n- docs/progress/state.json\n${createdAgentFiles}\n\nUse /next-task to get started!`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating PRD: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  return server;
}
