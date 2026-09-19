package com.shoppingagent.seed.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data
public class ProductSeedRequest {
    private String categoryCode; // LAPTOP or PHONE
    private String sku;
    private String name;
    private String brand;
    private Long price;
    private String productUrl;
    private BigDecimal avgRating;
    private Integer reviewCount;
    private Map<String, Object> specs;
}
