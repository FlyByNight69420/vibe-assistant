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
        content: 'You are a technical research assistant. Provide concise, accurate information with specific recommendations when applicable. Focus on current best practices and real-world solutions.',
      },
      {
        role: 'user',
        content: query,
      },
    ],
  });

  return response.choices[0]?.message?.content || 'No response';
}

export async function research(
  config: UserConfig,
  query: string
): Promise<{ response: string; provider: 'perplexity' | 'claude' }> {
  if (config.researchProvider === 'perplexity' && config.perplexityApiKey) {
    return {
      response: await researchWithPerplexity(config, query),
      provider: 'perplexity',
    };
  }

  // Fall back to Claude
  const response = await generateWithClaude(
    config,
    'You are a technical research assistant. Provide concise, accurate information with specific recommendations when applicable.',
    query
  );

  return { response, provider: 'claude' };
}
