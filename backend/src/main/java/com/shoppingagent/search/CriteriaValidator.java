package com.shoppingagent.search;

import com.shoppingagent.search.dto.ExtractedCriteria;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Lớp validate và chuẩn hóa các ràng buộc nghiệp vụ trích xuất từ LLM.
 *
 * Kiểm tra các trường hợp:
 * 1. Ngân sách âm hoặc bằng 0 -> reset về null
 * 2. Ngân sách tối thiểu > ngân sách tối đa -> tự động hoán đổi (swap)
 * 3. Đơn vị tiền tệ bị nhầm (ví dụ: LLM trả 15 hoặc 20 thay vì 15.000.000 hoặc 20.000.000) -> nhân 1.000.000
 * 4. Ngân sách vượt trần quá lớn (> 500 triệu) -> giới hạn trần hợp lý
 * 5. Chuẩn hóa requiredSpecs: loại bỏ khoảng trắng thừa, loại bỏ key/value rỗng
 */
@Slf4j
@Component
public class CriteriaValidator {

    private static final long MAX_BUDGET = 500_000_000L; // 500 triệu VNĐ
    private static final long MIN_REALISTIC_PRICE = 100_000L; // Dưới 100k VNĐ coi như LLM tính theo đơn vị triệu

    public ExtractedCriteria validate(ExtractedCriteria criteria) {
        if (criteria == null) {
            return new ExtractedCriteria();
        }

        // 1. Kiểm tra ngân sách <= 0
        if (criteria.getBudgetMax() != null && criteria.getBudgetMax() <= 0) {
            log.warn("[CriteriaValidator] budgetMax <= 0 ({}), resetting to null", criteria.getBudgetMax());
            criteria.setBudgetMax(null);
        }
        if (criteria.getBudgetMin() != null && criteria.getBudgetMin() <= 0) {
            log.warn("[CriteriaValidator] budgetMin <= 0 ({}), resetting to null", criteria.getBudgetMin());
            criteria.setBudgetMin(null);
        }

        // 2. Chuyển đổi nếu LLM trả theo đơn vị "triệu" (nhỏ hơn 100k VNĐ)
        if (criteria.getBudgetMax() != null && criteria.getBudgetMax() < MIN_REALISTIC_PRICE) {
            long corrected = criteria.getBudgetMax() * 1_000_000L;
            log.info("[CriteriaValidator] Detected budgetMax in million units: {} -> {}", criteria.getBudgetMax(), corrected);
            criteria.setBudgetMax(corrected);
        }
        if (criteria.getBudgetMin() != null && criteria.getBudgetMin() < MIN_REALISTIC_PRICE) {
            long corrected = criteria.getBudgetMin() * 1_000_000L;
            log.info("[CriteriaValidator] Detected budgetMin in million units: {} -> {}", criteria.getBudgetMin(), corrected);
            criteria.setBudgetMin(corrected);
        }

        // 3. Hoán đổi nếu budgetMin > budgetMax
        if (criteria.getBudgetMin() != null && criteria.getBudgetMax() != null
                && criteria.getBudgetMin() > criteria.getBudgetMax()) {
            log.warn("[CriteriaValidator] budgetMin ({}) > budgetMax ({}), swapping",
                    criteria.getBudgetMin(), criteria.getBudgetMax());
            Long temp = criteria.getBudgetMin();
            criteria.setBudgetMin(criteria.getBudgetMax());
            criteria.setBudgetMax(temp);
        }

        // 4. Giới hạn trần ngân sách
        if (criteria.getBudgetMax() != null && criteria.getBudgetMax() > MAX_BUDGET) {
            log.warn("[CriteriaValidator] budgetMax exceeds ceiling ({}), capping to {}", criteria.getBudgetMax(), MAX_BUDGET);
            criteria.setBudgetMax(MAX_BUDGET);
        }

        // 5. Chuẩn hóa requiredSpecs
        Map<String, String> rawSpecs = criteria.getRequiredSpecs();
        if (rawSpecs == null) {
            criteria.setRequiredSpecs(new HashMap<>());
        } else {
            Map<String, String> cleanedSpecs = new HashMap<>();
            for (Map.Entry<String, String> entry : rawSpecs.entrySet()) {
                if (entry.getKey() != null && !entry.getKey().isBlank()
                        && entry.getValue() != null && !entry.getValue().isBlank()) {
                    cleanedSpecs.put(entry.getKey().trim().toLowerCase(), entry.getValue().trim());
                }
            }
            criteria.setRequiredSpecs(cleanedSpecs);
        }

        // 6. Chuẩn hóa target
        if (criteria.getTarget() != null) {
            String trimmedTarget = criteria.getTarget().trim();
            criteria.setTarget(trimmedTarget.isBlank() ? null : trimmedTarget.toLowerCase());
        }

        return criteria;
    }
}
