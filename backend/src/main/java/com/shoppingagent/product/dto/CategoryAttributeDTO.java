package com.shoppingagent.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryAttributeDTO {
    private Integer id;
    private String attributeKey;
    private String attributeLabel;
    private String unit;
    private String dataType;
    private Boolean isFilterable;
    private Integer displayOrder;
}
