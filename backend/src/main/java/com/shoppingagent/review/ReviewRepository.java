package com.shoppingagent.review;

import com.shoppingagent.shared.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /**
     * [CŨ] Lấy review hợp lệ (active + not spam) để đưa vào LLM tóm tắt.
     * Giới hạn 50 review mới nhất để tránh vượt token limit của Gemini.
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

    // ── [MỚI] 3 query bổ sung ────────────────────────────────────────────────

    /**
     * [B3.1] Lấy review theo productId có phân trang — dùng cho API GET /reviews.
     * Thứ tự sắp xếp do Pageable từ Controller quyết định (mặc định: createdAt DESC).
     */
    Page<Review> findByProductIdAndIsActiveTrue(Long productId, Pageable pageable);

    /**
     * [B3.2] Đếm số review đang active của sản phẩm.
     * ReviewService gọi sau mỗi lần tạo review để cập nhật product.reviewCount.
     * SummarizerService dùng reviewCount để biết cache có hết hạn chưa.
     */
    long countByProductIdAndIsActiveTrue(Long productId);

    /**
     * [B3.3] Tính điểm đánh giá trung bình — chỉ tính review active + không spam.
     * Trả về null nếu chưa có review nào (ReviewService sẽ xử lý trường hợp này).
     */
    @Query("""
            SELECT AVG(CAST(r.rating AS double))
            FROM Review r
            WHERE r.product.id = :productId
              AND r.isActive = TRUE
              AND r.isSpam = FALSE
            """)
    Double calculateAvgRating(@Param("productId") Long productId);
}
