package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendPointDTO {
    private String date;
    private long searches;
    private long llmCalls;
    private long llmFailed;
    private int avgLatencyMs;
    private long tokens;
    private long newReviews;
    private long newUsers;
}
