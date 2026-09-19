package com.shoppingagent.review;

import com.shoppingagent.shared.entity.Review;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Lọc bỏ review rác trước khi đưa vào LLM để tóm tắt.
 *
 * Tiêu chí lọc:
 * 1. Quá ngắn (< 10 ký tự)
 * 2. Chỉ chứa emoji / ký tự đặc biệt
 * 3. Lặp ký tự bất thường (vd: "aaaaaaa...")
 * 4. Trùng nội dung hoàn toàn với review khác (dedup)
 */
@Slf4j
@Service
public class ReviewFilterService {

    private static final int MIN_LENGTH = 10;
    private static final double MAX_REPEAT_RATIO = 0.7;

    public List<String> filter(List<Review> reviews) {
        List<String> filtered = reviews.stream()
                .map(Review::getContent)
                .filter(this::isValid)
                .distinct()     // loại trùng
                .toList();

        log.debug("[ReviewFilter] {}/{} reviews passed filter", filtered.size(), reviews.size());
        return filtered;
    }

    private boolean isValid(String content) {
        if (content == null) return false;
        String trimmed = content.trim();

        // Quá ngắn
        if (trimmed.length() < MIN_LENGTH) return false;

        // Chỉ có emoji / ký tự đặc biệt (không có chữ cái hoặc số)
        if (!trimmed.matches(".*[\\p{L}\\d].*")) return false;

        // Lặp ký tự bất thường (vd: "hahahaha", "!!!!!!")
        if (hasExcessiveRepeat(trimmed)) return false;

        return true;
    }

    private boolean hasExcessiveRepeat(String text) {
        if (text.length() < 4) return false;
        char first = text.charAt(0);
        long sameCount = text.chars().filter(c -> c == first).count();
        return (double) sameCount / text.length() > MAX_REPEAT_RATIO;
    }
}
