package com.shoppingagent.search;

import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.shared.entity.Product;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("RankingService — Kiểm thử thuật toán xếp hạng đa tiêu chí (Weighted Scoring)")
class RankingServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private RankingService rankingService;

    private static final Map<String, Double> WEIGHTS = Map.of(
            "price", 0.35,
            "spec_match", 0.45,
            "rating", 0.20
    );

    @Test
    @DisplayName("Sản phẩm giá rẻ hơn sẽ có điểm giá cao hơn khi các yếu tố khác ngang nhau")
    void shouldRankCheaperProductHigherWhenSpecsAndRatingAreEqual() {
        Product cheap = buildProduct(1L, "Laptop Rẻ", 15_000_000L, new BigDecimal("4.5"), Map.of("ram", 16));
        Product expensive = buildProduct(2L, "Laptop Đắt", 30_000_000L, new BigDecimal("4.5"), Map.of("ram", 16));

        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setRequiredSpecs(Map.of("ram", "16"));

        List<RankedProduct> results = rankingService.rank(List.of(cheap, expensive), criteria, WEIGHTS, 10);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getProductId()).isEqualTo(1L);
        assertThat(results.get(0).getScore()).isGreaterThan(results.get(1).getScore());
        assertThat(results.get(0).getRankPosition()).isEqualTo(1);
        assertThat(results.get(1).getRankPosition()).isEqualTo(2);
    }

    @Test
    @DisplayName("Sản phẩm khớp thông số (SpecMatch) 100% khi tất cả spec yêu cầu đều thỏa mãn")
    void shouldCalculateFullSpecMatchWhenAllSpecsSatisfied() {
        Product product = buildProduct(1L, "Laptop Gaming", 25_000_000L, new BigDecimal("4.8"),
                Map.of("ram", 16, "storage", 512, "cpu", "Intel Core i7"));

        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setRequiredSpecs(Map.of(
                "ram", ">=16",
                "storage", ">=512",
                "cpu", "i7"
        ));

        List<RankedProduct> results = rankingService.rank(List.of(product), criteria, WEIGHTS, 10);

        assertThat(results).isNotEmpty();
        assertThat(results.get(0).getSpecMatchScore()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Hỗ trợ so sánh toán tử trong specs: >=, <=, >, < và chuỗi không phân biệt hoa thường")
    void shouldHandleVariousOperatorsInSpecMatch() {
        Product p1 = buildProduct(1L, "P1", 20_000_000L, new BigDecimal("4.0"),
                Map.of("ram", 16, "storage", 256, "chipset", "Snapdragon 8 Gen 2"));

        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setRequiredSpecs(Map.of(
                "ram", "<=32",
                "storage", "<512",
                "chipset", "snapdragon"
        ));

        List<RankedProduct> results = rankingService.rank(List.of(p1), criteria, WEIGHTS, 10);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getSpecMatchScore()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Trả về danh sách rỗng khi không có sản phẩm đầu vào")
    void shouldReturnEmptyListWhenProductsEmpty() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        List<RankedProduct> results = rankingService.rank(Collections.emptyList(), criteria, WEIGHTS, 10);

        assertThat(results).isEmpty();
    }

    @Test
    @DisplayName("Giới hạn đúng top-K sản phẩm trả về")
    void shouldLimitResultsToTopK() {
        List<Product> products = new ArrayList<>();
        for (long i = 1; i <= 15; i++) {
            products.add(buildProduct(i, "Laptop " + i, 10_000_000L + i * 1_000_000L,
                    new BigDecimal("4.0"), Map.of("ram", 8)));
        }

        ExtractedCriteria criteria = new ExtractedCriteria();
        List<RankedProduct> results = rankingService.rank(products, criteria, WEIGHTS, 5);

        assertThat(results).hasSize(5);
        for (int i = 0; i < 5; i++) {
            assertThat(results.get(i).getRankPosition()).isEqualTo(i + 1);
        }
    }

    private Product buildProduct(Long id, String name, Long price, BigDecimal avgRating, Map<String, Object> specs) {
        return Product.builder()
                .id(id)
                .name(name)
                .brand("BrandTest")
                .price(price)
                .avgRating(avgRating)
                .reviewCount(10)
                .specs(specs)
                .isActive(true)
                .build();
    }
}
