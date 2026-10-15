package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
