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
public class LlmLogResponseDTO {
    private Long id;
    private Long queryId;
    private String requestType;
    private String status;
    private Short retryCount;
    private Integer latencyMs;
    private Integer tokensUsed;
    private String promptExcerpt;
    private String responseExcerpt;
    private String promptText;
    private String responseText;
    private LocalDateTime createdAt;
}
