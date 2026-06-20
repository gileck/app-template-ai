/**
 * AI Usage Monitoring Module
 * 
 * Tracks and stores AI model usage data for monitoring and cost analysis
 * Uses S3 for persistent storage of usage records
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AIUsageRecord,
  AIUsageSummary,
  AIUsageMonitoringOptions,
  AIUsageBreakdown,
  AIUsageGroupRow,
} from './types';
import { Usage } from '../ai/types';
import { uploadFile, getFileAsString, listFiles } from '../s3/sdk';
import { AIModelDefinition } from '../ai/models';

// Constants
const AI_USAGE_PREFIX = 'ai-usage/';
const DEFAULT_OPTIONS: AIUsageMonitoringOptions = {
  maxRecords: 10000,
};

/**
 * Add a new AI usage record
 * @param modelId The AI model ID
 * @param modelDefinition The AI model definition
 * @param usage Token usage information
 * @param cost Total cost of the operation
 * @param endpoint API endpoint that triggered the AI call
 * @returns The created usage record
 */
export const addAIUsageRecord = async (
  modelId: string,
  modelDefinition: AIModelDefinition,
  usage: Usage,
  cost: number,
  endpoint: string = 'unknown'
): Promise<AIUsageRecord> => {
  try {
    const record: AIUsageRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      modelId,
      provider: modelDefinition.provider,
      usage,
      cost,
      endpoint
    };

    const fileName = `${AI_USAGE_PREFIX}${record.id}.json`;
    await uploadFile({
      content: JSON.stringify(record, null, 2),
      fileName,
      contentType: 'application/json'
    });

    console.log(`AI usage record saved: ${record.id}`);
    return record;
  } catch (error) {
    console.error('Error saving AI usage record:', error);
    throw error;
  }
};

/**
 * Get a specific AI usage record by ID
 * @param recordId The record ID to retrieve
 * @returns The usage record or null if not found
 */
export const getAIUsageRecord = async (recordId: string): Promise<AIUsageRecord | null> => {
  try {
    const fileName = `${AI_USAGE_PREFIX}${recordId}.json`;
    const content = await getFileAsString(fileName);
    return JSON.parse(content) as AIUsageRecord;
  } catch (error) {
    console.error(`Error retrieving AI usage record ${recordId}:`, error);
    return null;
  }
};

/**
 * Get all AI usage records
 * @param options Optional configuration
 * @returns Array of usage records
 */
/**
 * Internal: list + fetch usage records, also reporting how many files
 * the prefix held in total. `totalFiles > maxRecords` is the accurate
 * "scan was capped" signal — distinct from how many records actually
 * parsed (some fetches may fail).
 */
const listUsageRecords = async (
  maxRecords: number
): Promise<{ records: AIUsageRecord[]; totalFiles: number }> => {
  const files = await listFiles(AI_USAGE_PREFIX);

  // Sort files by last modified date (newest first)
  const sortedFiles = files.sort((a, b) =>
    b.lastModified.getTime() - a.lastModified.getTime()
  );

  // Limit the number of records to retrieve
  const limitedFiles = sortedFiles.slice(0, maxRecords);

  // Retrieve and parse each file
  const records: AIUsageRecord[] = [];
  for (const file of limitedFiles) {
    try {
      // Extract the record ID from the file key
      const recordId = file.key.replace(AI_USAGE_PREFIX, '').replace('.json', '');
      const record = await getAIUsageRecord(recordId);
      if (record) {
        records.push(record);
      }
    } catch (error) {
      console.error(`Error retrieving record from file ${file.key}:`, error);
    }
  }

  return { records, totalFiles: files.length };
};

export const getAllAIUsageRecords = async (
  options: AIUsageMonitoringOptions = DEFAULT_OPTIONS
): Promise<AIUsageRecord[]> => {
  try {
    const maxRecords = options.maxRecords ?? DEFAULT_OPTIONS.maxRecords ?? 10000;
    const { records } = await listUsageRecords(maxRecords);
    return records;
  } catch (error) {
    console.error('Error retrieving AI usage records:', error);
    return [];
  }
};

/**
 * Get a summary of AI usage statistics
 * @returns Summary of usage statistics
 */
