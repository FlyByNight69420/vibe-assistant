import type { UserConfig, ParsedPRD, Phase, Task, ResearchResults, TechStackInfo } from '../types.js';
import { generateWithClaude, formatResearchResults } from '../llm/client.js';

const PARSE_SYSTEM_PROMPT = `You are an expert at analyzing Product Requirements Documents (PRDs) and extracting structured tasks for AI coding agents like Claude Code.

Your job is to:
1. Analyze the provided PRD content
2. Extract a clear project summary and goals
3. Break down the requirements into logical implementation phases
4. Create specific, actionable tasks within each phase
5. Identify task dependencies and parallelization opportunities

Output Requirements:
- Each phase should have clear entry/exit criteria
- Tasks should be specific enough for an AI agent to implement
- Task IDs should follow the format: phase{N}-task{M} (e.g., phase1-task1, phase1-task2)
- Dependencies should reference other task IDs
- Mark tasks as parallelizable when they don't depend on each other

You MUST respond with valid JSON matching this exact schema:
{
  "projectName": "string - extracted or inferred project name",
  "description": "string - brief project description",
  "summary": "string - 1-2 sentence summary of what the project does",
  "goals": ["string array of main project goals"],
  "techStack": {
    "language": "javascript|typescript|python|go|rust|ruby|java|other",
    "packageManager": "npm|yarn|pnpm|pip|poetry|pipenv|cargo|bundler|maven|gradle|go",
    "framework": "string or null (e.g., 'nextjs', 'django', 'fastapi', 'rails', 'express')",
    "hasDocker": true|false,
    "devCommand": "string or null (e.g., 'npm run dev', 'python manage.py runserver')",
    "buildCommand": "string or null",
    "testCommand": "string or null"
  },
  "phases": [
    {
      "number": 1,
      "name": "Phase Name",
      "description": "What this phase accomplishes",
      "entryCriteria": ["What must be true before starting this phase"],
      "exitCriteria": ["What must be true to complete this phase"],
      "tasks": [
        {
          "id": "phase1-task1",
          "title": "Task Title",
          "description": "Detailed description of what to implement, including specific package versions where relevant",
          "dependencies": [],
          "parallelizable": true
        }
      ]
    }
  ]
}

Important guidelines:
- First phase should typically be project setup/scaffolding
- Group related functionality into the same phase
- Later phases should build on earlier ones
- Each task should be completable in a single focused session
- Be specific about what files/components to create or modify

Tech Stack Guidelines:
- Infer the primary language and package manager from the PRD content
- Identify the main framework being used (if any)
- Set hasDocker to true if the PRD mentions Docker, containers, or docker-compose
- Provide sensible defaults for devCommand, buildCommand, testCommand based on the stack

CRITICAL - When research results are provided:
1. **Package Versions**: Use the EXACT versions specified in research. Include version numbers in task descriptions (e.g., "Install React 18.3.1", "Set up PostgreSQL 16.x")
2. **Avoid Deprecated Tech**: If research lists deprecated packages, DO NOT include them. Use the suggested alternatives instead.
3. **Task Breakdown**: Follow the suggested number of phases and tasks per phase from research guidance. Adjust only if the PRD clearly requires more/fewer divisions.
4. **Critical Path**: Order phases according to the critical path identified in research. Build foundation components before dependent ones.
5. **Best Practices**: Incorporate architectural patterns and practices from research into task descriptions.`;

interface ParseResponse {
  projectName: string;
  description: string;
  summary: string;
  goals: string[];
  techStack?: {
    language: TechStackInfo['language'];
    packageManager?: TechStackInfo['packageManager'];
    framework?: string;
    hasDocker?: boolean;
    devCommand?: string;
    buildCommand?: string;
    testCommand?: string;
  };
  phases: {
    number: number;
    name: string;
    description: string;
    entryCriteria: string[];
    exitCriteria: string[];
    tasks: {
      id: string;
      title: string;
      description: string;
      dependencies: string[];
      parallelizable: boolean;
    }[];
  }[];
}

export async function parsePRD(
  config: UserConfig,
  prdContent: string,
  projectName?: string,
  researchResults?: ResearchResults
): Promise<ParsedPRD> {
  let userPrompt = '';

  if (projectName) {
    userPrompt += `Project Name: ${projectName}\n\n`;
  }

  userPrompt += `PRD Content:\n${prdContent}`;

  if (researchResults) {
    const formattedResearch = formatResearchResults(researchResults);
    userPrompt += `\n\n---\n\n# Research Results (FOLLOW THESE GUIDELINES)\n\n${formattedResearch}`;
  }

  const response = await generateWithClaude(
    config,
    PARSE_SYSTEM_PROMPT,
    userPrompt,
    8192
  );

  // Clean up response - remove markdown code fences if present
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  const parsed: ParseResponse = JSON.parse(jsonStr);

  // Convert to ParsedPRD format
  const phases: Phase[] = parsed.phases.map((p) => ({
    number: p.number,
    name: p.name,
    description: p.description,
    entryCriteria: p.entryCriteria,
    exitCriteria: p.exitCriteria,
    tasks: p.tasks.map((t): Task => ({
      id: t.id,
      title: t.title,
      description: t.description,
      phase: p.number,
      dependencies: t.dependencies,
      status: 'pending',
      parallelizable: t.parallelizable,
    })),
  }));

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);

  // Build tech stack info if provided
  let techStack: TechStackInfo | undefined;
  if (parsed.techStack) {
    techStack = {
      language: parsed.techStack.language,
      packageManager: parsed.techStack.packageManager,
      framework: parsed.techStack.framework || undefined,
      hasDocker: parsed.techStack.hasDocker,
      devCommand: parsed.techStack.devCommand || undefined,
      buildCommand: parsed.techStack.buildCommand || undefined,
      testCommand: parsed.techStack.testCommand || undefined,
    };
  }

  return {
    projectInfo: {
      name: projectName || parsed.projectName,
      description: parsed.description,
      targetAgent: config.defaultAgent,
    },
    overview: {
      summary: parsed.summary,
      goals: parsed.goals,
    },
    phases,
    totalTasks,
    techStack,
  };
}
