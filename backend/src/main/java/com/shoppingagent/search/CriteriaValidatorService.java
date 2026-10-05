package com.shoppingagent.search;

import com.shoppingagent.search.dto.ExtractedCriteria;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class CriteriaValidatorService {

    private static final long MAX_BUDGET = 500_000_000L; // 500 triệu VNĐ

    /**
     * Tự động kiểm tra và chuẩn hóa dữ liệu bị lỗi do LLM sinh ra.
     * @param criteria Dữ liệu thô từ LLM
     */
    public void validateAndNormalize(ExtractedCriteria criteria) {
        if (criteria == null) return;

        normalizeBudgets(criteria);
        normalizeSpecs(criteria);
        normalizeTarget(criteria);
        normalizeWeights(criteria);
    }

    private void normalizeWeights(ExtractedCriteria criteria) {
        Double p = criteria.getWeightPrice();
        Double r = criteria.getWeightRating();
        Double s = criteria.getWeightSpec();

        if (p == null) p = 0.35;
        if (r == null) r = 0.20;
        if (s == null) s = 0.45;

        double sum = p + r + s;
        if (sum > 0 && Math.abs(sum - 1.0) > 0.001) {
            criteria.setWeightPrice(Math.round((p / sum) * 100.0) / 100.0);
            criteria.setWeightRating(Math.round((r / sum) * 100.0) / 100.0);
            criteria.setWeightSpec(Math.round((s / sum) * 100.0) / 100.0);
            log.info("Normalized weights to sum 1.0: price={}, rating={}, spec={}", 
                criteria.getWeightPrice(), criteria.getWeightRating(), criteria.getWeightSpec());
        } else if (sum == 0) {
            criteria.setWeightPrice(0.35);
            criteria.setWeightRating(0.20);
            criteria.setWeightSpec(0.45);
        }
    }

    private void normalizeBudgets(ExtractedCriteria criteria) {
        Long min = criteria.getBudgetMin();
        Long max = criteria.getBudgetMax();

        // 1. Reset ngân sách <= 0 về null
        if (min != null && min <= 0) {
            criteria.setBudgetMin(null);
            min = null;
        }
        if (max != null && max <= 0) {
            criteria.setBudgetMax(null);
            max = null;
        }

        // 2. LLM đôi khi quên nhân với 1,000,000 khi khách nói "15 củ" hoặc trả số <= 1000 (hoặc < 100_000)
        if (min != null && min > 0 && min < 100_000L) {
            criteria.setBudgetMin(min * 1_000_000L);
            log.info("Normalized budgetMin from {} to {}", min, criteria.getBudgetMin());
        }
        if (max != null && max > 0 && max < 100_000L) {
            criteria.setBudgetMax(max * 1_000_000L);
            log.info("Normalized budgetMax from {} to {}", max, criteria.getBudgetMax());
        }

        // Cập nhật lại sau khi nhân
        min = criteria.getBudgetMin();
        max = criteria.getBudgetMax();

        // 3. Khách nói "từ 20 đến 10 triệu", LLM gán nhầm Min/Max -> tự động hoán đổi
        if (min != null && max != null && min > max) {
            criteria.setBudgetMin(max);
            criteria.setBudgetMax(min);
            log.info("Swapped budget Min/Max: {} - {}", max, min);
            min = criteria.getBudgetMin();
            max = criteria.getBudgetMax();
        }

        // 4. Giới hạn trần ngân sách hợp lý
        if (max != null && max > MAX_BUDGET) {
            criteria.setBudgetMax(MAX_BUDGET);
            log.info("Capped budgetMax from {} to {}", max, MAX_BUDGET);
        }
    }

    private void normalizeSpecs(ExtractedCriteria criteria) {
        if (criteria.getRequiredSpecs() == null) {
            criteria.setRequiredSpecs(new HashMap<>());
            return;
        }

        Map<String, String> cleanedSpecs = new HashMap<>();
        for (Map.Entry<String, String> entry : criteria.getRequiredSpecs().entrySet()) {
            String key = entry.getKey();
            String val = entry.getValue();

            if (key != null && !key.isBlank() && val != null && !val.isBlank()) {
                String cleanKey = key.trim().toLowerCase();
                // Xóa các đơn vị bị dính vào do LLM sinh ra, ví dụ: "16GB" -> "16"
                String cleanVal = val.trim().replaceAll("(?i)\\s*(GB|TB|mAh|Wh|inch)$", "").trim();
                cleanedSpecs.put(cleanKey, cleanVal);

                if (!cleanVal.equals(val)) {
                    log.info("Normalized spec [{}] from '{}' to '{}'", cleanKey, val, cleanVal);
                }
            }
        }
        criteria.setRequiredSpecs(cleanedSpecs);
    }

    private void normalizeTarget(ExtractedCriteria criteria) {
        if (criteria.getTarget() != null) {
            String target = criteria.getTarget().trim().toLowerCase();
            criteria.setTarget(target.isBlank() ? null : target);
        }
    }
}
