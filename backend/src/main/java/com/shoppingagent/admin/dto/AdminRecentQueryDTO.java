package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRecentQueryDTO {
    private Long id;
    private String queryText;
    private String category;
    private String criteriaSummary;
    private String topRecommendation;
    private Integer latencyMs;
    private String status;
    private LocalDateTime createdAt;
}
