/**
 * Types for AI usage monitoring
 */

import { Usage } from '../ai/types';

export interface AIUsageRecord {
  id: string;
  timestamp: string;
  modelId: string;
  provider: string;
  usage: Usage;
  cost: number;
  endpoint: string;
}

export interface AIUsageSummary {
  totalCost: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  usageByModel: Record<string, {
    totalCost: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    count: number;
  }>;
  usageByDay: Record<string, {
    totalCost: number;
    totalTokens: number;
    count: number;
  }>;
}

export interface AIUsageMonitoringOptions {
  maxRecords?: number;
}

/** One aggregated row (by model, provider, or endpoint). */
export interface AIUsageGroupRow {
  key: string;
  totalCost: number;
  totalTokens: number;
  count: number;
}

/** One day's roll-up, keyed by 'YYYY-MM-DD'. */
export interface AIUsageDayRow {
  date: string;
  totalCost: number;
  totalTokens: number;
  count: number;
}

/** Console-ready breakdown computed in a single pass over the records. */
export interface AIUsageBreakdown {
  totalCost: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  recordCount: number;
  /** True when the S3 scan hit the `maxRecords` cap (totals are partial). */
  truncated: boolean;
  byModel: AIUsageGroupRow[];
  byProvider: AIUsageGroupRow[];
  byEndpoint: AIUsageGroupRow[];
  byDay: AIUsageDayRow[];
}
