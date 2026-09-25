package com.shoppingagent.search;

import com.shoppingagent.search.dto.ExtractedCriteria;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
public class CriteriaValidatorService {

    /**
     * Tự động kiểm tra và chuẩn hóa dữ liệu bị lỗi do LLM sinh ra.
     * @param criteria Dữ liệu thô từ LLM
     */
    public void validateAndNormalize(ExtractedCriteria criteria) {
        if (criteria == null) return;

        normalizeBudgets(criteria);
        normalizeSpecs(criteria);
    }

    private void normalizeBudgets(ExtractedCriteria criteria) {
        Long min = criteria.getBudgetMin();
        Long max = criteria.getBudgetMax();

        // LLM đôi khi quên nhân với 1,000,000 khi khách nói "15 củ"
        if (min != null && min > 0 && min <= 1000) {
            criteria.setBudgetMin(min * 1_000_000L);
            log.info("Normalized budgetMin from {} to {}", min, criteria.getBudgetMin());
        }
        if (max != null && max > 0 && max <= 1000) {
            criteria.setBudgetMax(max * 1_000_000L);
            log.info("Normalized budgetMax from {} to {}", max, criteria.getBudgetMax());
        }

        // Cập nhật lại sau khi nhân
        min = criteria.getBudgetMin();
        max = criteria.getBudgetMax();

        // Khách nói "từ 20 đến 10 triệu", LLM gán nhầm Min/Max
        if (min != null && max != null && min > max) {
            criteria.setBudgetMin(max);
            criteria.setBudgetMax(min);
            log.info("Swapped budget Min/Max: {} - {}", max, min);
        }
    }

    private void normalizeSpecs(ExtractedCriteria criteria) {
        if (criteria.getRequiredSpecs() == null) return;

        for (Map.Entry<String, String> entry : criteria.getRequiredSpecs().entrySet()) {
            String val = entry.getValue();
            if (val != null) {
                // Xóa các đơn vị bị dính vào do LLM sinh ra, ví dụ: "16GB" -> "16"
                String cleaned = val.replaceAll("(?i)(GB|TB|mAh|Wh|inch)$", "").trim();
                if (!cleaned.equals(val)) {
                    criteria.getRequiredSpecs().put(entry.getKey(), cleaned);
                    log.info("Normalized spec [{}] from '{}' to '{}'", entry.getKey(), val, cleaned);
                }
            }
        }
    }
}
