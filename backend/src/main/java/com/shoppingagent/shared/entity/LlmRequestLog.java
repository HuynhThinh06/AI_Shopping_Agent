package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "llm_request_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LlmRequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "query_id")
    private SearchQuery searchQuery;

    /** extract_query / summarize_review */
    @Column(name = "request_type", nullable = false, length = 50)
    private String requestType;

    @Column(name = "prompt_text", columnDefinition = "TEXT")
    private String promptText;

    @Column(name = "response_text", columnDefinition = "TEXT")
    private String responseText;

    /** success / failed / retried */
    @Column(nullable = false, length = 20)
    private String status;

    @Builder.Default
    @Column(name = "retry_count")
    private Short retryCount = 0;

    /** Thời gian gọi LLM tính bằng mili-giây */
    @Column(name = "latency_ms")
    private Integer latencyMs;

    /** Tổng số token tiêu thụ (Gemini usageMetadata) */
    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
