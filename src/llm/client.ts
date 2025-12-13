import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { UserConfig } from '../types.js';

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

export async function generateWithClaude(
  config: UserConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<string> {
  const client = getAnthropicClient(config);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
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
  query: string
): Promise<string> {
  const client = getPerplexityClient(config);

  const response = await client.chat.completions.create({
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: 'You are a technical research assistant helping to plan software projects. Provide concise, actionable information about best practices, common patterns, and recommended approaches. Focus on practical implementation details.',
      },
      {
        role: 'user',
        content: query,
      },
    ],
  });

  return response.choices[0]?.message?.content || 'No response';
}

export async function researchPRDContext(
  config: UserConfig,
  prdContent: string
): Promise<string> {
  // Extract key topics from the PRD to research - let Claude decide how many based on complexity
  const extractionPrompt = `Analyze this PRD and identify the key technical topics that would benefit from research to help create better implementation tasks.

Consider the PRD's complexity when deciding how many topics to research:
- Simple projects (single feature, familiar tech): 1-2 topics
- Medium projects (multiple features, some new tech): 3-4 topics
- Complex projects (many features, unfamiliar domains, integrations): 5-7 topics

Focus on topics where current best practices, patterns, or gotchas would meaningfully improve task quality. Don't research basic/obvious things.

PRD Content:
${prdContent.substring(0, 6000)}

Return a JSON object with your reasoning and topics:
{
  "complexity": "simple|medium|complex",
  "reasoning": "Brief explanation of why you chose this complexity level",
  "topics": ["research query 1", "research query 2", ...]
}

Only return the JSON object, nothing else.`;

  const topicsResponse = await generateWithClaude(
    config,
    'You analyze PRDs to identify technical topics worth researching. Be selective - only include topics where research would genuinely improve implementation guidance.',
    extractionPrompt,
    800
  );

  let topics: string[];
  try {
    const parsed = JSON.parse(topicsResponse.trim());
    topics = parsed.topics || [];
  } catch {
    // Fallback if parsing fails
    topics = ['software development best practices for the described project'];
  }

  // Research each topic with Perplexity
  const researchResults: string[] = [];

  for (const topic of topics) {
    try {
      const result = await researchWithPerplexity(config, topic);
      researchResults.push(`## Research: ${topic}\n\n${result}`);
    } catch (error) {
      // Continue if one research query fails
      console.warn(`Research failed for topic: ${topic}`);
    }
  }

  return researchResults.join('\n\n---\n\n');
}
