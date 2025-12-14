import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { UserConfig, ResearchResults, PackageVersionInfo, TaskGuidance } from '../types.js';

let anthropicClient: Anthropic | null = null;
let perplexityClient: OpenAI | null = null;

export function getAnthropicClient(config: UserConfig): Anthropic {
  if (!anthropicClient) {
    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }
    anthropicClient = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }
  return anthropicClient;
}

export function getPerplexityClient(config: UserConfig): OpenAI {
  if (!perplexityClient) {
    if (!config.perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }
    perplexityClient = new OpenAI({
      apiKey: config.perplexityApiKey,
      baseURL: 'https://api.perplexity.ai',
    });
  }
  return perplexityClient;
}

// Default Claude model
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

export async function generateWithClaude(
  config: UserConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<string> {
  const client = getAnthropicClient(config);
  const model = config.claudeModel || DEFAULT_CLAUDE_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}

export async function researchWithPerplexity(
  config: UserConfig,
  query: string,
  systemPrompt?: string
): Promise<string> {
  const client = getPerplexityClient(config);

  const response = await client.chat.completions.create({
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: systemPrompt || 'You are a technical research assistant helping to plan software projects. Provide concise, actionable information about best practices, common patterns, and recommended approaches. Focus on practical implementation details.',
      },
      {
        role: 'user',
        content: query,
      },
    ],
  });

  return response.choices[0]?.message?.content || 'No response';
}

/**
 * Extract technologies, frameworks, and packages mentioned in a PRD
 */
export async function extractTechStack(
  config: UserConfig,
  prdContent: string
): Promise<string[]> {
  const response = await generateWithClaude(
    config,
    'You extract technology references from documents. Return only a JSON array of strings.',
    `Extract all technologies, frameworks, libraries, databases, and packages mentioned or implied in this PRD. Include specific tools (e.g., "React", "PostgreSQL", "Jest") not generic terms (e.g., "database", "frontend").

PRD Content:
${prdContent.substring(0, 8000)}

Return a JSON array of technology names, e.g.: ["react", "typescript", "postgresql", "prisma"]
Only return the JSON array, nothing else.`,
    500
  );

  try {
    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

/**
 * Research current versions and status of packages
 */
export async function researchPackageVersions(
  config: UserConfig,
  packages: string[]
): Promise<{ packages: PackageVersionInfo[]; deprecated: string[]; alternatives: Record<string, string> }> {
  if (packages.length === 0) {
    return { packages: [], deprecated: [], alternatives: {} };
  }

  const query = `For these technologies/packages: ${packages.join(', ')}

Provide current information about each:
1. Current stable/recommended version (as of today)
2. Whether there's an LTS version available
3. Any deprecation warnings or end-of-life notices
4. If deprecated, what's the recommended modern alternative
5. Any critical notes (security issues, breaking changes in recent versions)

Return as JSON:
{
  "packages": [
    {
      "name": "package-name",
      "recommendedVersion": "x.y.z",
      "latestVersion": "x.y.z",
      "isLTS": true/false,
      "notes": "any important notes",
      "deprecated": true/false,
      "alternative": "alternative-package if deprecated"
    }
  ],
  "deprecated": ["list of deprecated packages to avoid"],
  "alternatives": { "oldPackage": "newPackage" }
}

Only return the JSON object.`;

  const systemPrompt = 'You are a software package version expert. Provide accurate, current version information. If unsure about exact versions, provide the most recent known stable version with a note.';

  try {
    const result = await researchWithPerplexity(config, query, systemPrompt);
    const cleaned = result.trim().replace(/```json\n?|\n?```/g, '');

    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        packages: parsed.packages || [],
        deprecated: parsed.deprecated || [],
        alternatives: parsed.alternatives || {},
      };
    }
  } catch (error) {
    console.warn('Failed to parse package version research:', error);
  }

  return { packages: [], deprecated: [], alternatives: {} };
}

/**
 * Research project complexity and task breakdown guidance
 */
export async function researchProjectComplexity(
  config: UserConfig,
  projectDescription: string,
  techStack: string[]
): Promise<TaskGuidance | undefined> {
  const query = `For a software project with this description:
"${projectDescription.substring(0, 1000)}"

Using technologies: ${techStack.join(', ')}

Based on similar projects, provide guidance on:
1. How many implementation phases is typical? (e.g., 3-6 phases)
2. How many tasks per phase is reasonable? (e.g., 4-8 tasks)
3. What's the complexity rating? (simple/medium/complex)
4. What's the critical path - which components must be built first and in what order?
5. Brief reasoning for this assessment

Return as JSON:
{
  "suggestedPhases": 4,
  "tasksPerPhase": { "min": 4, "max": 7 },
  "complexityRating": "medium",
  "criticalPath": ["database schema", "authentication", "core API", "frontend components", "integration"],
  "reasoning": "This is a medium complexity project because..."
}

Only return the JSON object.`;

  const systemPrompt = 'You are a software architect expert at estimating project complexity and breaking down work. Base your estimates on real-world experience with similar projects.';

  try {
    const result = await researchWithPerplexity(config, query, systemPrompt);
    const cleaned = result.trim().replace(/```json\n?|\n?```/g, '');

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as TaskGuidance;
    }
  } catch (error) {
    console.warn('Failed to parse complexity research:', error);
  }

  return undefined;
}

