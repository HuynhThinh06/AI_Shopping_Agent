package com.shoppingagent.search.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

/** Một sản phẩm trong danh sách kết quả xếp hạng */
@Data
@Builder
public class RankedProduct {

    private Long productId;
    private String name;
    private String brand;
    private Long price;
    private BigDecimal avgRating;
    private Integer reviewCount;
    private String productUrl;
    private Map<String, Object> specs;

    /** Điểm tổng hợp Weighted Score [0.0 – 1.0] */
    private Double score;

    /** Điểm SpecMatch riêng [0.0 – 1.0] */
    private Double specMatchScore;

    /** Hạng trong danh sách kết quả (1 = tốt nhất) */
    private Integer rankPosition;
}
