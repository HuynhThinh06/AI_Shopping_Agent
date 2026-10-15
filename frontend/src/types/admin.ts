export interface SystemStatsDTO {
  totalProducts: number;
  totalReviews: number;
  totalQueries: number;
  totalLlmCalls: number;
  successLlmCalls: number;
  failedLlmCalls: number;
  avgLatencyMs: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
}

export interface LlmLogItem {
  id: number;
  queryId?: number | null;
  requestType: string;
  status: string;
  retryCount: number;
  latencyMs: number;
  tokensUsed: number;
  promptExcerpt: string;
  responseExcerpt: string;
  createdAt: string;
}

export interface GinBenchmarkRequest {
  categoryCode?: string;
  specKey?: string;
  specValue?: string;
  iterations?: number;
}

export interface GinBenchmarkResult {
  categoryCode: string;
  specKey: string;
  specValue: string;
  iterations: number;
  seqScanAvgLatencyMs: number;
  ginIndexAvgLatencyMs: number;
  speedupRatio: number;
  speedupPercent: number;
  matchedCount: number;
  seqScanExecutionPlan: string;
  ginIndexExecutionPlan: string;
  seqScanSamples: number[];
  ginIndexSamples: number[];
}
