package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_summaries")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReviewSummary {

    /**
     * product_id vừa là PK vừa là FK → products.id
     * Quan hệ 1-1 optional (product có thể chưa có summary)
     */
    @Id
    @Column(name = "product_id")
    private Long productId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    /** Tóm tắt ưu điểm do LLM tổng hợp */
    @Column(columnDefinition = "TEXT")
    private String pros;

    /** Tóm tắt nhược điểm do LLM tổng hợp */
    @Column(columnDefinition = "TEXT")
    private String cons;

    @Column(name = "llm_model_used", length = 100)
    private String llmModelUsed;

    /**
     * Số lượng review tại thời điểm LLM tóm tắt.
     * So với products.review_count để quyết định có cần tạo lại không.
     */
    @Column(name = "review_count_at_generate")
    private Integer reviewCountAtGenerate;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;
}
