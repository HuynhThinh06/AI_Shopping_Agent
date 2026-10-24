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
        validateAndNormalize(criteria, null);
    }

    /**
     * Tự động kiểm tra và chuẩn hóa dữ liệu từ LLM kết hợp câu truy vấn gốc.
     * @param criteria Dữ liệu thô từ LLM
     * @param queryText Câu truy vấn gốc của người dùng
     */
    public void validateAndNormalize(ExtractedCriteria criteria, String queryText) {
        if (criteria == null) return;

        normalizeBrand(criteria, queryText);
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

    private static final java.util.Set<String> NUMERIC_SPEC_KEYS = java.util.Set.of(
            "ram", "storage", "battery", "weight", "screen_size", "refresh_rate"
    );

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
                // Xóa các đơn vị bị dính vào do LLM sinh ra, ví dụ: "16GB" -> "16", "120Hz" -> "120"
                String cleanVal = val.trim().replaceAll("(?i)\\s*(GB|TB|mAh|Wh|inch|Hz|kg)$", "").trim();

                // Kiểm tra thuộc tính định lượng số học: nếu không parse được thành số thì loại bỏ để tránh hỏng query SQL
                if (NUMERIC_SPEC_KEYS.contains(cleanKey)) {
                    String testNum = cleanVal.replaceAll("^(>=|<=|>|<)\\s*", "").trim();
                    try {
                        Double.parseDouble(testNum);
                        cleanedSpecs.put(cleanKey, cleanVal);
                        if (!cleanVal.equals(val)) {
                            log.info("Normalized numeric spec [{}] from '{}' to '{}'", cleanKey, val, cleanVal);
                        }
                    } catch (NumberFormatException e) {
                        log.warn("Discarded invalid non-numeric spec for numeric key [{}]: '{}' (raw: '{}')", cleanKey, cleanVal, val);
                    }
                } else {
                    cleanedSpecs.put(cleanKey, cleanVal);
                    if (!cleanVal.equals(val)) {
                        log.info("Normalized spec [{}] from '{}' to '{}'", cleanKey, val, cleanVal);
                    }
                }
            }
        }

        // Điều chỉnh thông số Pin thực tế:
        // MacBook dùng chip Apple Silicon (ARM) tiêu thụ điện năng cực thấp, 35-50Wh đã chạy được 15-18 tiếng thực tế ("dùng cả ngày").
        // Nếu LLM gán pin >= 60Wh (chuẩn của laptop Windows x86) cho MacBook, ta chuẩn hóa về >= 35Wh để không loại nhầm MacBook Neo/Air.
        boolean isMacBook = "MacBook".equalsIgnoreCase(criteria.getBrand()) 
                || "Apple".equalsIgnoreCase(criteria.getBrand())
                || ("laptop".equalsIgnoreCase(criteria.getCategoryCode()) && criteria.getBrand() != null && criteria.getBrand().toLowerCase().contains("mac"));
        
        if (isMacBook && cleanedSpecs.containsKey("battery")) {
            String bVal = cleanedSpecs.get("battery");
            String numStr = bVal.replaceAll("^(>=|<=|>|<)\\s*", "").trim();
            try {
                double valNum = Double.parseDouble(numStr);
                if (valNum >= 45.0) {
                    cleanedSpecs.put("battery", ">=35");
                    log.info("Adjusted battery spec for MacBook from '{}' to '>=35' Wh (ARM energy efficiency)", bVal);
                }
            } catch (NumberFormatException ignored) {}
        }

        criteria.setRequiredSpecs(cleanedSpecs);
    }

    private void normalizeBrand(ExtractedCriteria criteria, String queryText) {
        String b = criteria.getBrand();
        String q = queryText != null ? queryText.toLowerCase() : "";

        // 1. Fallback trích xuất thương hiệu từ queryText nếu LLM chưa trích xuất được
        if (b == null || b.isBlank()) {
            if (q.contains("macbook") || q.contains("apple") || q.contains("mac book") || q.contains("mac m")) {
                b = "laptop".equalsIgnoreCase(criteria.getCategoryCode()) ? "MacBook" : "Apple";
            } else if (q.contains("iphone")) {
                b = "iPhone";
            } else if (q.contains("asus") || q.contains("vivobook") || q.contains("zenbook") || q.contains("rog")) {
                b = "Asus";
            } else if (q.contains("dell") || q.contains("xps") || q.contains("inspiron") || q.contains("vostro")) {
                b = "Dell";
            } else if (q.contains("hp") || q.contains("pavilion") || q.contains("envy") || q.contains("spectre")) {
                b = "HP";
            } else if (q.contains("lenovo") || q.contains("thinkpad") || q.contains("ideapad") || q.contains("legion")) {
                b = "Lenovo";
            } else if (q.contains("acer") || q.contains("aspire") || q.contains("predator") || q.contains("nitro")) {
                b = "Acer";
            } else if (q.contains("msi")) {
                b = "MSI";
            } else if (q.contains("samsung") || q.contains("galaxy")) {
                b = "Samsung";
            } else if (q.contains("xiaomi") || q.contains("redmi")) {
                b = "Xiaomi";
            } else if (q.contains("oppo")) {
                b = "OPPO";
            } else if (q.contains("vivo")) {
                b = "Vivo";
            } else if (q.contains("realme")) {
                b = "realme";
            }
        }

        // 2. Chuẩn hóa tên thương hiệu đồng bộ với DB
        if (b != null && !b.isBlank()) {
            String clean = b.trim();
            if (clean.equalsIgnoreCase("apple") || clean.equalsIgnoreCase("mac") || clean.equalsIgnoreCase("macbook")) {
                if ("laptop".equalsIgnoreCase(criteria.getCategoryCode())) {
                    clean = "MacBook";
                } else if ("phone".equalsIgnoreCase(criteria.getCategoryCode())) {
                    clean = "iPhone";
                }
            } else if (clean.equalsIgnoreCase("thinkpad") || clean.equalsIgnoreCase("ideapad") || clean.equalsIgnoreCase("legion")) {
                clean = "Lenovo";
            } else if (clean.equalsIgnoreCase("vivobook") || clean.equalsIgnoreCase("zenbook") || clean.equalsIgnoreCase("rog")) {
                clean = "Asus";
            } else if (clean.equalsIgnoreCase("redmi")) {
                clean = "Xiaomi";
            }
            criteria.setBrand(clean);
            log.info("Normalized brand: '{}'", clean);
        }
    }

    private void normalizeTarget(ExtractedCriteria criteria) {
        if (criteria.getTarget() != null) {
            String target = criteria.getTarget().trim().toLowerCase();
            criteria.setTarget(target.isBlank() ? null : target);
        }
    }
}
