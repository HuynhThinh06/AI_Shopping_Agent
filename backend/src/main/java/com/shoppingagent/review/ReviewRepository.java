package com.shoppingagent.review;

import com.shoppingagent.shared.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /**
     * Lấy review hợp lệ (active + not spam) để đưa vào LLM tóm tắt.
     * Giới hạn 50 review mới nhất để tránh vượt token limit.
     */
    @Query("""
            SELECT r FROM Review r
            WHERE r.product.id = :productId
              AND r.isActive = TRUE
              AND r.isSpam = FALSE
            ORDER BY r.createdAt DESC
            LIMIT 50
            """)
    List<Review> findValidReviews(@Param("productId") Long productId);
}
