// Re-export shared AI types from template for backward compatibility
export type {
  AIModelCostEstimate,
  AIModelBaseResponse,
  Usage,
  AIModelResponse,
  AIModelAdapterResponse,
} from '../../../server/ai/types';

// Chat API specific types
export type ChatRequest = {
  modelId: string;
  text: string;
};

export type ChatResponse = {
  result: string;
  cost: {
    totalCost: number;
  };
  error?: string;
};
