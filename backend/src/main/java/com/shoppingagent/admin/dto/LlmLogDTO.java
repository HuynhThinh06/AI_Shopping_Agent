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
public class LlmLogDTO {
    private Long id;
    private String requestType;
    private String promptText;
    private String responseText;
    private String status;
    private Short retryCount;
    private Integer latencyMs;
    private Integer tokensUsed;
    private LocalDateTime createdAt;
}
