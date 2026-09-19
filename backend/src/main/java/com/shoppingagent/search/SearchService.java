package com.shoppingagent.search;

import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.search.dto.SearchRequest;
import com.shoppingagent.search.dto.SearchResponse;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.SearchQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Orchestrator cho luồng tìm kiếm end-to-end:
 *
 *   queryText → [QueryParser] → ExtractedCriteria
 *             → [ProductRepo] → List<Product> ứng viên
 *             → [Ranker]      → List<RankedProduct>
 *             → Lưu SearchQuery + SearchResult vào DB
 *             → SearchResponse
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SearchService {

    private final QueryParserService queryParserService;
    private final RankingService rankingService;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SearchQueryRepository searchQueryRepository;
    private final SearchResultRepository searchResultRepository;

    public SearchResponse search(SearchRequest request, Long userId) {
        log.info("[Search] New query: '{}' userId={}", request.getQueryText(), userId);

        // ── Bước 1: Xác định ngành hàng ──────────────────────────────────────
        String categoryCode = detectCategory(request.getQueryText());

        // ── Bước 2: LLM trích xuất ràng buộc ──────────────────────────────────
        ExtractedCriteria criteria = queryParserService.parse(request.getQueryText(), categoryCode);

        // ── Bước 3: Lấy sản phẩm ứng viên từ DB ──────────────────────────────
        List<Product> candidates = productRepository.findCandidates(
                categoryCode,
                criteria.getBudgetMin(),
                criteria.getBudgetMax()
        );
        log.debug("[Search] Found {} candidate products", candidates.size());

        // ── Bước 4: Lấy trọng số xếp hạng từ DB ──────────────────────────────
        Map<String, Double> weights = categoryRepository.findWeightsByCategoryCode(categoryCode);

        // ── Bước 5: Xếp hạng ──────────────────────────────────────────────────
        List<RankedProduct> ranked = rankingService.rank(
                candidates, criteria, weights, request.getTopK());

        // ── Bước 6: Lưu SearchQuery + SearchResult vào DB ─────────────────────
        SearchQuery savedQuery = saveSearchQuery(request, userId, criteria, categoryCode);
        searchResultRepository.saveAll(ranked, savedQuery.getId());

        return SearchResponse.builder()
                .queryId(savedQuery.getId())
                .extractedCriteria(criteria)
                .results(ranked)
                .totalMatched(candidates.size())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
        var category = categoryRepository.findByCode(categoryCode).orElse(null);
        com.shoppingagent.shared.entity.User userRef = userId != null ? com.shoppingagent.shared.entity.User.builder().id(userId.intValue()).build() : null;
        SearchQuery query = SearchQuery.builder()
                .user(userRef)
                .sessionId(request.getSessionId())
                .queryText(request.getQueryText())
                .categoryDetected(category)
                .isTestQuery(false)
                .build();
        return searchQueryRepository.save(query);
    }
}
