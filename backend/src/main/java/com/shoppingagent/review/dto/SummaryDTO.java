package com.shoppingagent.review.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/** Cache tóm tắt review do LLM sinh ra */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SummaryDTO {
    private String summaryText;
    private String pros;
    private String cons;
    private String llmModelUsed;
    private LocalDateTime generatedAt;
    /** TRUE nếu kết quả lấy từ cache, FALSE nếu vừa gọi LLM */
    private boolean cached;
}
