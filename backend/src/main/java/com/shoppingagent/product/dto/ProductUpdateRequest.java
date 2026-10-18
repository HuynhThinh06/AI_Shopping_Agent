package com.shoppingagent.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductUpdateRequest {
    private String categoryCode;
    private String sku;
    private String name;
    private String brand;
    private Long price;
    private Integer stockQuantity;
    private String productUrl;
    private Map<String, Object> specs;
    private List<String> imageUrls;
    private Boolean isActive;
}
