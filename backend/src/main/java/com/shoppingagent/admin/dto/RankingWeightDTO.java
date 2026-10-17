package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RankingWeightDTO {
    private String categoryCode;
    /** Map of criteria name (e.g. spec_match, price, rating) to weight (e.g. 0.50, 0.25, 0.25) */
    private Map<String, Double> weights;
}
