package com.shoppingagent.product.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductCreateRequest {
    private String categoryCode;
    private String sku;
    private String name;
    private String brand;
    private Long price;
    private String productUrl;
    private Map<String, Object> specs;
}
