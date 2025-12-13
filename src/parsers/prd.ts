import type { UserConfig, ParsedPRD, Phase, Task } from '../types.js';
import { generateWithClaude } from '../llm/client.js';

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
          "description": "Detailed description of what to implement",
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
- If research results are provided, use them to inform best practices and implementation approaches`;

interface ParseResponse {
  projectName: string;
  description: string;
  summary: string;
  goals: string[];
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
  researchResults?: string
): Promise<ParsedPRD> {
  let userPrompt = '';

  if (projectName) {
    userPrompt += `Project Name: ${projectName}\n\n`;
  }

  userPrompt += `PRD Content:\n${prdContent}`;

  if (researchResults) {
    userPrompt += `\n\n---\n\nResearch Results (use these to inform best practices):\n${researchResults}`;
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
  };
}
