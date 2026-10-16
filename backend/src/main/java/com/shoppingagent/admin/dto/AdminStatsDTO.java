package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsDTO {
    private long totalProducts;
    private long laptopProducts;
    private long phoneProducts;
    private long totalReviews;
    private long activeReviews;
    private long spamReviews;
    private long totalSearches;
    private int avgLatencyMs;
    private long totalTokens;
    private double estimatedCostUsd;
    private List<AdminRecentQueryDTO> recentQueries;
}
