package com.shoppingagent.review;

import com.shoppingagent.product.ProductNotFoundException;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.review.dto.ReviewCreateRequest;
import com.shoppingagent.review.dto.ReviewResponseDTO;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.Review;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewService — Kiểm thử logic nghiệp vụ Review & Cập nhật thống kê sản phẩm")
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ReviewService reviewService;

    private Product sampleProduct;

    @BeforeEach
    void setUp() {
        sampleProduct = Product.builder()
                .id(1L)
                .name("Laptop Dell Inspiron 15")
                .price(18000000L)
                .reviewCount(0)
                .avgRating(null)
                .build();
    }

    @Test
    @DisplayName("Lấy danh sách review có phân trang thành công")
    void shouldListReviewsWithPagination() {
        Review r1 = Review.builder()
                .id(101L)
                .product(sampleProduct)
                .reviewerName("Trần Văn B")
                .content("Máy dùng rất ổn định trong phân khúc giá.")
                .rating((short) 5)
                .isSpam(false)
                .createdAt(LocalDateTime.now())
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<Review> reviewPage = new PageImpl<>(List.of(r1), pageable, 1);

        when(reviewRepository.findByProductIdAndIsActiveTrue(1L, pageable))
                .thenReturn(reviewPage);

        Page<ReviewResponseDTO> result = reviewService.listReviews(1L, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Trần Văn B", result.getContent().get(0).getReviewerName());
        assertEquals((short) 5, result.getContent().get(0).getRating());
    }

    @Test
    @DisplayName("Tạo review thành công và tự động tính lại avg_rating + review_count cho sản phẩm")
    void shouldCreateReviewAndUpdateProductStats() {
        ReviewCreateRequest request = new ReviewCreateRequest();
        request.setReviewerName("Nguyễn Văn A");
        request.setContent("Màn hình sáng đẹp, phím bấm êm.");
        request.setRating((short) 5);

        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> {
            Review r = invocation.getArgument(0);
            r.setId(201L);
            r.setCreatedAt(LocalDateTime.now());
            return r;
        });

        // Mock thống kê mới sau khi thêm review
        when(reviewRepository.countByProductIdAndIsActiveTrue(1L)).thenReturn(1L);
        when(reviewRepository.calculateAvgRating(1L)).thenReturn(5.0);

        ReviewResponseDTO response = reviewService.createReview(1L, request);

        assertNotNull(response);
        assertEquals("Nguyễn Văn A", response.getReviewerName());
        assertEquals((short) 5, response.getRating());

        // Kiểm tra productRepository.save được gọi để cập nhật reviewCount và avgRating
        ArgumentCaptor<Product> productCaptor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(productCaptor.capture());

        Product updatedProduct = productCaptor.getValue();
        assertEquals(1, updatedProduct.getReviewCount());
        assertEquals(new BigDecimal("5.00"), updatedProduct.getAvgRating());
    }

    @Test
    @DisplayName("Tạo review với reviewerName để trống thì tự gán 'Khách hàng ẩn danh'")
    void shouldDefaultAnonymousWhenReviewerNameIsBlank() {
        ReviewCreateRequest request = new ReviewCreateRequest();
        request.setReviewerName("   ");
        request.setContent("Dùng ổn, pin tầm 6 tiếng.");
        request.setRating((short) 4);

        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewRepository.countByProductIdAndIsActiveTrue(1L)).thenReturn(1L);
        when(reviewRepository.calculateAvgRating(1L)).thenReturn(4.0);

        ReviewResponseDTO response = reviewService.createReview(1L, request);

        assertEquals("Khách hàng ẩn danh", response.getReviewerName());
    }

    @Test
    @DisplayName("Ném ProductNotFoundException khi sản phẩm không tồn tại")
    void shouldThrowExceptionWhenProductNotFound() {
        ReviewCreateRequest request = new ReviewCreateRequest();
        request.setContent("Test nội dung hợp lệ");
        request.setRating((short) 5);

        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> reviewService.createReview(999L, request));
        verify(reviewRepository, never()).save(any());
    }
}
