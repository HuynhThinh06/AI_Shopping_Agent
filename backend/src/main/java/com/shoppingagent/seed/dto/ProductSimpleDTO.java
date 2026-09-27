package com.shoppingagent.seed.dto;

import lombok.Data;

@Data
public class ProductSimpleDTO {
    private Long id;
    private String productUrl;

    public ProductSimpleDTO(Long id, String productUrl) {
        this.id = id;
        this.productUrl = productUrl;
    }
}
