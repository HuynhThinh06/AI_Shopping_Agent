package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemStatsDTO {
    private long totalProducts;
    private long totalReviews;
    private long totalQueries;
    private long totalLlmCalls;
    private long successLlmCalls;
    private long failedLlmCalls;
    private double avgLatencyMs;
    private long totalTokensUsed;
    private double estimatedCostUsd;

    // Fields for backward compatibility with Admin Dashboard
    private long laptopProducts;
    private long phoneProducts;
    private long activeReviews;
    private long spamReviews;
    private long totalSearches;
    private long totalTokens;
    private List<AdminRecentQueryDTO> recentQueries;
}
