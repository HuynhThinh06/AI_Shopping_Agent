package com.shoppingagent.product;

import com.shoppingagent.shared.entity.Product;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Custom repository dùng native SQL để tận dụng GIN index trên cột specs (JSONB).
 *
 * Chiến lược lọc 2 tầng:
 *   Tầng 1 (DB — GIN):  jsonb_exists(specs, 'key')
 *                        → PostgreSQL dùng GIN index scan để loại nhanh sản phẩm thiếu spec key.
 *                        Lưu ý: dùng hàm jsonb_exists() thay vì toán tử '?'
 *                        vì ký tự '?' xung đột với JDBC parameter placeholder.
 *
 *   Tầng 2 (DB — Expression):
 *     • Numeric: (specs->>'ram')::numeric >= 16   → so sánh giá trị số
 *     • Text:    LOWER(specs->>'cpu') LIKE '%i7%'  → tìm chuỗi con, case-insensitive
 *
 * Kết quả: giảm đáng kể số sản phẩm load vào Java so với findCandidates() gốc
 * (chỉ lọc category + price). RankingService.computeSpecMatch() vẫn chạy để tính điểm.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class ProductSpecRepository {

    private final EntityManager entityManager;

    /**
     * Lấy sản phẩm ứng viên với lọc specs tại DB level.
     *
     * @param categoryCode  Mã ngành hàng (laptop / phone)
     * @param budgetMin     Giá tối thiểu (null = không giới hạn)
     * @param budgetMax     Giá tối đa (null = không giới hạn)
     * @param requiredSpecs Specs yêu cầu từ LLM, vd: {"ram":"16", "cpu":"i7", "storage":">=512"}
     * @return Danh sách sản phẩm đã lọc sơ bộ tại DB level
     */
    @SuppressWarnings("unchecked")
    public List<Product> findCandidatesWithSpecs(String categoryCode,
                                                  Long budgetMin,
                                                  Long budgetMax,
                                                  Map<String, String> requiredSpecs) {

        StringBuilder sql = new StringBuilder("""
            SELECT p.* FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE c.code = :categoryCode
              AND p.is_active = TRUE
            """);

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("categoryCode", categoryCode);

        if (budgetMin != null) {
            sql.append(" AND p.price >= :budgetMin");
            params.put("budgetMin", budgetMin);
        }
        if (budgetMax != null) {
            sql.append(" AND p.price <= :budgetMax");
            params.put("budgetMax", budgetMax);
        }

        // ── Lọc specs tại DB level ───────────────────────────────────────────
        if (requiredSpecs != null && !requiredSpecs.isEmpty()) {
            int idx = 0;
            for (var entry : requiredSpecs.entrySet()) {
                String specKey = entry.getKey();
                String rawValue = entry.getValue();
                String keyParam = "sk" + idx;
                String valParam = "sv" + idx;

                // Parse operator từ giá trị (mặc định: >=)
                String operator;
                String cleanValue;

                if (rawValue.startsWith(">=")) {
                    operator = ">=";
                    cleanValue = rawValue.substring(2).trim();
                } else if (rawValue.startsWith("<=")) {
                    operator = "<=";
                    cleanValue = rawValue.substring(2).trim();
                } else if (rawValue.startsWith(">")) {
                    operator = ">";
                    cleanValue = rawValue.substring(1).trim();
                } else if (rawValue.startsWith("<")) {
                    operator = "<";
                    cleanValue = rawValue.substring(1).trim();
                } else {
                    operator = ">=";
                    cleanValue = rawValue.trim();
                }

                try {
                    double numericVal = Double.parseDouble(cleanValue);

                    // ── Numeric spec ─────────────────────────────────────────
                    // Tầng 1: jsonb_exists() — GIN index scan (lọc key tồn tại)
                    // Tầng 2: (specs->>'key')::numeric — expression filter (so sánh giá trị)
                    //
                    // Ví dụ sinh ra:
                    //   AND jsonb_exists(p.specs, 'ram')
                    //   AND (p.specs->>'ram')::numeric >= 16
                    sql.append(" AND jsonb_exists(p.specs, :").append(keyParam).append(")")
                       .append(" AND (p.specs->>:").append(keyParam)
                       .append(")::numeric ").append(operator).append(" :").append(valParam);
                    params.put(keyParam, specKey);
                    params.put(valParam, numericVal);

                } catch (NumberFormatException e) {
                    // ── Text spec ────────────────────────────────────────────
                    // Tìm chuỗi con, case-insensitive
                    //
                    // Ví dụ sinh ra:
                    //   AND LOWER(p.specs->>'cpu') LIKE '%i7%'
                    sql.append(" AND LOWER(p.specs->>:").append(keyParam)
                       .append(") LIKE :").append(valParam);
                    params.put(keyParam, specKey);
                    params.put(valParam, "%" + cleanValue.toLowerCase() + "%");
                }
                idx++;
            }
        }

        sql.append(" ORDER BY p.avg_rating DESC NULLS LAST");

        log.debug("[ProductSpecRepo] Native SQL: {}", sql);
        log.debug("[ProductSpecRepo] Params: {}", params);

        Query query = entityManager.createNativeQuery(sql.toString(), Product.class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }
}
