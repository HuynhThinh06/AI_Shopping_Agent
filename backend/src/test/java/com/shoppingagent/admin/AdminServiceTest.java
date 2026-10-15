package com.shoppingagent.admin;

import com.shoppingagent.admin.dto.GinBenchmarkRequest;
import com.shoppingagent.admin.dto.GinBenchmarkResultDTO;
import com.shoppingagent.admin.dto.SystemStatsDTO;
import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.review.ReviewRepository;
import com.shoppingagent.search.SearchQueryRepository;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.RankingWeight;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminService — Kiểm thử logic thống kê, giám sát LLM, trọng số và Benchmark GIN Index")
class AdminServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private SearchQueryRepository searchQueryRepository;

    @Mock
    private LlmLogRepository llmLogRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private RankingWeightRepository rankingWeightRepository;

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private AdminService adminService;

    @Test
    @DisplayName("getSystemStats — Tổng hợp chính xác số liệu thống kê hệ thống và ước tính chi phí token")
    void shouldReturnAccurateSystemStats() {
        when(productRepository.count()).thenReturn(120L);
        when(reviewRepository.count()).thenReturn(450L);
        when(searchQueryRepository.count()).thenReturn(80L);
        when(llmLogRepository.countTotalRequests()).thenReturn(150L);
        when(llmLogRepository.countSuccessRequests()).thenReturn(145L);
        when(llmLogRepository.countFailedRequests()).thenReturn(5L);
        when(llmLogRepository.getAvgLatencyMs()).thenReturn(1245.8);
        when(llmLogRepository.getTotalTokensUsed()).thenReturn(350_000L);

        SystemStatsDTO stats = adminService.getSystemStats();

        assertThat(stats.getTotalProducts()).isEqualTo(120L);
        assertThat(stats.getTotalReviews()).isEqualTo(450L);
        assertThat(stats.getTotalQueries()).isEqualTo(80L);
        assertThat(stats.getTotalLlmCalls()).isEqualTo(150L);
        assertThat(stats.getSuccessLlmCalls()).isEqualTo(145L);
        assertThat(stats.getFailedLlmCalls()).isEqualTo(5L);
        assertThat(stats.getAvgLatencyMs()).isEqualTo(1245.8);
        assertThat(stats.getTotalTokensUsed()).isEqualTo(350_000L);
        assertThat(stats.getEstimatedCostUsd()).isGreaterThan(0.0);
    }

    @Test
    @DisplayName("getLlmLogs — Phân trang log gọi Gemini và trích xuất đúng thông tin")
    void shouldReturnPagedLlmLogs() {
        when(llmLogRepository.findAllByOrderByCreatedAtDesc(any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        Page<?> logs = adminService.getLlmLogs(PageRequest.of(0, 10));

        assertThat(logs).isNotNull();
        assertThat(logs.getContent()).isEmpty();
    }

    @Test
    @DisplayName("updateCategoryWeights — Cập nhật trọng số theo ngành hàng thành công")
    void shouldUpdateCategoryWeights() {
        Category category = Category.builder().id(1).code("laptop").name("Laptop").build();
        when(categoryRepository.findByCode("laptop")).thenReturn(Optional.of(category));

        RankingWeight existing = RankingWeight.builder()
                .id(1)
                .category(category)
                .criteria("price")
                .weight(BigDecimal.valueOf(0.35))
                .build();
        when(rankingWeightRepository.findByCategoryCodeAndCriteria("laptop", "price"))
                .thenReturn(Optional.of(existing));

        when(categoryRepository.findWeightsByCategoryCode("laptop"))
                .thenReturn(Map.of("price", 0.40, "rating", 0.20, "spec_match", 0.40));

        Map<String, Double> result = adminService.updateCategoryWeights("laptop", Map.of("price", 0.40));

        assertThat(result).containsEntry("price", 0.40);
    }

    @Test
    @DisplayName("runGinBenchmark — Chạy thử nghiệm đo đạc và trả về số liệu so sánh hợp lệ")
    void shouldReturnBenchmarkResults() {
        GinBenchmarkRequest req = GinBenchmarkRequest.builder()
                .categoryCode("laptop")
                .specKey("ram")
                .specValue("16")
                .iterations(3)
                .build();

        GinBenchmarkResultDTO result = adminService.runGinBenchmark(req);

        assertThat(result).isNotNull();
        assertThat(result.getCategoryCode()).isEqualTo("laptop");
        assertThat(result.getSpecKey()).isEqualTo("ram");
        assertThat(result.getIterations()).isEqualTo(3);
        assertThat(result.getSeqScanAvgLatencyMs()).isGreaterThan(0.0);
        assertThat(result.getGinIndexAvgLatencyMs()).isGreaterThan(0.0);
        assertThat(result.getSpeedupRatio()).isGreaterThan(0.0);
    }
}
