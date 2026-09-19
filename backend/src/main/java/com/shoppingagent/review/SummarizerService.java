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

/**
 * Tóm tắt review sản phẩm bằng LLM với cơ chế cache.
 *
 * Luồng:
 * 1. Lấy sản phẩm từ DB
 * 2. Kiểm tra cache: nếu review_count không đổi → trả cache ngay
 * 3. Nếu cần tóm tắt lại:
 *    a. Lấy review valid (active + not spam)
 *    b. Lọc rác qua ReviewFilterService
 *    c. Gọi LlmClient.summarizeReviews()
 *    d. Lưu kết quả vào review_summaries
 * 4. Trả SummaryDTO
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

    @Value("${llm.gemini.model:gemini-2.0-flash}")
    private String llmModel;

    @Transactional
    public SummaryDTO getSummary(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        // ── Kiểm tra cache ────────────────────────────────────────────────────
        ReviewSummary cached = product.getReviewSummary();
        if (isCacheValid(cached, product)) {
            log.info("[Summarizer] Cache hit for product {}", productId);
            return toDTO(cached, true);
        }

        // ── Lấy review và lọc rác ─────────────────────────────────────────────
        List<Review> validReviews = reviewRepository.findValidReviews(productId);
        if (validReviews.isEmpty()) {
            log.warn("[Summarizer] No valid reviews for product {}", productId);
            return emptyDTO();
        }

        List<String> filteredContents = reviewFilterService.filter(validReviews);
        if (filteredContents.isEmpty()) {
            log.warn("[Summarizer] All reviews filtered out for product {}", productId);
            return emptyDTO();
        }

        // ── Gọi LLM ──────────────────────────────────────────────────────────
        log.info("[Summarizer] Calling LLM for product {} ({} reviews)", productId, filteredContents.size());
        SummaryDTO result = llmClient.summarizeReviews(product.getName(), filteredContents);

        // ── Lưu cache ─────────────────────────────────────────────────────────
        ReviewSummary summary = (cached != null) ? cached : new ReviewSummary();
        summary.setProduct(product);
        summary.setSummaryText(result.getSummaryText());
        summary.setPros(result.getPros());
        summary.setCons(result.getCons());
        summary.setLlmModelUsed(llmModel);
        summary.setReviewCountAtGenerate(product.getReviewCount());
        summary.setGeneratedAt(LocalDateTime.now());
        reviewSummaryRepository.save(summary);

        result.setLlmModelUsed(llmModel);
        result.setGeneratedAt(summary.getGeneratedAt());
        result.setCached(false);
        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean isCacheValid(ReviewSummary cached, Product product) {
        if (cached == null || cached.getSummaryText() == null) return false;
        return cached.getReviewCountAtGenerate() != null
                && cached.getReviewCountAtGenerate().equals(product.getReviewCount());
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
