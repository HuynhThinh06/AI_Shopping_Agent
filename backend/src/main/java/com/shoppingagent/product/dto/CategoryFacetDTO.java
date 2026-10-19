package com.shoppingagent.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryFacetDTO {
    private String groupKey;
    private String groupLabel;
    private String filterType;
    private List<FacetOptionDTO> options;
}
