package com.shoppingagent.search;

import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.shared.entity.Product;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Thuật toán xếp hạng sản phẩm đa tiêu chí — Weighted Scoring.
 *
 * Công thức:
 *   Score(p) = w_rating  × Norm(avgRating)
 *            + w_price   × Norm(1/price)
 *            + w_spec    × SpecMatch(p, criteria)
 *
 * Trong đó:
 *   Norm(x) = (x - min) / (max - min)   [Min-Max normalization]
 *   SpecMatch = số spec khớp / tổng spec yêu cầu
 *
 * Trọng số lấy từ bảng ranking_weights trong DB (inject qua ProductRepository).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RankingService {

    private final ProductRepository productRepository;

    // Trọng số mặc định (override bởi DB nếu có)
    private static final double DEFAULT_W_RATING   = 0.20;
    private static final double DEFAULT_W_PRICE    = 0.35;
    private static final double DEFAULT_W_SPEC     = 0.45;

    /**
     * @param products  Danh sách sản phẩm ứng viên (đã lọc sơ bộ)
     * @param criteria  Tiêu chí trích xuất từ LLM
     * @param weights   Trọng số theo ngành hàng {price, rating, spec_match}
     * @param topK      Số lượng kết quả trả về
     */
    public List<RankedProduct> rank(List<Product> products,
                                    ExtractedCriteria criteria,
                                    Map<String, Double> weights,
                                    int topK) {
        if (products.isEmpty()) return Collections.emptyList();

        double wRating = weights.getOrDefault("rating",    DEFAULT_W_RATING);
        double wPrice  = weights.getOrDefault("price",     DEFAULT_W_PRICE);
        double wSpec   = weights.getOrDefault("spec_match",DEFAULT_W_SPEC);

        // ── Min-Max normalization values ──────────────────────────────────────
        double maxRating = products.stream()
                .map(p -> p.getAvgRating() != null ? p.getAvgRating().doubleValue() : 0.0)
                .max(Double::compareTo).orElse(5.0);
        double minRating = products.stream()
                .map(p -> p.getAvgRating() != null ? p.getAvgRating().doubleValue() : 0.0)
                .min(Double::compareTo).orElse(0.0);

        double maxPrice = products.stream()
                .map(p -> p.getPrice().doubleValue())
                .max(Double::compareTo).orElse(1.0);
        double minPrice = products.stream()
                .map(p -> p.getPrice().doubleValue())
                .min(Double::compareTo).orElse(0.0);

        // ── Tính score cho từng sản phẩm ─────────────────────────────────────
        List<RankedProduct> ranked = products.stream()
                .map(p -> {
                    double normRating = normalize(
                            p.getAvgRating() != null ? p.getAvgRating().doubleValue() : 0.0,
                            minRating, maxRating);

                    // Giá thấp hơn → điểm cao hơn: dùng (1/price) rồi normalize
                    double invPrice = p.getPrice() > 0 ? 1.0 / p.getPrice() : 0.0;
                    double maxInv   = minPrice > 0 ? 1.0 / minPrice : 0.0;
                    double minInv   = maxPrice > 0 ? 1.0 / maxPrice : 0.0;
                    double normPrice = normalize(invPrice, minInv, maxInv);

                    double specMatch = computeSpecMatch(p, criteria);

                    double score = wRating * normRating
                                 + wPrice  * normPrice
                                 + wSpec   * specMatch;

                    return RankedProduct.builder()
                            .productId(p.getId())
                            .name(p.getName())
                            .brand(p.getBrand())
                            .price(p.getPrice())
                            .avgRating(p.getAvgRating())
                            .reviewCount(p.getReviewCount())
                            .productUrl(p.getProductUrl())
                            .specs(p.getSpecs())
                            .score(Math.round(score * 10000.0) / 10000.0)
                            .specMatchScore(Math.round(specMatch * 10000.0) / 10000.0)
                            .build();
                })
                .sorted(Comparator.comparingDouble(RankedProduct::getScore).reversed())
                .limit(topK)
                .collect(Collectors.toList());

        // Gán rank position
        for (int i = 0; i < ranked.size(); i++) {
            ranked.get(i).setRankPosition(i + 1);
        }

        log.debug("[Ranking] Ranked {} products, returning top {}", products.size(), ranked.size());
        return ranked;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private double normalize(double value, double min, double max) {
        if (max == min) return 1.0; // tránh chia cho 0
        return (value - min) / (max - min);
    }

    /**
     * Tính tỉ lệ spec của sản phẩm khớp với yêu cầu trong criteria.
     * So sánh đơn giản: cast về số nếu có thể, còn lại so sánh chuỗi.
     */
    private double computeSpecMatch(Product product, ExtractedCriteria criteria) {
        Map<String, String> required = criteria.getRequiredSpecs();
        if (required == null || required.isEmpty()) return 1.0;

        Map<String, Object> actualSpecs = product.getSpecs();
        if (actualSpecs == null) return 0.0;

        long matched = required.entrySet().stream().filter(entry -> {
            Object actual = actualSpecs.get(entry.getKey());
            if (actual == null) return false;
            return matchSpec(actual.toString(), entry.getValue());
        }).count();

        return (double) matched / required.size();
    }

    /**
     * So sánh giá trị spec: hỗ trợ toán tử >=, <=, chứa chuỗi.
     * vd: actual="16", required=">=8" → true
     */
    private boolean matchSpec(String actual, String required) {
        try {
            if (required.startsWith(">=")) {
                return Double.parseDouble(actual) >= Double.parseDouble(required.substring(2));
            } else if (required.startsWith("<=")) {
                return Double.parseDouble(actual) <= Double.parseDouble(required.substring(2));
            } else if (required.startsWith(">")) {
                return Double.parseDouble(actual) > Double.parseDouble(required.substring(1));
            } else if (required.startsWith("<")) {
                return Double.parseDouble(actual) < Double.parseDouble(required.substring(1));
            } else {
                // So sánh số nếu có thể
                return Double.parseDouble(actual) >= Double.parseDouble(required);
            }
        } catch (NumberFormatException e) {
            // Fallback: so sánh chuỗi chứa nhau (case-insensitive)
            return actual.toLowerCase().contains(required.toLowerCase());
        }
    }
}
