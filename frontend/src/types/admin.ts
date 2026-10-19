export interface AdminRecentQueryDTO {
  id: number;
  queryText: string;
  category: string;
  criteriaSummary: string;
  topRecommendation: string;
  latencyMs: number;
  status: string;
  createdAt: string;
}

export interface SystemStatsDTO {
  totalProducts: number;
  laptopProducts?: number;
  phoneProducts?: number;
  totalReviews: number;
  activeReviews?: number;
  spamReviews?: number;
  totalQueries: number;
  totalSearches?: number;
  totalLlmCalls: number;
  successLlmCalls: number;
  failedLlmCalls: number;
  avgLatencyMs: number;
  totalTokensUsed: number;
  totalTokens?: number;
  estimatedCostUsd: number;
  recentQueries?: AdminRecentQueryDTO[];
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
  promptText?: string;
  responseText?: string;
  createdAt: string;
}

export interface AdminReviewDTO {
  id: number;
  productId: number;
  productName: string;
  reviewerName: string;
  rating: number;
  content: string;
  isSpam: boolean;
  isActive: boolean;
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

export interface AdminUserDTO {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CategoryOption {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}
