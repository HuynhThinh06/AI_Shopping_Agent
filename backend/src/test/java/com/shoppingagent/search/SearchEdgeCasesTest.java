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
import static org.assertj.core.api.Assertions.assertThatCode;

@ExtendWith(MockitoExtension.class)
@DisplayName("SearchEdgeCasesTest — Kiểm thử Hộp Trắng các ca biên & bất thường trong thuật toán Tìm kiếm & Xếp hạng")
class SearchEdgeCasesTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private RankingService rankingService;

    private static final Map<String, Double> DEFAULT_WEIGHTS = Map.of(
            "price", 0.35,
            "spec_match", 0.45,
            "rating", 0.20
    );

    @Test
    @DisplayName("Biên 1: Danh sách sản phẩm ứng viên rỗng -> trả về mảng rỗng không lỗi")
    void shouldReturnEmptyListWhenCandidatesEmpty() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        List<RankedProduct> results = rankingService.rank(Collections.emptyList(), criteria, DEFAULT_WEIGHTS, 10);
        assertThat(results).isEmpty();
    }

    @Test
    @DisplayName("Biên 2: Sản phẩm có giá = 0 hoặc âm -> không gây lỗi chia cho 0 (Divide by Zero)")
    void shouldHandleZeroPriceWithoutArithmeticException() {
        Product p0 = Product.builder()
                .id(1L)
                .name("Máy thử nghiệm 0 đồng")
                .price(0L)
                .avgRating(new BigDecimal("4.0"))
                .specs(Map.of())
                .build();

        Product p1 = Product.builder()
                .id(2L)
                .name("Máy thương mại chuẩn")
                .price(15_000_000L)
                .avgRating(new BigDecimal("4.5"))
                .specs(Map.of())
                .build();

        ExtractedCriteria criteria = new ExtractedCriteria();

        assertThatCode(() -> {
            List<RankedProduct> results = rankingService.rank(List.of(p0, p1), criteria, DEFAULT_WEIGHTS, 10);
            assertThat(results).hasSize(2);
        }).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Biên 3: Sản phẩm có avgRating = null -> gán mặc định 0.0 không gây NullPointerException")
    void shouldHandleNullAvgRatingWithoutNPE() {
        Product p = Product.builder()
                .id(1L)
                .name("Máy mới chưa có đánh giá")
                .price(20_000_000L)
                .avgRating(null)
                .specs(Map.of())
                .build();

        ExtractedCriteria criteria = new ExtractedCriteria();

        assertThatCode(() -> {
            List<RankedProduct> results = rankingService.rank(List.of(p), criteria, DEFAULT_WEIGHTS, 5);
            assertThat(results).hasSize(1);
            assertThat(results.get(0).getScore()).isGreaterThanOrEqualTo(0.0);
        }).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Biên 4: Ghi đè trọng số tùy chỉnh từ câu truy vấn (Query Criteria Override)")
    void shouldRespectCustomWeightsFromExtractedCriteria() {
        Product p1 = Product.builder()
                .id(1L)
                .name("Máy A")
                .price(10_000_000L)
                .avgRating(new BigDecimal("3.0"))
                .specs(Map.of("ram", 8))
                .build();

        Product p2 = Product.builder()
                .id(2L)
                .name("Máy B")
                .price(30_000_000L)
                .avgRating(new BigDecimal("5.0"))
                .specs(Map.of("ram", 8))
                .build();

        // Ưu tiên tuyệt đối về giá (weightPrice = 0.9, rating = 0.05, spec = 0.05)
        ExtractedCriteria priceHeavyCriteria = new ExtractedCriteria();
        priceHeavyCriteria.setWeightPrice(0.90);
        priceHeavyCriteria.setWeightRating(0.05);
        priceHeavyCriteria.setWeightSpec(0.05);

        List<RankedProduct> results = rankingService.rank(List.of(p1, p2), priceHeavyCriteria, DEFAULT_WEIGHTS, 2);

        assertThat(results.get(0).getProductId()).isEqualTo(1L);
        assertThat(results.get(0).getRankPosition()).isEqualTo(1);
    }

    @Test
    @DisplayName("Biên 5: Giới hạn TopK chuẩn xác khi số lượng ứng viên vượt quá TopK")
    void shouldStrictlyEnforceTopKLimit() {
        List<Product> products = new ArrayList<>();
        for (long i = 1; i <= 50; i++) {
            products.add(Product.builder()
                    .id(i)
                    .name("Laptop #" + i)
                    .price(10_000_000L + i * 100_000L)
                    .avgRating(new BigDecimal("4.0"))
                    .specs(Map.of())
                    .build());
        }

        ExtractedCriteria criteria = new ExtractedCriteria();
        List<RankedProduct> top5 = rankingService.rank(products, criteria, DEFAULT_WEIGHTS, 5);

        assertThat(top5).hasSize(5);
        for (int i = 0; i < top5.size(); i++) {
            assertThat(top5.get(i).getRankPosition()).isEqualTo(i + 1);
        }
    }
}
