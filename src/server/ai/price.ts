type PricePer128K = { up_to_128k_tokens: number; over_128k_tokens: number }
type PricingModel = {
  model_name: string;
  model_id: string;
  input_cost_per_1k_tokens: number | PricePer128K;
  output_cost_per_1k_tokens: number | PricePer128K;
}

export const pricing: PricingModel[] = [
  // OpenAI Models (verified)
  {
    "model_name": "GPT-5",
    "model_id": "gpt-5",
    "input_cost_per_1k_tokens": 0.00125,  // $1.250 per 1M tokens
    "output_cost_per_1k_tokens": 0.01     // $10.00 per 1M tokens
  },
  {
    "model_name": "GPT-5 mini",
    "model_id": "gpt-5-mini",
    "input_cost_per_1k_tokens": 0.00025,  // $0.250 per 1M tokens
    "output_cost_per_1k_tokens": 0.002    // $2.000 per 1M tokens
  },
  {
    "model_name": "GPT-5 nano",
    "model_id": "gpt-5-nano",
    "input_cost_per_1k_tokens": 0.00005,  // $0.050 per 1M tokens
    "output_cost_per_1k_tokens": 0.0004   // $0.400 per 1M tokens
  },
  {
    "model_name": "GPT-5 pro",
    "model_id": "gpt-5-pro",
    "input_cost_per_1k_tokens": 0.015,    // $15.00 per 1M tokens
    "output_cost_per_1k_tokens": 0.12     // $120.00 per 1M tokens
  },
  {
    "model_name": "GPT-4o",
    "model_id": "gpt-4o",
    "input_cost_per_1k_tokens": 0.0025,  // $2.50 per 1M tokens
    "output_cost_per_1k_tokens": 0.01     // $10 per 1M tokens
  },
  {
    "model_name": "GPT-4o Mini",
    "model_id": "gpt-4o-mini",
    "input_cost_per_1k_tokens": 0.00015,  // $0.15 per 1M tokens
    "output_cost_per_1k_tokens": 0.0006   // $0.60 per 1M tokens
  },
  // Anthropic Models (verified)
  {
    "model_name": "Claude 3.5 Sonnet",
    "model_id": "claude-3-5-sonnet-20240620",
    "input_cost_per_1k_tokens": 0.003,   // $3 per 1M tokens
    "output_cost_per_1k_tokens": 0.015   // $15 per 1M tokens
  },
  // Google Gemini Models (officially verified Oct 2025)
  {
    "model_name": "Gemini 2.5 Flash",
    "model_id": "gemini-2.5-flash",
    "input_cost_per_1k_tokens": 0.0003,  // $0.30 per 1M tokens
    "output_cost_per_1k_tokens": 0.0025  // $2.50 per 1M tokens
  },
]


export const getPricePer1K = (modelId: string, tokens: number): {
  inputCost: number;
  outputCost: number;
} => {
  const model = pricing.find(model => model.model_id === modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  if (typeof model.input_cost_per_1k_tokens === 'number') {
    return {
      inputCost: model.input_cost_per_1k_tokens,
      outputCost: model.output_cost_per_1k_tokens as number
    }
  } else {
    if (tokens <= 128000) {
      return {
        inputCost: (model.input_cost_per_1k_tokens as PricePer128K).up_to_128k_tokens,
        outputCost: (model.output_cost_per_1k_tokens as PricePer128K).up_to_128k_tokens
      }
    } else {
      return {
        inputCost: (model.input_cost_per_1k_tokens as PricePer128K).over_128k_tokens,
        outputCost: (model.output_cost_per_1k_tokens as PricePer128K).over_128k_tokens
      }
    }
  }




}