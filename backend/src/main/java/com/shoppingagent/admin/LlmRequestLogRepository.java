package com.shoppingagent.admin;

import com.shoppingagent.shared.entity.LlmRequestLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LlmRequestLogRepository extends JpaRepository<LlmRequestLog, Long> {

    Page<LlmRequestLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT l FROM LlmRequestLog l WHERE LOWER(l.requestType) = LOWER(:requestType) ORDER BY l.createdAt DESC")
    Page<LlmRequestLog> findByRequestType(@Param("requestType") String requestType, Pageable pageable);

    @Query("SELECT l FROM LlmRequestLog l WHERE LOWER(l.status) = LOWER(:status) ORDER BY l.createdAt DESC")
    Page<LlmRequestLog> findByStatus(@Param("status") String status, Pageable pageable);

    @Query("SELECT AVG(l.latencyMs) FROM LlmRequestLog l WHERE l.latencyMs IS NOT NULL")
    Double findAverageLatency();

    @Query("SELECT SUM(l.tokensUsed) FROM LlmRequestLog l WHERE l.tokensUsed IS NOT NULL")
    Long findTotalTokensUsed();
}
