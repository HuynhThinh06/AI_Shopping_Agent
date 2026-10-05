package com.shoppingagent.review;

import com.shoppingagent.shared.entity.Review;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Lọc bỏ review rác trước khi đưa vào LLM để tóm tắt.
 *
 * 7 tiêu chí lọc (theo thứ tự ưu tiên):
 *  1. null hoặc blank
 *  2. Quá ngắn (< 10 ký tự)
 *  3. Chỉ chứa emoji / ký tự đặc biệt (không có chữ cái hay số)
 *  4. Lặp ký tự bất thường ("aaaaaaa", "!!!!!!")
 *  5. Chứa URL hoặc số điện thoại (spam quảng cáo)
 *  6. Toàn chữ in HOA (> 70% ký tự là uppercase) — thường là spam
 *  7. Chứa ≥ 2 từ khoá giao hàng/vận chuyển (không phản ánh chất lượng sản phẩm)
 *  8. Trùng nội dung hoàn toàn với review khác (dedup)
 */
@Slf4j
@Service
public class ReviewFilterService {

    private static final int    MIN_LENGTH       = 10;
    private static final double MAX_REPEAT_RATIO = 0.7;
    private static final double MAX_UPPERCASE_RATIO = 0.70;

    /**
     * Bắt URL (http/https/www) và số điện thoại Việt Nam (10-11 chữ số liên tiếp).
     * Lookahead/lookbehind để không bắt nhầm số trong câu ("giảm 10 lần").
     */
    private static final Pattern URL_OR_PHONE_PATTERN = Pattern.compile(
            "(https?://|www\\.|(?<!\\d)\\d{10,11}(?!\\d))",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Từ khoá phản ánh trải nghiệm vận chuyển / shop — KHÔNG liên quan sản phẩm.
     * Nếu review chứa >= 2 từ khoá này → khả năng cao là spam giao hàng, loại bỏ.
     */
    private static final List<String> DELIVERY_SPAM_KEYWORDS = List.of(
            "giao hàng nhanh", "đóng gói cẩn thận", "shop uy tín",
            "sẽ quay lại", "mua lần", "ủng hộ shop", "ship nhanh",
            "đóng hàng chắc", "freeship", "giao đúng hẹn", "nhận hàng nhanh",
            "đóng gói đẹp", "nhiệt tình", "tư vấn nhiệt tình"
    );

    // ────────────────────────────────────────────────────────────────────────────

    public List<String> filter(List<Review> reviews) {
        long total = reviews.size();
        List<String> filtered = reviews.stream()
                .map(Review::getContent)
                .filter(this::isValid)
                .map(this::removeEmojis)
                .map(String::trim)
                .filter(c -> c.length() >= MIN_LENGTH) // Kiểm tra lại sau khi xóa emoji
                .distinct()     // loại trùng nội dung hoàn toàn
                .toList();

        log.info("[ReviewFilter] {}/{} reviews passed filter ({} removed)",
                filtered.size(), total, total - filtered.size());
        return filtered;
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private String removeEmojis(String text) {
        if (text == null) return null;
        // Giữ lại: Chữ cái (\p{L}), Số (\p{N}), Dấu câu (\p{P}), Khoảng trắng (\p{Z}), 
        // Tiền tệ (\p{Sc}), Ký hiệu toán học (\p{Sm}). Xóa mọi biểu tượng khác (bao gồm Emoji).
        return text.replaceAll("[^\\p{L}\\p{N}\\p{P}\\p{Z}\\p{Sc}\\p{Sm}]", "");
    }

    private boolean isValid(String content) {
        if (content == null) return false;
        String trimmed = content.trim();

        // Tiêu chí 2: Quá ngắn
        if (trimmed.length() < MIN_LENGTH) return false;

        // Tiêu chí 3: Chỉ emoji / ký tự đặc biệt, không có chữ hay số
        if (!trimmed.matches(".*[\\p{L}\\d].*")) return false;

        // Tiêu chí 4: Lặp ký tự bất thường ("aaaaaaa", "!!!!!!")
        if (hasExcessiveRepeat(trimmed)) return false;

        // Tiêu chí 5: Chứa URL hoặc số điện thoại
        if (URL_OR_PHONE_PATTERN.matcher(trimmed).find()) {
            log.debug("[ReviewFilter] Lọc spam URL/phone: '{}'",
                    trimmed.substring(0, Math.min(60, trimmed.length())));
            return false;
        }

        // Tiêu chí 6: Toàn chữ in HOA (spam kiểu "SẢN PHẨM RẤT TỐT !!!!")
        if (isAllCaps(trimmed)) return false;

        // Tiêu chí 7: Quá nhiều từ khoá giao hàng (không nói về sản phẩm)
        if (isDeliverySpam(trimmed)) {
            log.debug("[ReviewFilter] Lọc spam giao hàng: '{}'",
                    trimmed.substring(0, Math.min(60, trimmed.length())));
            return false;
        }

        return true;
    }

    /** TRUE nếu ký tự đầu tiên chiếm > MAX_REPEAT_RATIO tổng độ dài */
    private boolean hasExcessiveRepeat(String text) {
        if (text.length() < 4) return false;
        char first = text.charAt(0);
        long sameCount = text.chars().filter(c -> c == first).count();
        return (double) sameCount / text.length() > MAX_REPEAT_RATIO;
    }

    /** TRUE nếu > 70% chữ cái trong text là chữ HOA (tính trên tập chữ cái) */
    private boolean isAllCaps(String text) {
        long letters = text.chars().filter(Character::isLetter).count();
        if (letters < 6) return false;  // quá ít chữ → không đủ để kết luận
        long upperCase = text.chars().filter(Character::isUpperCase).count();
        return (double) upperCase / letters > MAX_UPPERCASE_RATIO;
    }

    /**
     * TRUE nếu review chứa >= 2 từ khoá giao hàng.
     * Một review nói về vận chuyển đơn thuần không phản ánh chất lượng sản phẩm
     * nên không nên đưa vào LLM để tóm tắt ưu/nhược điểm sản phẩm.
     */
    private boolean isDeliverySpam(String text) {
        String lower = text.toLowerCase();
        long matches = DELIVERY_SPAM_KEYWORDS.stream()
                .filter(lower::contains)
                .count();
        return matches >= 2;
    }
}
