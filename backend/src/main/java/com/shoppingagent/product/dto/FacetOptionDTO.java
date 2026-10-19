package com.shoppingagent.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacetOptionDTO {
    private String id;
    private String label;
    private String queryPattern;
    private Long min;
    private Long max;
    private String specKey;
    private String operator;
    private Object value;
    private Integer count;
}
