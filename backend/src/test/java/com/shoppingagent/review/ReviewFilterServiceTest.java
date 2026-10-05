package com.shoppingagent.review;

import com.shoppingagent.shared.entity.Review;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ReviewFilterService — Kiểm thử bộ lọc review rác (7 tiêu chí)")
class ReviewFilterServiceTest {

    private ReviewFilterService filterService;

    @BeforeEach
    void setUp() {
        filterService = new ReviewFilterService();
    }

    private Review createReview(String content) {
        return Review.builder()
                .content(content)
                .build();
    }

    @Test
    @DisplayName("Review hợp lệ phải được giữ lại")
    void shouldKeepValidReviews() {
        List<Review> reviews = List.of(
                createReview("Pin dùng rất trâu, onscreen được hơn 8 tiếng liên tục."),
                createReview("Màn hình sắc nét 120Hz mượt mà, nhưng máy hơi nóng khi chơi game."),
                createReview("Camera chụp đêm khá ổn trong tầm giá này, loa to rõ.")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(3, result.size());
        assertTrue(result.contains("Pin dùng rất trâu, onscreen được hơn 8 tiếng liên tục."));
    }

    @Test
    @DisplayName("Lọc review quá ngắn (< 10 ký tự)")
    void shouldFilterShortReviews() {
        List<Review> reviews = List.of(
                createReview("Tốt"),
                createReview("Oke"),
                createReview("Hang dep"),
                createReview("Sản phẩm chất lượng rất tốt so với giá.")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(1, result.size());
        assertEquals("Sản phẩm chất lượng rất tốt so với giá.", result.get(0));
    }

    @Test
    @DisplayName("Lọc review chỉ chứa emoji hoặc ký tự đặc biệt")
    void shouldFilterEmojiOnlyReviews() {
        List<Review> reviews = List.of(
                createReview("👍👍👍👍👍👍👍👍👍👍"),
                createReview("❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️"),
                createReview(".............???????"),
                createReview("Sản phẩm dùng tốt, pin bền 👍👍👍")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(1, result.size());
        assertEquals("Sản phẩm dùng tốt, pin bền", result.get(0));
    }

    @Test
    @DisplayName("Lọc review lặp ký tự bất thường (ví dụ: aaaaaaa)")
    void shouldFilterExcessiveRepeatReviews() {
        List<Review> reviews = List.of(
                createReview("aaaaaaaaaaaaaaaaaaaa"),
                createReview("!!!!!!!!!!!!!!!!!!!!"),
                createReview("Thiết kế đẹp, cầm chắc tay và nhẹ.")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(1, result.size());
        assertEquals("Thiết kế đẹp, cầm chắc tay và nhẹ.", result.get(0));
    }

    @Test
    @DisplayName("Lọc review chứa link URL quảng cáo hoặc số điện thoại")
    void shouldFilterUrlAndPhoneNumberSpam() {
        List<Review> reviews = List.of(
                createReview("Mua hàng giá rẻ tại https://shopee.vn/product123"),
                createReview("Xem thêm chi tiết tại www.shopabc.com nhé mọi người"),
                createReview("Liên hệ Zalo 0912345678 để nhận quà tặng thêm"),
                createReview("Máy chạy mượt các tác vụ văn phòng và xem phim 4K.")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(1, result.size());
        assertEquals("Máy chạy mượt các tác vụ văn phòng và xem phim 4K.", result.get(0));
    }

    @Test
    @DisplayName("Lọc review toàn chữ in HOA (>70% uppercase)")
    void shouldFilterAllCapsSpam() {
        List<Review> reviews = List.of(
                createReview("SẢN PHẨM RẤT ĐẸP VÀ XỊN XÒ NHA MỌI NGƯỜI"),
                createReview("HÀNG CHÍNH HÃNG DÙNG CỰC KỲ THÍCH NHA"),
                createReview("Máy dùng mượt mà, màn hình OLED rất đẹp.")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(1, result.size());
        assertEquals("Máy dùng mượt mà, màn hình OLED rất đẹp.", result.get(0));
    }

    @Test
    @DisplayName("Lọc review chỉ nói về giao hàng / shop mà không đánh giá sản phẩm (>= 2 từ khóa delivery)")
    void shouldFilterDeliverySpamKeywords() {
        List<Review> reviews = List.of(
                createReview("Giao hàng nhanh, shop uy tín, đóng gói cẩn thận, sẽ quay lại ủng hộ."),
                createReview("Ship nhanh nhiệt tình, đóng hàng chắc chắn, freeship 5 sao."),
                createReview("Máy sạc nhanh 67W tầm 40 phút đầy, dùng văn phòng rất mượt.")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(1, result.size());
        assertEquals("Máy sạc nhanh 67W tầm 40 phút đầy, dùng văn phòng rất mượt.", result.get(0));
    }

    @Test
    @DisplayName("Loại bỏ các review trùng lặp hoàn toàn (dedup)")
    void shouldDeduplicateIdenticalReviews() {
        List<Review> reviews = List.of(
                createReview("Sản phẩm tốt, đáng tiền mua."),
                createReview("Sản phẩm tốt, đáng tiền mua."),
                createReview("Sản phẩm tốt, đáng tiền mua."),
                createReview("Thời lượng pin rất ấn tượng, sạc cũng nhanh.")
        );

        List<String> result = filterService.filter(reviews);

        assertEquals(2, result.size());
        assertTrue(result.contains("Sản phẩm tốt, đáng tiền mua."));
        assertTrue(result.contains("Thời lượng pin rất ấn tượng, sạc cũng nhanh."));
    }
}
