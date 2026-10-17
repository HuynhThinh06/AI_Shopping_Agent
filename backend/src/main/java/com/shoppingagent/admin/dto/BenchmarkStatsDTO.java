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
public class BenchmarkStatsDTO {
    private double precisionAt3;
    private double precisionAt5;
    private double meanAveragePrecision;
    private double ndcgAt5;
    private int ginAvgLatencyMs;
    private int ilikeAvgLatencyMs;
    private double speedupRatio;
    private List<Map<String, Object>> latencyBreakdown;
}
