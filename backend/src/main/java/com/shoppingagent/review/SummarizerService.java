package com.shoppingagent.review;

import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.review.dto.SummaryDTO;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.Review;
import com.shoppingagent.shared.entity.ReviewSummary;
import com.shoppingagent.shared.llm.LlmClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Tóm tắt review sản phẩm bằng LLM với cơ chế cache.
 * Sử dụng reviewHash để kiểm tra xem danh sách review có thay đổi không.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SummarizerService {

    private final LlmClient llmClient;
    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewSummaryRepository reviewSummaryRepository;
    private final ReviewFilterService reviewFilterService;

    @Value("${llm.gemini.model:gemini-3.5-flash-lite}")
    private String llmModel;

    @Transactional
    public SummaryDTO getSummary(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        // 1. Lấy danh sách review hợp lệ
        List<Review> validReviews = reviewRepository.findValidReviews(productId);
        if (validReviews.isEmpty()) {
            log.warn("[Summarizer] No valid reviews for product {}", productId);
            return emptyDTO();
        }

        // 2. Tính toán hash hiện tại của tập review
        String currentHash = generateHash(validReviews);

        // 3. Kiểm tra cache
        ReviewSummary cached = product.getReviewSummary();
        if (isCacheValid(cached, currentHash)) {
            log.info("[Summarizer] Cache hit for product {}", productId);
            return toDTO(cached, true);
        }

        // 4. Lọc rác
        List<String> filteredContents = reviewFilterService.filter(validReviews);
        if (filteredContents.isEmpty()) {
            log.warn("[Summarizer] All reviews filtered out for product {}", productId);
            return emptyDTO();
        }

        // 5. Gọi LLM tóm tắt
        log.info("[Summarizer] Calling LLM for product {} ({} reviews)", productId, filteredContents.size());
        SummaryDTO result = llmClient.summarizeReviews(product.getName(), filteredContents);

        // 6. Lưu kết quả vào DB
        ReviewSummary summary = (cached != null) ? cached : new ReviewSummary();
        summary.setProduct(product);
        summary.setSummaryText(result.getSummaryText());
        summary.setPros(result.getPros());
        summary.setCons(result.getCons());
        summary.setLlmModelUsed(llmModel);
        summary.setReviewHash(currentHash);
        summary.setGeneratedAt(LocalDateTime.now());
        reviewSummaryRepository.save(summary);

        result.setLlmModelUsed(llmModel);
        result.setGeneratedAt(summary.getGeneratedAt());
        result.setCached(false);
        return result;
    }

    private String generateHash(List<Review> reviews) {
        // Hash đơn giản dựa trên số lượng và tổng ID của các bài review
        long count = reviews.size();
        long sumIds = reviews.stream().mapToLong(Review::getId).sum();
        return count + "-" + sumIds;
    }

    private boolean isCacheValid(ReviewSummary cached, String currentHash) {
        if (cached == null || cached.getSummaryText() == null) return false;
        return currentHash.equals(cached.getReviewHash());
    }

    private SummaryDTO toDTO(ReviewSummary summary, boolean isCached) {
        SummaryDTO dto = new SummaryDTO();
        dto.setSummaryText(summary.getSummaryText());
        dto.setPros(summary.getPros());
        dto.setCons(summary.getCons());
        dto.setLlmModelUsed(summary.getLlmModelUsed());
        dto.setGeneratedAt(summary.getGeneratedAt());
        dto.setCached(isCached);
        return dto;
    }

    private SummaryDTO emptyDTO() {
        SummaryDTO dto = new SummaryDTO();
        dto.setSummaryText("Chưa có đủ đánh giá để tóm tắt.");
        dto.setPros("");
        dto.setCons("");
        dto.setCached(false);
        return dto;
    }
}
