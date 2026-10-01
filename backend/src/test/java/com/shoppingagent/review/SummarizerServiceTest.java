package com.shoppingagent.review;

import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.review.dto.SummaryDTO;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.Review;
import com.shoppingagent.shared.entity.ReviewSummary;
import com.shoppingagent.shared.llm.LlmClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SummarizerService — Kiểm thử cơ chế Cache và tích hợp LLM tóm tắt")
class SummarizerServiceTest {

    @Mock
    private LlmClient llmClient;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ReviewSummaryRepository reviewSummaryRepository;

    @Mock
    private ReviewFilterService reviewFilterService;

    @InjectMocks
    private SummarizerService summarizerService;

    private Product product;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(summarizerService, "llmModel", "gemini-2.0-flash");

        product = Product.builder()
                .id(10L)
                .name("iPhone 15 Pro Max")
                .reviewCount(5)
                .build();
    }

    @Test
    @DisplayName("Cache Hit: Trả về cache ngay khi review_count không đổi (không gọi LLM)")
    void shouldReturnCachedSummaryWhenReviewCountMatches() {
        ReviewSummary cached = ReviewSummary.builder()
                .product(product)
                .summaryText("Sản phẩm cao cấp, camera xuất sắc.")
                .pros("• Màn hình đẹp\n• Camera zoom 5x sắc nét")
                .cons("• Giá thành cao")
                .llmModelUsed("gemini-2.0-flash")
                .reviewCountAtGenerate(5) // Khớp với product.reviewCount = 5
                .generatedAt(LocalDateTime.now())
                .build();
        product.setReviewSummary(cached);

        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        SummaryDTO result = summarizerService.getSummary(10L);

        assertNotNull(result);
        assertTrue(result.isCached(), "Kết quả phải được đánh dấu cached = true");
        assertEquals("Sản phẩm cao cấp, camera xuất sắc.", result.getSummaryText());
        assertEquals("• Màn hình đẹp\n• Camera zoom 5x sắc nét", result.getPros());

        // Đảm bảo KHÔNG gọi LLM hoặc repository lọc review
        verifyNoInteractions(llmClient);
        verifyNoInteractions(reviewFilterService);
        verify(reviewSummaryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cache Miss: Gọi LLM tóm tắt khi chưa có cache hoặc có review mới, sau đó lưu cache")
    void shouldCallLlmAndSaveCacheWhenCacheMiss() {
        // Chưa có reviewSummary (null)
        product.setReviewSummary(null);

        Review r1 = Review.builder().id(1L).content("Pin cực trâu, máy mượt.").build();
        Review r2 = Review.builder().id(2L).content("Camera chụp đêm rất đẹp.").build();
        List<Review> validReviews = List.of(r1, r2);

        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(reviewRepository.findValidReviews(10L)).thenReturn(validReviews);
        when(reviewFilterService.filter(validReviews)).thenReturn(List.of("Pin cực trâu, máy mượt.", "Camera chụp đêm rất đẹp."));

        SummaryDTO mockLlmResponse = new SummaryDTO();
        mockLlmResponse.setSummaryText("Điện thoại toàn diện với pin và camera xuất sắc.");
        mockLlmResponse.setPros("• Pin trâu\n• Camera chụp đêm tốt");
        mockLlmResponse.setCons("• Chưa ghi nhận phản hồi tiêu cực nổi bật.");

        when(llmClient.summarizeReviews(eq("iPhone 15 Pro Max"), anyList()))
                .thenReturn(mockLlmResponse);

        SummaryDTO result = summarizerService.getSummary(10L);

        assertNotNull(result);
        assertFalse(result.isCached(), "Kết quả mới sinh phải có cached = false");
        assertEquals("Điện thoại toàn diện với pin và camera xuất sắc.", result.getSummaryText());
        assertEquals("gemini-2.0-flash", result.getLlmModelUsed());

        // Kiểm tra đã lưu cache mới vào Postgres
        verify(reviewSummaryRepository).save(any(ReviewSummary.class));
    }
}