/**
 * Research general best practices for the project
 */
async function researchBestPractices(
  config: UserConfig,
  prdContent: string
): Promise<string> {
  // Extract key topics from the PRD to research
  const extractionPrompt = `Analyze this PRD and identify 3-5 key technical topics that would benefit from research.

Focus on topics where current best practices, architectural patterns, or common pitfalls would improve implementation quality.

PRD Content:
${prdContent.substring(0, 6000)}

Return a JSON array of specific research queries:
["query 1", "query 2", ...]

Only return the JSON array, nothing else.`;

  const topicsResponse = await generateWithClaude(
    config,
    'You analyze PRDs to identify technical topics worth researching.',
    extractionPrompt,
    500
  );

  let topics: string[];
  try {
    const cleaned = topicsResponse.trim().replace(/```json\n?|\n?```/g, '');
    topics = JSON.parse(cleaned);
  } catch {
    topics = [];
  }

  // Research each topic with Perplexity
  const results: string[] = [];

  for (const topic of topics.slice(0, 5)) {
    try {
      const result = await researchWithPerplexity(config, topic);
      results.push(`## ${topic}\n\n${result}`);
    } catch {
      console.warn(`Research failed for topic: ${topic}`);
    }
  }

  return results.join('\n\n---\n\n');
}

/**
 * Comprehensive PRD research - extracts tech stack, researches versions,
 * analyzes complexity, and gathers best practices
 */
export async function researchPRDContext(
  config: UserConfig,
  prdContent: string
): Promise<ResearchResults> {
  const results: ResearchResults = {
    generalContext: '',
    techStack: [],
  };

  // Step 1: Extract tech stack from PRD
  console.log('  Extracting tech stack...');
  results.techStack = await extractTechStack(config, prdContent);

  // Step 2: Research package versions (if we found any tech)
  if (results.techStack.length > 0) {
    console.log(`  Researching versions for ${results.techStack.length} technologies...`);
    results.versionInfo = await researchPackageVersions(config, results.techStack);
  }

  // Step 3: Research project complexity and task guidance
  console.log('  Analyzing project complexity...');
  const projectSummary = prdContent.substring(0, 2000);
  results.taskGuidance = await researchProjectComplexity(config, projectSummary, results.techStack || []);

  // Step 4: Research general best practices
  console.log('  Researching best practices...');
  results.generalContext = await researchBestPractices(config, prdContent);

  return results;
}

/**
 * Format ResearchResults into a string for inclusion in prompts
 */
export function formatResearchResults(research: ResearchResults): string {
  const sections: string[] = [];

  // Version information
  if (research.versionInfo && research.versionInfo.packages.length > 0) {
    sections.push('## Package Versions (USE THESE VERSIONS)\n');
    for (const pkg of research.versionInfo.packages) {
      let line = `- **${pkg.name}**: ${pkg.recommendedVersion}`;
      if (pkg.isLTS) line += ' (LTS)';
      if (pkg.notes) line += ` - ${pkg.notes}`;
      if (pkg.deprecated && pkg.alternative) {
        line = `- **${pkg.name}**: ⚠️ DEPRECATED - use ${pkg.alternative} instead`;
      }
      sections.push(line);
    }

    if (research.versionInfo.deprecated.length > 0) {
      sections.push('\n### ⚠️ AVOID THESE (Deprecated):');
      sections.push(research.versionInfo.deprecated.join(', '));
    }

    if (Object.keys(research.versionInfo.alternatives).length > 0) {
      sections.push('\n### Modern Alternatives:');
      for (const [old, modern] of Object.entries(research.versionInfo.alternatives)) {
        sections.push(`- ${old} → **${modern}**`);
      }
    }
  }

  // Task guidance
  if (research.taskGuidance) {
    sections.push('\n## Task Breakdown Guidance\n');
    sections.push(`- **Complexity**: ${research.taskGuidance.complexityRating}`);
    sections.push(`- **Suggested Phases**: ${research.taskGuidance.suggestedPhases}`);
    sections.push(`- **Tasks per Phase**: ${research.taskGuidance.tasksPerPhase.min}-${research.taskGuidance.tasksPerPhase.max}`);
    sections.push(`- **Critical Path**: ${research.taskGuidance.criticalPath.join(' → ')}`);
    sections.push(`- **Reasoning**: ${research.taskGuidance.reasoning}`);
  }

  // General context
  if (research.generalContext) {
    sections.push('\n## Best Practices Research\n');
    sections.push(research.generalContext);
  }

  return sections.join('\n');
}
