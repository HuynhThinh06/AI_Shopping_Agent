package com.shoppingagent.review;

import com.shoppingagent.shared.entity.Review;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ReviewFilterAdvancedTest — Kiểm thử Hộp Trắng các ca Spam tinh vi và Đánh giá công nghệ thực tế")
class ReviewFilterAdvancedTest {

    private ReviewFilterService reviewFilterService;

    @BeforeEach
    void setUp() {
        reviewFilterService = new ReviewFilterService();
    }

    @Test
    @DisplayName("Lọc thành công: Spam vận chuyển & shop khi chứa >= 2 từ khóa giao hàng")
    void shouldFilterDeliverySpamWithMultipleKeywords() {
        Review r1 = Review.builder().content("Giao hàng nhanh đóng gói cẩn thận shop phục vụ nhiệt tình").build();
        Review r2 = Review.builder().content("Shop uy tín sẽ quay lại ủng hộ shop lần sau").build();
        Review r3 = Review.builder().content("Freeship giao đúng hẹn nhiệt tình").build();

        List<String> result = reviewFilterService.filter(List.of(r1, r2, r3));
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Lọc thành công: Spam chứa URL rút gọn hoặc số điện thoại quảng cáo")
    void shouldFilterReviewsWithUrlsOrPhoneNumbers() {
        Review r1 = Review.builder().content("Mua hàng giảm giá tại http://shopee-sale.vn/voucher máy xịn").build();
        Review r2 = Review.builder().content("Liên hệ số 0988123456 để nhận quà tặng kèm chuột không dây").build();

        List<String> result = reviewFilterService.filter(List.of(r1, r2));
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Giữ lại đánh giá công nghệ chuẩn xác kèm thông số kỹ thuật tiếng Việt")
    void shouldKeepLegitimateTechReviews() {
        Review genuine1 = Review.builder()
                .content("Màn hình OLED 120Hz hiển thị màu đen sâu, pin dùng văn phòng được khoảng 6 tiếng liên tục.")
                .build();

        Review genuine2 = Review.builder()
                .content("Chip Core i5-1235U đi kèm 16GB RAM chạy đa nhiệm mượt, mở 30 tab Chrome không giật.")
                .build();

        List<String> result = reviewFilterService.filter(List.of(genuine1, genuine2));
        assertThat(result).hasSize(2);
        assertThat(result.get(0)).contains("OLED 120Hz");
        assertThat(result.get(1)).contains("Core i5-1235U");
    }

    @Test
    @DisplayName("Làm sạch Emoji nhưng vẫn giữ nguyên nội dung văn bản có nghĩa")
    void shouldCleanEmojisWhilePreservingMeaningfulText() {
        Review r = Review.builder()
                .content("Máy dùng rất mượt và mát 🔥🔥🔥⭐⭐⭐⭐⭐ Thiết kế vỏ nhôm cao cấp 👍")
                .build();

        List<String> result = reviewFilterService.filter(List.of(r));
        assertThat(result).hasSize(1);
        assertThat(result.get(0)).contains("Máy dùng rất mượt và mát");
        assertThat(result.get(0)).contains("Thiết kế vỏ nhôm cao cấp");
        // Không còn chứa emoji
        assertThat(result.get(0)).doesNotContain("🔥");
        assertThat(result.get(0)).doesNotContain("👍");
    }
}
