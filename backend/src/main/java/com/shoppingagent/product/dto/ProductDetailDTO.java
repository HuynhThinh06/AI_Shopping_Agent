package com.shoppingagent.product.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

/** DTO đầy đủ thông tin sản phẩm cho trang chi tiết */
@Data
@Builder
public class ProductDetailDTO {
    private Long id;
    private String categoryCode;
    private String sku;
    private String name;
    private String brand;
    private Long price;
    private String productUrl;
    private BigDecimal avgRating;
    private Integer reviewCount;
    private Map<String, Object> specs;
    private java.util.List<String> imageUrls;
}
