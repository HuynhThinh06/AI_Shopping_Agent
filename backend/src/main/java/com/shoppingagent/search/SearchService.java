package com.shoppingagent.search;

import com.shoppingagent.admin.UserRepository;
import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.product.ProductSpecRepository;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.search.dto.SearchRequest;
import com.shoppingagent.search.dto.SearchResponse;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.SearchQuery;
import com.shoppingagent.shared.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Orchestrator cho luồng tìm kiếm end-to-end:
 *
 *   queryText → [QueryParser] → ExtractedCriteria
 *             → [ProductRepo / ProductSpecRepo (GIN Index)] → List<Product> ứng viên
 *             → [Ranker]      → List<RankedProduct>
 *             → Lưu SearchQuery + SearchResult vào DB
 *             → SearchResponse
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private final QueryParserService queryParserService;
    private final RankingService rankingService;
    private final LLMRerankingService llmRerankingService;
    private final ProductRepository productRepository;
    private final ProductSpecRepository productSpecRepository;
    private final CategoryRepository categoryRepository;
    private final SearchQueryRepository searchQueryRepository;
    private final SearchResultRepository searchResultRepository;
    private final UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.shoppingagent.shared.llm.GeminiClient geminiClient;

    public SearchResponse search(SearchRequest request, Long userId) {
        log.info("[Search] New query: '{}' userId={}", request.getQueryText(), userId);
        if (geminiClient != null) {
            geminiClient.clearPendingLogs();
        }

        // ── Bước 1: Xác định ngành hàng ──────────────────────────────────────
        String categoryCode = detectCategory(request.getQueryText());

        // ── Bước 2: LLM trích xuất ràng buộc ──────────────────────────────────
        ExtractedCriteria criteria = queryParserService.parse(request.getQueryText(), categoryCode);

        // ── Bước 3: Lấy sản phẩm ứng viên từ DB ──────────────────────────────
        List<Product> candidates;
        if (criteria.getRequiredSpecs() != null && !criteria.getRequiredSpecs().isEmpty()) {
            // Có specs → dùng native SQL với GIN index để lọc tại DB level
            candidates = productSpecRepository.findCandidatesWithSpecs(
                    categoryCode,
                    criteria.getBudgetMin(),
                    criteria.getBudgetMax(),
                    criteria.getRequiredSpecs()
            );
            log.debug("[Search] Found {} candidates (GIN-filtered by specs: {})",
                    candidates.size(), criteria.getRequiredSpecs().keySet());

            // Fallback Relaxation: Nếu lọc cứng đồng thời cả specs lẫn budget ra 0 kết quả (Over-constrained query),
            // nới lỏng điều kiện lọc specs tại tầng DB và nới ngân sách tối đa 40% để tìm sản phẩm tiệm cận nhất.
            if (candidates.isEmpty()) {
                log.info("[Search] 0 candidates with strict specs filter. Falling back to relaxed budget candidates...");
                Long relaxedMax = criteria.getBudgetMax() != null ? (long) (criteria.getBudgetMax() * 1.40) : null;
                candidates = productRepository.findCandidates(
                        categoryCode,
                        criteria.getBudgetMin(),
                        relaxedMax
                );
            }
        } else {
            // Không có specs → query cơ bản (chỉ lọc category + price)
            candidates = productRepository.findCandidates(
                    categoryCode,
                    criteria.getBudgetMin(),
                    criteria.getBudgetMax()
            );
            log.debug("[Search] Found {} candidates (no spec filter)", candidates.size());
        }

        // Nếu vẫn không có ứng viên nào (ngân sách quá thấp), fallback lấy toàn bộ sản phẩm cùng ngành hàng
        if (candidates.isEmpty()) {
            log.info("[Search] Still 0 candidates. Falling back to all products in category: {}", categoryCode);
            candidates = productRepository.findCandidates(categoryCode, null, null);
        }

        // ── Bước 4: Lấy trọng số xếp hạng từ DB ──────────────────────────────
        Map<String, Double> weights = categoryRepository.findWeightsByCategoryCode(categoryCode.toLowerCase());

        // ── Bước 5: Xếp hạng DSS MCDM ─────────────────────────────────────────
        List<RankedProduct> ranked = rankingService.rank(
                candidates, criteria, weights, request.getTopK());

        // LLM Reranking (Phase 2): Chỉ kích hoạt khi câu truy vấn có điều kiện loại trừ hoặc so sánh phức tạp
        if (shouldRerankWithLLM(request.getQueryText()) && ranked.size() > 1) {
            try {
                ranked = llmRerankingService.rerank(request.getQueryText(), ranked, request.getTopK());
            } catch (Exception e) {
                log.warn("[Search] LLM Reranking failed, using DSS ranking: {}", e.getMessage());
            }
        }

        // ── Bước 6: Lưu SearchQuery + SearchResult vào DB ─────────────────────
        SearchQuery savedQuery = persistSearchQueryAndResults(request, userId, criteria, categoryCode, ranked);

        return SearchResponse.builder()
                .queryId(savedQuery.getId())
                .extractedCriteria(criteria)
                .results(ranked)
                .totalMatched(candidates.size())
                .build();
    }

    public SearchQuery persistSearchQueryAndResults(SearchRequest request, Long userId,
                                                    ExtractedCriteria criteria, String categoryCode,
                                                    List<RankedProduct> ranked) {
        SearchQuery savedQuery = saveSearchQuery(request, userId, criteria, categoryCode);
        if (geminiClient != null) {
            geminiClient.bindLogsToSearchQuery(savedQuery);
        }
        searchResultRepository.saveAll(ranked, savedQuery.getId());
        return savedQuery;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean shouldRerankWithLLM(String queryText) {
        if (queryText == null) return false;
        String lower = queryText.toLowerCase();
        return lower.contains("không phải") || lower.contains("không lấy")
                || lower.contains("trừ hãng") || lower.contains("loại trừ")
                || lower.contains("tốt hơn") || lower.contains("so với");
    }

    private String detectCategory(String queryText) {
        String lower = queryText.toLowerCase();
        if (lower.contains("điện thoại") || lower.contains("phone")
                || lower.contains("iphone") || lower.contains("samsung")
                || lower.contains("android")) {
            return "phone";
        }
        return "laptop"; // mặc định
    }

    private SearchQuery saveSearchQuery(SearchRequest request, Long userId,
                                         ExtractedCriteria criteria, String categoryCode) {
        var category = categoryRepository.findByCode(categoryCode.toLowerCase()).orElse(null);
        User userRef = null;
        if (userId != null) {
            userRef = userRepository.findById(userId.intValue()).orElse(null);
        }

        Map<String, Object> criteriaMap = new HashMap<>();
        if (criteria != null) {
            if (criteria.getCategoryCode() != null) criteriaMap.put("categoryCode", criteria.getCategoryCode());
            if (criteria.getBudgetMin() != null) criteriaMap.put("budgetMin", criteria.getBudgetMin());
            if (criteria.getBudgetMax() != null) criteriaMap.put("budgetMax", criteria.getBudgetMax());
            if (criteria.getTarget() != null) criteriaMap.put("target", criteria.getTarget());
            if (criteria.getRequiredSpecs() != null) criteriaMap.put("requiredSpecs", criteria.getRequiredSpecs());
        }

        SearchQuery query = SearchQuery.builder()
                .user(userRef)
                .sessionId(request.getSessionId())
                .queryText(request.getQueryText())
                .categoryDetected(category)
                .extractedCriteria(criteriaMap)
                .isTestQuery(false)
                .build();
        return searchQueryRepository.save(query);
    }
}
