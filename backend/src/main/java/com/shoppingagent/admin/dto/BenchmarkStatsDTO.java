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
    private int totalGroundTruthQueries;
    private double baselinePrecision;
    private double baselineRecall;
    private double baselineMacroF1;
    private double stage2Precision;
    private double stage2Recall;
    private double stage2MacroF1;
    private double stage3Precision;
    private double stage3Recall;
    private double stage3MacroF1;
    private double precisionGainPct;
    private double f1GainPct;
    private int scalingRowCount;
    private String scalingTestQuery;
    private double scalingSeqScanAvgMs;
    private double scalingGinIndexAvgMs;
    private double scalingSpeedupRatio;
    private double scalingLatencyReductionPct;
    private List<Map<String, Object>> latencyBreakdown;
}
