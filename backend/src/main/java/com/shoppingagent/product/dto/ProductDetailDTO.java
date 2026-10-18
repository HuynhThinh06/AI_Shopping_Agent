package com.shoppingagent.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** DTO đầy đủ thông tin sản phẩm cho trang chi tiết */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDetailDTO {
    private Long id;
    private String categoryCode;
    private String sku;
    private String name;
    private String brand;
    private Long price;
    private Integer stockQuantity;
    private Boolean isActive;
    private String productUrl;
    private BigDecimal avgRating;
    private Integer reviewCount;
    private Map<String, Object> specs;
    private List<String> imageUrls;
}
