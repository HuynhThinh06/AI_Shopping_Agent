package com.shoppingagent.review;

import com.shoppingagent.product.ProductNotFoundException;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.review.dto.ReviewCreateRequest;
import com.shoppingagent.review.dto.ReviewResponseDTO;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.Review;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Service xử lý nghiệp vụ Review.
 *
 * Hai chức năng chính:
 *  1. listReviews()  — lấy danh sách review có phân trang
 *  2. createReview() — thêm review mới + cập nhật thống kê sản phẩm
 *
 * Tại sao cần cập nhật product.reviewCount sau mỗi review mới?
 *  → SummarizerService so sánh product.reviewCount với review_summaries.review_count_at_generate.
 *  → Nếu reviewCount không tăng, cache không bao giờ hết hạn → LLM không được gọi lại.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Lấy danh sách review của sản phẩm, phân trang.
     * Chỉ lấy review active (is_active = TRUE).
     * Thứ tự sắp xếp do Pageable quyết định — Controller mặc định: createdAt DESC.
     */
    @Transactional(readOnly = true)
    public Page<ReviewResponseDTO> listReviews(Long productId, Pageable pageable) {
        return reviewRepository
                .findByProductIdAndIsActiveTrue(productId, pageable)
                .map(this::toDTO);
    }

    /**
     * Thêm review mới cho sản phẩm.
     * Sau khi lưu: tự động tính lại avg_rating và review_count cho sản phẩm.
     *
     * @param productId ID sản phẩm cần đánh giá
     * @param req       Nội dung review từ client (đã qua @Valid ở Controller)
     * @return ReviewResponseDTO của review vừa tạo
     * @throws ProductNotFoundException nếu productId không tồn tại trong DB
     */
    @Transactional
    public ReviewResponseDTO createReview(Long productId, ReviewCreateRequest req) {
        // Kiểm tra sản phẩm tồn tại
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        // Xây dựng entity Review
        Review review = Review.builder()
                .product(product)
                .reviewerName(req.getReviewerName() != null && !req.getReviewerName().isBlank()
                        ? req.getReviewerName().trim()
                        : "Khách hàng ẩn danh")
                .content(req.getContent().trim())
                .rating(req.getRating())
                .isSpam(false)    // spam detection sẽ được ReviewFilterService xử lý khi tóm tắt
                .isActive(true)
                .build();

        reviewRepository.save(review);
        log.info("[ReviewService] Review mới: productId={}, rating={}", productId, req.getRating());

        // ⚡ QUAN TRỌNG: Cập nhật thống kê sản phẩm
        // Nếu bỏ qua bước này → SummarizerService sẽ không biết có review mới
        // → Cache tóm tắt AI sẽ không bao giờ được làm mới!
        refreshProductStats(product);

        return toDTO(review);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Tính lại avg_rating và review_count từ DB, lưu vào bảng products.
     * Gọi sau mỗi thao tác thay đổi tập review (thêm mới, soft-delete, mark spam...).
     */
    private void refreshProductStats(Product product) {
        long count  = reviewRepository.countByProductIdAndIsActiveTrue(product.getId());
        Double avg  = reviewRepository.calculateAvgRating(product.getId());

        product.setReviewCount((int) count);

        if (avg != null) {
            // Làm tròn 2 chữ số thập phân theo quy tắc HALF_UP
            // VD: 4.333... → 4.33 | 4.666... → 4.67
            product.setAvgRating(BigDecimal.valueOf(avg)
                    .setScale(2, RoundingMode.HALF_UP));
        } else {
            // Chưa có review active nào → reset về null
            product.setAvgRating(null);
        }

        productRepository.save(product);
        log.debug("[ReviewService] Product {} stats refreshed → count={}, avgRating={}",
                product.getId(), count, product.getAvgRating());
    }

    /** Chuyển entity Review → ReviewResponseDTO trả về client */
    private ReviewResponseDTO toDTO(Review r) {
        return ReviewResponseDTO.builder()
                .id(r.getId())
                .productId(r.getProduct().getId())
                .reviewerName(r.getReviewerName())
                .content(r.getContent())
                .rating(r.getRating())
                .isSpam(r.getIsSpam())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
