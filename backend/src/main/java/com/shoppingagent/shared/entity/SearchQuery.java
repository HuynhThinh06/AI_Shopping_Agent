package com.shoppingagent.shared.entity;

import com.shoppingagent.shared.config.JsonbConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "search_queries")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SearchQuery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** NULL nếu khách vãng lai chưa đăng nhập */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /** Định danh phiên cho khách chưa đăng nhập */
    @Column(name = "session_id", length = 100)
    private String sessionId;

    @Column(name = "query_text", nullable = false, columnDefinition = "TEXT")
    private String queryText;

    /** Ngành hàng LLM tự phân loại từ câu truy vấn */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_detected_id")
    private Category categoryDetected;

    /** Ràng buộc LLM trích xuất dạng JSONB, vd: {"budget":20000000,"ram":16} */
    @Convert(converter = JsonbConverter.class)
    @Column(name = "extracted_criteria", columnDefinition = "jsonb")
    private Map<String, Object> extractedCriteria;

    /** TRUE nếu thuộc bộ 30–50 câu kiểm thử Ground Truth */
    @Builder.Default
    @Column(name = "is_test_query")
    private Boolean isTestQuery = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
