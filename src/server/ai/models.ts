/**
 * Shared model definitions for AI providers
 * These types are used by both client and server code
 */

export interface AIModelDefinition {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | string;
  maxTokens: number;
  capabilities: string[];
}

// Gemini models (officially supported as of Oct 2025)
export const GEMINI_MODELS: AIModelDefinition[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    maxTokens: 1048576, // 1M input tokens
    capabilities: ['summarization', 'question-answering', 'content-generation', 'reasoning', 'multimodal', 'fast-responses', 'low-latency']
  }
];

// OpenAI models (supported)
export const OPENAI_MODELS: AIModelDefinition[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    maxTokens: 128000,
    capabilities: ['summarization', 'question-answering', 'content-generation', 'reasoning', 'multimodal']
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 mini',
    provider: 'openai',
    maxTokens: 128000,
    capabilities: ['summarization', 'question-answering', 'content-generation']
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 nano',
    provider: 'openai',
    maxTokens: 128000,
    capabilities: ['summarization', 'classification']
  },
  {
    id: 'gpt-5-pro',
    name: 'GPT-5 pro',
    provider: 'openai',
    maxTokens: 128000,
    capabilities: ['reasoning', 'analysis', 'multimodal', 'high-precision']
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 128000, // 128K context window
    capabilities: ['summarization', 'question-answering', 'content-generation', 'reasoning', 'multimodal']
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 128000, // 128K context window
    capabilities: ['summarization', 'question-answering', 'content-generation', 'reasoning']
  }
];

// Anthropic Claude models (supported)
export const ANTHROPIC_MODELS: AIModelDefinition[] = [
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000, // 200K context window
    capabilities: ['summarization', 'question-answering', 'content-generation', 'reasoning', 'coding', 'analysis']
  },
];

// Helper function to get all available models
export function getAllModels(): AIModelDefinition[] {
  return [...GEMINI_MODELS, ...OPENAI_MODELS, ...ANTHROPIC_MODELS];
}

// Helper function to get models by provider
export function getModelsByProvider(provider: string): AIModelDefinition[] {
  return getAllModels().filter(model => model.provider === provider);
}

// Helper function to get a model by ID
export function getModelById(modelId: string): AIModelDefinition {
  const model = getAllModels().find(model => model.id === modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }
  return model;
}

export function isModelExists(modelId: string): boolean {
  return getAllModels().some(model => model.id === modelId);
}
