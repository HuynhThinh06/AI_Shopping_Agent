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
public class DashboardTrendsDTO {
    private int days;
    private String from;
    private String to;
    private List<TrendPointDTO> series;
    private Map<String, Long> totals;
    private Map<String, Long> previousTotals;
}
