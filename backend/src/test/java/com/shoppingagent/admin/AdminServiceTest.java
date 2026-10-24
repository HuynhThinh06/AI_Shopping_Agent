package com.shoppingagent.admin;

import com.shoppingagent.admin.dto.BulkActionRequest;
import com.shoppingagent.admin.dto.BulkActionResultDTO;
import com.shoppingagent.admin.dto.DashboardTrendsDTO;
import com.shoppingagent.admin.dto.GinBenchmarkRequest;
import com.shoppingagent.admin.dto.GinBenchmarkResultDTO;
import com.shoppingagent.admin.dto.SystemStatsDTO;
import com.shoppingagent.audit.AuditAction;
import com.shoppingagent.audit.AuditLogService;
import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.review.ReviewRepository;
import com.shoppingagent.review.ReviewSummaryRepository;
import com.shoppingagent.search.SearchQueryRepository;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.RankingWeight;
import com.shoppingagent.shared.entity.Review;
import com.shoppingagent.shared.entity.User;
import com.shoppingagent.shared.security.UserAuthCacheService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
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
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminService — Kiểm thử logic thống kê, giám sát LLM, trọng số, Audit Log, Bulk Action và Trends")
class AdminServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ReviewSummaryRepository reviewSummaryRepository;

    @Mock
    private SearchQueryRepository searchQueryRepository;

    @Mock
    private LlmLogRepository llmLogRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private RankingWeightRepository rankingWeightRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EntityManager entityManager;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private UserAuthCacheService userAuthCacheService;

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

    @Test
    @DisplayName("bulkModerateReviews — Chỉ tính lại thống kê 1 lần cho mỗi sản phẩm, trả đúng skippedIds và ghi 1 dòng Audit Log")
    void shouldBulkModerateReviewsAndRecalcOncePerProduct() {
        Product p1 = Product.builder().id(100L).name("MacBook Air").build();
        Product p2 = Product.builder().id(200L).name("Dell XPS").build();

        Review r1 = Review.builder().id(1L).product(p1).isSpam(false).isActive(true).build();
        Review r2 = Review.builder().id(2L).product(p1).isSpam(false).isActive(true).build();
        Review r3 = Review.builder().id(3L).product(p2).isSpam(false).isActive(true).build();

        when(reviewRepository.findAllById(any())).thenReturn(List.of(r1, r2, r3));
        when(reviewRepository.countByProductIdAndIsActiveTrue(100L)).thenReturn(5L);
        when(reviewRepository.calculateAvgRating(100L)).thenReturn(4.5);
        when(reviewRepository.countByProductIdAndIsActiveTrue(200L)).thenReturn(2L);
        when(reviewRepository.calculateAvgRating(200L)).thenReturn(4.0);

        BulkActionRequest req = BulkActionRequest.builder()
                .ids(List.of(1L, 2L, 3L, 999L))
                .action("spam")
                .build();

        BulkActionResultDTO res = adminService.bulkModerateReviews(req);

        assertThat(res.getRequested()).isEqualTo(4);
        assertThat(res.getProcessed()).isEqualTo(3);
        assertThat(res.getSkippedIds()).containsExactly(999L);
        assertThat(r1.getIsSpam()).isTrue();
        assertThat(r1.getIsActive()).isFalse();

        // Sản phẩm p1 có 2 review trong lô nhưng chỉ được tính lại 1 lần
        verify(reviewRepository, times(1)).countByProductIdAndIsActiveTrue(100L);
        verify(reviewRepository, times(1)).countByProductIdAndIsActiveTrue(200L);
        verify(auditLogService, times(1)).log(eq(AuditAction.REVIEW_BULK_SPAM), eq("REVIEW"), eq(null), anyString(), anyMap());
    }

    @Test
    @DisplayName("bulkModerateReviews — Từ chối danh sách rỗng, vượt quá 200 ID hoặc action không hợp lệ")
    void shouldValidateBulkReviewsInput() {
        assertThatThrownBy(() -> adminService.bulkModerateReviews(new BulkActionRequest(Collections.emptyList(), "approve")))
                .isInstanceOf(IllegalArgumentException.class);

        List<Long> tooManyIds = LongStream.rangeClosed(1, 201).boxed().toList();
        assertThatThrownBy(() -> adminService.bulkModerateReviews(new BulkActionRequest(tooManyIds, "approve")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("200");

        assertThatThrownBy(() -> adminService.bulkModerateReviews(new BulkActionRequest(List.of(1L), "invalid_action")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("bulkUpdateProducts — Cập nhật trạng thái hàng loạt và ghi 1 dòng Audit Log")
    void shouldBulkUpdateProducts() {
        Product p1 = Product.builder().id(10L).name("P1").isActive(true).build();
        Product p2 = Product.builder().id(20L).name("P2").isActive(true).build();
        when(productRepository.findAllById(any())).thenReturn(List.of(p1, p2));

        BulkActionResultDTO res = adminService.bulkUpdateProducts(
                new BulkActionRequest(List.of(10L, 20L, 30L), "deactivate")
        );

        assertThat(res.getRequested()).isEqualTo(3);
        assertThat(res.getProcessed()).isEqualTo(2);
        assertThat(res.getSkippedIds()).containsExactly(30L);
        assertThat(p1.getIsActive()).isFalse();
        assertThat(p2.getIsActive()).isFalse();
        verify(productRepository, times(1)).saveAll(any());
        verify(auditLogService, times(1)).log(eq(AuditAction.PRODUCT_BULK_DEACTIVATE), eq("PRODUCT"), eq(null), anyString(), anyMap());
    }

    @Test
    @DisplayName("toggleUserStatus & updateUserRole — Xóa cache userAuthStatus ngay lập tức và ghi Audit Log")
    void shouldEvictUserAuthCacheAndLogWhenUserModified() {
        User u = User.builder().id(5).username("hoangminh").role("user").isActive(true).build();
        when(userRepository.findById(5)).thenReturn(Optional.of(u));

        adminService.toggleUserStatus(5);
        assertThat(u.getIsActive()).isFalse();
        verify(userAuthCacheService, times(1)).evictUser(5);
        verify(auditLogService, times(1)).log(eq(AuditAction.USER_LOCK), eq("USER"), eq(5), anyString(), anyMap());

        adminService.updateUserRole(5, "admin");
        assertThat(u.getRole()).isEqualTo("admin");
        verify(userAuthCacheService, times(2)).evictUser(5);
        verify(auditLogService, times(1)).log(eq(AuditAction.USER_ROLE_CHANGE), eq("USER"), eq(5), anyString(), anyMap());
    }

    @Test
    @DisplayName("getDashboardTrends — Điền 0 cho ngày trống, trả đủ số ngày và tính đúng previousTotals")
    void shouldFillZerosForEmptyDaysAndComputePreviousTotals() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate yesterday = today.minusDays(1);
        LocalDate prevPeriodDay = today.minusDays(10); // thuộc kỳ 7 ngày liền trước

        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        List<Object[]> sparseRows = new ArrayList<>();
        sparseRows.add(new Object[]{prevPeriodDay.toString(), 8L, 12L, 1L, 750L, 4500L, 2L, 1L});
        sparseRows.add(new Object[]{yesterday.toString(), 15L, 22L, 0L, 680L, 9200L, 4L, 2L});
        sparseRows.add(new Object[]{today.toString(), 5L, 8L, 1L, 810L, 3100L, 1L, 0L});
        when(mockQuery.getResultList()).thenReturn(sparseRows);

        DashboardTrendsDTO trends = adminService.getDashboardTrends(7);

        assertThat(trends.getDays()).isEqualTo(7);
        assertThat(trends.getSeries()).hasSize(7);
        // Ngày đầu tiên của kỳ 7 ngày không có trong sparseRows -> phải được điền 0
        assertThat(trends.getSeries().get(0).getSearches()).isEqualTo(0L);
        assertThat(trends.getTotals().get("searches")).isEqualTo(20L);
        assertThat(trends.getTotals().get("llmCalls")).isEqualTo(30L);
        assertThat(trends.getTotals().get("tokens")).isEqualTo(12300L);
        assertThat(trends.getPreviousTotals().get("searches")).isEqualTo(8L);
        assertThat(trends.getPreviousTotals().get("tokens")).isEqualTo(4500L);
    }
}