export const getAIUsageSummary = async (): Promise<AIUsageSummary> => {
  const records = await getAllAIUsageRecords();
  
  const summary: AIUsageSummary = {
    totalCost: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    usageByModel: {},
    usageByDay: {}
  };
  
  records.forEach(record => {
    // Update total stats
    summary.totalCost += record.cost;
    summary.totalTokens += record.usage.totalTokens;
    summary.totalPromptTokens += record.usage.promptTokens;
    summary.totalCompletionTokens += record.usage.completionTokens;

    // Update per-model stats
    if (!summary.usageByModel[record.modelId]) {
      summary.usageByModel[record.modelId] = {
        totalCost: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        count: 0
      };
    }
    summary.usageByModel[record.modelId].totalCost += record.cost;
    summary.usageByModel[record.modelId].totalTokens += record.usage.totalTokens;
    summary.usageByModel[record.modelId].totalPromptTokens += record.usage.promptTokens;
    summary.usageByModel[record.modelId].totalCompletionTokens += record.usage.completionTokens;
    summary.usageByModel[record.modelId].count += 1;

    // Update per-day stats
    const day = record.timestamp.split('T')[0]; // Extract YYYY-MM-DD
    if (!summary.usageByDay[day]) {
      summary.usageByDay[day] = {
        totalCost: 0,
        totalTokens: 0,
        count: 0
      };
    }
    summary.usageByDay[day].totalCost += record.cost;
    summary.usageByDay[day].totalTokens += record.usage.totalTokens;
    summary.usageByDay[day].count += 1;
  });

  return summary;
};

/**
 * Console-ready breakdown of AI usage by model, provider, endpoint and
 * day in a single pass. Powers the admin AI Cost & Token console.
 *
 * NOTE: `getAllAIUsageRecords` reads one S3 object per record (N+1), so
 * `maxRecords` bounds both cost and latency. `truncated` is set when the
 * cap is hit so the UI can warn that totals are partial.
 */
export const getAIUsageBreakdown = async (
  options: AIUsageMonitoringOptions = DEFAULT_OPTIONS
): Promise<AIUsageBreakdown> => {
  const maxRecords = options.maxRecords ?? DEFAULT_OPTIONS.maxRecords ?? 10000;
  const { records, totalFiles } = await listUsageRecords(maxRecords);

  const byModel = new Map<string, AIUsageGroupRow>();
  const byProvider = new Map<string, AIUsageGroupRow>();
  const byEndpoint = new Map<string, AIUsageGroupRow>();
  const byDay = new Map<string, { totalCost: number; totalTokens: number; count: number }>();

  const bump = (map: Map<string, AIUsageGroupRow>, key: string, cost: number, tokens: number) => {
    const row = map.get(key) ?? { key, totalCost: 0, totalTokens: 0, count: 0 };
    row.totalCost += cost;
    row.totalTokens += tokens;
    row.count += 1;
    map.set(key, row);
  };

  const breakdown: AIUsageBreakdown = {
    totalCost: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    recordCount: records.length,
    // True signal that the scan was capped: more files existed than we
    // fetched. Basing this on parsed-record count would under-report when
    // some capped records fail to parse.
    truncated: totalFiles > maxRecords,
    byModel: [],
    byProvider: [],
    byEndpoint: [],
    byDay: [],
  };

  for (const record of records) {
    // Nullish guards: a malformed/legacy S3 blob missing usage or cost
    // must not poison every running total with NaN.
    const tokens = record.usage?.totalTokens ?? 0;
    const cost = record.cost ?? 0;
    breakdown.totalCost += cost;
    breakdown.totalTokens += tokens;
    breakdown.totalPromptTokens += record.usage?.promptTokens ?? 0;
    breakdown.totalCompletionTokens += record.usage?.completionTokens ?? 0;

    bump(byModel, record.modelId || 'unknown', cost, tokens);
    bump(byProvider, record.provider || 'unknown', cost, tokens);
    bump(byEndpoint, record.endpoint || 'unknown', cost, tokens);

    const day = (record.timestamp ?? '').split('T')[0] || 'unknown';
    const dayRow = byDay.get(day) ?? { totalCost: 0, totalTokens: 0, count: 0 };
    dayRow.totalCost += cost;
    dayRow.totalTokens += tokens;
    dayRow.count += 1;
    byDay.set(day, dayRow);
  }

  const sortByCost = (rows: AIUsageGroupRow[]) =>
    rows.sort((a, b) => b.totalCost - a.totalCost);

  breakdown.byModel = sortByCost([...byModel.values()]);
  breakdown.byProvider = sortByCost([...byProvider.values()]);
  breakdown.byEndpoint = sortByCost([...byEndpoint.values()]);
  breakdown.byDay = [...byDay.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return breakdown;
};
