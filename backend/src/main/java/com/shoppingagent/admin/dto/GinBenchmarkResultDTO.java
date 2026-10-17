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
public class GinBenchmarkResultDTO {
    private String categoryCode;
    private String specKey;
    private String specValue;
    private int iterations;
    private double seqScanAvgLatencyMs;
    private double ginIndexAvgLatencyMs;
    private double speedupRatio;
    private double speedupPercent;
    private int matchedCount;
    private String seqScanExecutionPlan;
    private String ginIndexExecutionPlan;
    private List<Double> seqScanSamples;
    private List<Double> ginIndexSamples;
}
