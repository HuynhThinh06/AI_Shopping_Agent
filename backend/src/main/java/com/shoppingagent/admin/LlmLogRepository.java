package com.shoppingagent.admin;

import com.shoppingagent.shared.entity.LlmRequestLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface LlmLogRepository extends JpaRepository<LlmRequestLog, Long> {

    Page<LlmRequestLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COUNT(l) FROM LlmRequestLog l")
    long countTotalRequests();

    @Query("SELECT COUNT(l) FROM LlmRequestLog l WHERE l.status IN ('success', 'retried')")
    long countSuccessRequests();

    @Query("SELECT COUNT(l) FROM LlmRequestLog l WHERE l.status = 'failed'")
    long countFailedRequests();

    @Query("SELECT COALESCE(AVG(l.latencyMs), 0.0) FROM LlmRequestLog l WHERE l.status IN ('success', 'retried')")
    Double getAvgLatencyMs();

    @Query("SELECT COALESCE(SUM(l.tokensUsed), 0L) FROM LlmRequestLog l")
    Long getTotalTokensUsed();

    @Query("SELECT l FROM LlmRequestLog l WHERE LOWER(l.requestType) LIKE LOWER(CONCAT('%', :requestType, '%')) ORDER BY l.createdAt DESC")
    Page<LlmRequestLog> findByRequestType(@org.springframework.data.repository.query.Param("requestType") String requestType, Pageable pageable);

    @Query("SELECT l FROM LlmRequestLog l WHERE LOWER(l.status) = LOWER(:status) ORDER BY l.createdAt DESC")
    Page<LlmRequestLog> findByStatus(@org.springframework.data.repository.query.Param("status") String status, Pageable pageable);
}
